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
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { LiveSession } from '../types/liveSession';
import SessionCard from '../components/live-sessions/SessionCard';
import { SystemTypography as Typography } from '../constants/Typography';
import RequestRoomBanner from '../components/RequestRoomBanner';
import RadioLabCard from '../components/RadioLabCard';

const TIP_BASE_URL = 'https://soundbridge.live/tip';

interface TipStats {
  todayAmount: number;
  todayCount: number;
  weekAmount: number;
  weekCount: number;
  monthAmount: number;
  monthCount: number;
}

export default function LiveSessionsScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const isAdmin = userProfile?.is_admin === true;
  const isCreator = userProfile?.role === 'creator';

  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'tip_room'>('live');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tipStats, setTipStats] = useState<TipStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const sessionsSubscriptionRef = useRef<any>(null);

  const tipRoomUrl = userProfile?.username
    ? `${TIP_BASE_URL}/${userProfile.username}`
    : null;

  // ── Sessions ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadSessions();
    subscribeToSessionChanges();
    return () => {
      if (sessionsSubscriptionRef.current) {
        supabase.removeChannel(sessionsSubscriptionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'tip_room' && user?.id && isCreator) {
      loadTipStats();
    }
  }, [activeTab, user?.id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { success: liveSuccess, data: liveData } = await dbHelpers.getLiveSessions();
      if (liveSuccess && liveData) setLiveSessions(liveData);
      const { success: upcomingSuccess, data: upcomingData } = await dbHelpers.getUpcomingSessions(20);
      if (upcomingSuccess && upcomingData) setUpcomingSessions(upcomingData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTipStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data } = await supabase
        .from('tip_room_tips')
        .select('amount, tipped_at')
        .eq('creator_id', user.id);

      const rows = data ?? [];
      const sumAndCount = (after: string) => {
        const filtered = rows.filter(r => r.tipped_at >= after);
        return {
          amount: filtered.reduce((s, r) => s + Number(r.amount), 0),
          count: filtered.length,
        };
      };

      const today = sumAndCount(todayStart);
      const week = sumAndCount(weekStart);
      const month = sumAndCount(monthStart);

      setTipStats({
        todayAmount: today.amount, todayCount: today.count,
        weekAmount: week.amount,  weekCount: week.count,
        monthAmount: month.amount, monthCount: month.count,
      });
    } catch (err) {
      console.error('Tip stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'tip_room') {
      loadTipStats().finally(() => setRefreshing(false));
    } else {
      loadSessions();
    }
  }, [activeTab]);

  const subscribeToSessionChanges = () => {
    sessionsSubscriptionRef.current = supabase
      .channel('live_sessions_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, (payload) => {
        if (payload.eventType === 'DELETE' && payload.old) {
          setLiveSessions(prev => prev.filter(s => s.id !== payload.old.id));
          setUpcomingSessions(prev => prev.filter(s => s.id !== payload.old.id));
          return;
        }
        if (payload.new && payload.new.status === 'ended') {
          setLiveSessions(prev => prev.filter(s => s.id !== payload.new.id));
          return;
        }
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') loadSessions();
      })
      .subscribe();
  };

  const handleAdminEnd = (session: LiveSession) => {
    Alert.alert('End Session', `End "${session.title}" by @${session.creator?.username || 'unknown'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Session', style: 'destructive', onPress: async () => {
        const { success, error } = await dbHelpers.adminEndLiveSession(session.id);
        if (!success) Alert.alert('Error', 'Could not end the session. Check your admin permissions.');
      }},
    ]);
  };

  const handleSessionPress = (session: LiveSession) => {
    if (session.status === 'live') {
      navigation.navigate('LiveSessionRoom', { sessionId: session.id, session });
    } else {
      Alert.alert('Session Scheduled', 'This session is not live yet. We will add reminders and details soon.', [{ text: 'OK' }]);
    }
  };

  const handleShareTipRoom = async () => {
    if (!tipRoomUrl) return;
    try {
      await Share.share({
        message: `Support me on SoundBridge — ${tipRoomUrl}`,
        url: tipRoomUrl,
      });
    } catch {}
  };

  const formatCurrency = (amount: number) =>
    `£${amount.toFixed(2)}`;

  // ── Render ──────────────────────────────────────────────────────────────────

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
        <Ionicons name={isLiveTab ? 'radio-outline' : 'calendar-outline'} size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
          {isLiveTab ? 'No Live Sessions' : 'No Upcoming Sessions'}
        </Text>
        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
          {isLiveTab
            ? 'There are no live audio sessions right now. Check back later or see upcoming sessions.'
            : 'There are no scheduled sessions at the moment. Check back later for new events.'}
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
              : `${upcomingSessions.length} scheduled ${upcomingSessions.length === 1 ? 'session' : 'sessions'}`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderTipRoom = () => {
    if (!user?.id) {
      return (
        <View style={styles.tipRoomEmpty}>
          <Ionicons name="heart-outline" size={52} color={theme.colors.textSecondary} />
          <Text style={[styles.tipRoomEmptyTitle, { color: theme.colors.text }]}>Sign in to use Tip Room</Text>
        </View>
      );
    }

    if (!isCreator) {
      return (
        <View style={styles.tipRoomEmpty}>
          <Ionicons name="heart-outline" size={52} color={theme.colors.textSecondary} />
          <Text style={[styles.tipRoomEmptyTitle, { color: theme.colors.text }]}>Tip Room is for creators</Text>
          <Text style={[styles.tipRoomEmptySub, { color: theme.colors.textSecondary }]}>
            Upgrade to a creator account to get your own Tip Room QR code.
          </Text>
          <TouchableOpacity
            style={[styles.tipRoomCTA, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('BecomeCreator')}
            activeOpacity={0.85}
          >
            <Text style={styles.tipRoomCTAText}>Become a Creator</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.tipRoomScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Headline */}
        <Text style={[styles.tipRoomHeadline, { color: theme.colors.text }]}>Your Tip Room</Text>
        <Text style={[styles.tipRoomSubtext, { color: theme.colors.textSecondary }]}>
          Show this QR code anywhere you want instant, frictionless support — merch tables, flyers, casual meetups — no profile, no app required to give.
        </Text>

        {/* QR code card */}
        <View style={[styles.qrCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {tipRoomUrl ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode
                  value={tipRoomUrl}
                  size={220}
                  backgroundColor="#ffffff"
                  color="#111111"
                  logo={require('../../assets/images/logos/logo-trans-lockup.png')}
                  logoSize={44}
                  logoBackgroundColor="#ffffff"
                  logoBorderRadius={4}
                  logoMargin={3}
                />
              </View>
              <Text style={[styles.qrUrl, { color: theme.colors.textSecondary }]} numberOfLines={1}>{tipRoomUrl}</Text>
            </>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.tipRoomEmptySub, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                Set a username in your profile to generate your Tip Room link.
              </Text>
            </View>
          )}
        </View>

        {/* Share button */}
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleShareTipRoom}
          disabled={!tipRoomUrl}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Share Tip Room Link</Text>
        </TouchableOpacity>

        {/* Stats */}
        <Text style={[styles.statsHeading, { color: theme.colors.text }]}>Tips received</Text>
        {loadingStats ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.statsRow}>
            {[
              { label: 'Today', amount: tipStats?.todayAmount ?? 0, count: tipStats?.todayCount ?? 0 },
              { label: 'This week', amount: tipStats?.weekAmount ?? 0, count: tipStats?.weekCount ?? 0 },
              { label: 'This month', amount: tipStats?.monthAmount ?? 0, count: tipStats?.monthCount ?? 0 },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.statAmount, { color: theme.colors.primary }]}>{formatCurrency(s.amount)}</Text>
                <Text style={[styles.statCount, { color: theme.colors.textSecondary }]}>{s.count} {s.count === 1 ? 'tip' : 'tips'}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.tipRoomNote, { color: theme.colors.textSecondary }]}>
          Supporters scan this code and pay directly — no SoundBridge account required. Tips go to your wallet after platform fees.
        </Text>
      </ScrollView>
    );
  };

  const currentSessions = activeTab === 'live' ? liveSessions : upcomingSessions;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={isDark ? 'rgba(255,255,255,0.8)' : theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Live<Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : theme.colors.textSecondary, fontWeight: '300' }}> Sessions</Text>
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Audio rooms & broadcasts
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateLiveSession')}>
              <LinearGradient colors={['#DC2626', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createButtonGradient}>
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : theme.colors.border }]}>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('live')}>
            <Text style={[styles.tabText, activeTab === 'live' ? { color: theme.colors.text, fontWeight: '500' } : { color: isDark ? 'rgba(255,255,255,0.28)' : theme.colors.textSecondary }]}>
              Live Now
            </Text>
            {activeTab === 'live' && <View style={styles.tabDot} />}
            {liveSessions.length > 0 && activeTab !== 'live' && (
              <View style={styles.badge}><Text style={styles.badgeText}>{liveSessions.length}</Text></View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('upcoming')}>
            <Text style={[styles.tabText, activeTab === 'upcoming' ? { color: theme.colors.text, fontWeight: '500' } : { color: isDark ? 'rgba(255,255,255,0.28)' : theme.colors.textSecondary }]}>
              Upcoming
            </Text>
            {activeTab === 'upcoming' && <View style={styles.tabDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('tip_room')}>
            <Text style={[styles.tabText, activeTab === 'tip_room' ? { color: theme.colors.text, fontWeight: '500' } : { color: isDark ? 'rgba(255,255,255,0.28)' : theme.colors.textSecondary }]}>
              Tip Room
            </Text>
            {activeTab === 'tip_room' && <View style={[styles.tabDot, { backgroundColor: '#10B981' }]} />}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'tip_room' ? (
          renderTipRoom()
        ) : (
          <FlatList
            data={currentSessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            contentContainerStyle={styles.sessionsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
            }
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={!loading ? renderEmptyState : null}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 34, fontWeight: '300', letterSpacing: -0.8, lineHeight: 40, marginBottom: 2 },
  headerSubtitle: { ...Typography.label, fontSize: 13 },
  headerButton: { padding: 8 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createButton: { borderRadius: 999, overflow: 'hidden' },
  createButtonGradient: { paddingHorizontal: 14, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' },

  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 4, gap: 4, borderBottomWidth: 1,
  },
  tab: { paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', gap: 4 },
  tabText: { fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626' },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 4,
  },
  badgeText: { color: '#FFFFFF', ...Typography.label, fontSize: 10 },

  sessionsList: { paddingVertical: 8, flexGrow: 1 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { ...Typography.headerMedium, fontSize: 18, marginBottom: 4 },
  sectionSubtitle: { ...Typography.label, fontSize: 13 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  emptyStateTitle: { ...Typography.headerMedium, fontSize: 20, marginTop: 16, marginBottom: 8 },
  emptyStateText: { ...Typography.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Tip Room ──
  tipRoomScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  tipRoomHeadline: {
    fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginBottom: 10,
    fontFamily: Typography.body.fontFamily,
  },
  tipRoomSubtext: {
    fontSize: 14, lineHeight: 21, marginBottom: 28,
    fontFamily: Typography.body.fontFamily,
  },
  qrCard: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: 'center', marginBottom: 16,
  },
  qrWrap: {
    padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
  },
  qrUrl: {
    fontSize: 12, fontFamily: Typography.body.fontFamily, maxWidth: 260, textAlign: 'center',
  },
  qrPlaceholder: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 28, paddingVertical: 15, marginBottom: 36,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  statsHeading: {
    fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 14,
    fontFamily: Typography.body.fontFamily,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4,
  },
  statAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.8, fontFamily: Typography.body.fontFamily },
  statCount: { fontSize: 12, fontFamily: Typography.body.fontFamily },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: Typography.body.fontFamily },
  tipRoomNote: {
    fontSize: 13, lineHeight: 19, textAlign: 'center', fontFamily: Typography.body.fontFamily,
  },

  // Non-creator states
  tipRoomEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  tipRoomEmptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', fontFamily: Typography.body.fontFamily },
  tipRoomEmptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontFamily: Typography.body.fontFamily },
  tipRoomCTA: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, marginTop: 8 },
  tipRoomCTAText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: Typography.body.fontFamily },
});
