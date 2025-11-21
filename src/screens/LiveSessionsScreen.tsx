/**
 * Live Sessions Screen
 * Discovery interface for live and upcoming audio sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers } from '../lib/supabase';
import { LiveSession } from '../types/liveSession';
import SessionCard from '../components/live-sessions/SessionCard';

export default function LiveSessionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming'>('live');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
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

  const handleSessionPress = (session: LiveSession) => {
    if (session.status === 'live') {
      // Navigate to LiveSessionRoomScreen
      navigation.navigate('LiveSessionRoom', {
        sessionId: session.id,
        session: session,
      });
    } else {
      // Show session details or set reminder
      console.log('Scheduled session:', session.id);
    }
  };

  const renderSessionItem = ({ item }: { item: LiveSession }) => (
    <SessionCard
      session={item}
      onPress={() => handleSessionPress(item)}
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
          ListHeaderComponent={currentSessions.length > 0 ? renderHeader : null}
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
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
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 11,
    fontWeight: 'bold',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
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
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

