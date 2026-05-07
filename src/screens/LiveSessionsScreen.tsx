/**
 * Live Sessions Screen
 * Discovery interface for live and upcoming audio sessions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { LiveSession } from '../types/liveSession';
import SessionCard from '../components/live-sessions/SessionCard';
import { SystemTypography as Typography } from '../constants/Typography';
import RequestRoomBanner from '../components/RequestRoomBanner';
import RadioLabCard from '../components/RadioLabCard';

export default function LiveSessionsScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const isAdmin = userProfile?.is_admin === true;

  const [activeTab, setActiveTab] = useState<'live' | 'upcoming'>('live');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ref for real-time subscription
  const sessionsSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    loadSessions();
    subscribeToSessionChanges();

    return () => {
      // Cleanup subscription on unmount
      if (sessionsSubscriptionRef.current) {
        supabase.removeChannel(sessionsSubscriptionRef.current);
      }
    };
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      // Load live sessions
      const { success: liveSuccess, data: liveData } = await dbHelpers.getLiveSessions();
      if (liveSuccess && liveData) {
        setLiveSessions(liveData);
      }
      
      // Load upcoming sessions
      const { success: upcomingSuccess, data: upcomingData } = await dbHelpers.getUpcomingSessions(20);
      if (upcomingSuccess && upcomingData) {
        setUpcomingSessions(upcomingData);
      }
      
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, []);

  const subscribeToSessionChanges = () => {
    console.log('📡 [LiveSessionsScreen] Subscribing to live session status changes');

    // Subscribe to all live_sessions table changes
    sessionsSubscriptionRef.current = supabase
      .channel('live_sessions_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
        },
        (payload) => {
          console.log('📡 [LiveSessionsScreen] Session change:', payload);

          if (payload.eventType === 'DELETE' && payload.old) {
            setLiveSessions(prev => prev.filter(session => session.id !== payload.old.id));
            setUpcomingSessions(prev => prev.filter(session => session.id !== payload.old.id));
            return;
          }

          // When a session status changes to 'ended', remove it from liveSessions
          if (payload.new && payload.new.status === 'ended') {
            setLiveSessions(prev => prev.filter(session => session.id !== payload.new.id));
            console.log('✅ [LiveSessionsScreen] Removed ended session from list:', payload.new.id);
            return;
          }

          // For inserts/updates (new live or scheduled sessions), reload to get joined data
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadSessions();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [LiveSessionsScreen] Subscription status:', status);
      });
  };

  const handleAdminEnd = (session: LiveSession) => {
    Alert.alert(
      'End Session',
      `End "${session.title}" by @${session.creator?.username || 'unknown'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await dbHelpers.adminEndLiveSession(session.id);
            if (!success) {
              Alert.alert('Error', 'Could not end the session. Check your admin permissions.');
              console.error('Admin end session error:', error);
            }
            // Real-time subscription will remove it from the list automatically
          },
        },
      ]
    );
  };

  const handleSessionPress = (session: LiveSession) => {
    if (session.status === 'live') {
      // Navigate to LiveSessionRoomScreen
      navigation.navigate('LiveSessionRoom', {
        sessionId: session.id,
        session: session,
      });
    } else {
      Alert.alert(
        'Session Scheduled',
        'This session is not live yet. We will add reminders and details soon.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderSessionItem = ({ item }: { item: LiveSession }) => (
    <SessionCard
      session={item}
      onPress={() => handleSessionPress(item)}
      currentUserId={user?.id}
      isAdmin={isAdmin}
      onAdminEnd={handleAdminEnd}
    />
  );

  const renderEmptyState = () => {
    const isLiveTab = activeTab === 'live';
    
    return (
      <View style={styles.emptyState}>
        <Ionicons 
          name={isLiveTab ? 'radio-outline' : 'calendar-outline'} 
          size={64} 
          color={theme.colors.textSecondary} 
        />
        <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
          {isLiveTab ? 'No Live Sessions' : 'No Upcoming Sessions'}
        </Text>
        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
          {isLiveTab 
            ? 'There are no live audio sessions right now. Check back later or see upcoming sessions.'
            : 'There are no scheduled sessions at the moment. Check back later for new events.'
          }
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <RadioLabCard />
      <RequestRoomBanner />
      {currentSessions.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {activeTab === 'live' ? '🔴 Live Now' : '📅 Coming Up'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            {activeTab === 'live'
              ? `${liveSessions.length} active ${liveSessions.length === 1 ? 'session' : 'sessions'}`
              : `${upcomingSessions.length} scheduled ${upcomingSessions.length === 1 ? 'session' : 'sessions'}`
            }
          </Text>
        </View>
      )}
    </View>
  );

  const currentSessions = activeTab === 'live' ? liveSessions : upcomingSessions;

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Live Sessions</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Audio rooms & broadcasts
            </Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateLiveSession')}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'live' && { backgroundColor: theme.colors.primary + '20' }
            ]}
            onPress={() => setActiveTab('live')}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="radio" 
                size={16} 
                color={activeTab === 'live' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.textSecondary },
                  activeTab === 'live' && { color: theme.colors.primary, fontWeight: 'bold' }
                ]}
              >
                Live Now
              </Text>
              {liveSessions.length > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.badgeText}>{liveSessions.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && { backgroundColor: theme.colors.primary + '20' }
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="calendar" 
                size={16} 
                color={activeTab === 'upcoming' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.textSecondary },
                  activeTab === 'upcoming' && { color: theme.colors.primary, fontWeight: 'bold' }
                ]}
              >
                Upcoming
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        <FlatList
          data={currentSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.sessionsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmptyState : null}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.label,
    fontSize: 13,
  },
  headerButton: {
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    ...Typography.button,
    fontSize: 14,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    ...Typography.label,
    fontSize: 11,
  },
  sessionsList: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.label,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    ...Typography.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

