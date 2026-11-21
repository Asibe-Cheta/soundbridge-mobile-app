/**
 * Live Sessions Screen
 * Discovery interface for live and upcoming audio sessions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
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
import * as MediaLibrary from 'expo-media-library';
import * as ExpoSharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { LiveSession } from '../types/liveSession';
import SessionCard from '../components/live-sessions/SessionCard';
import { SystemTypography as Typography } from '../constants/Typography';
import RequestRoomBanner from '../components/RequestRoomBanner';
import RadioLabCard from '../components/RadioLabCard';
import { isCreator as hasCreatorAccess } from '../utils/roles';

const TIP_BASE_URL = 'https://soundbridge.live/tip';

// Same defensive lazy-require as ShareMyCardModal.tsx, in case the native
// module isn't linked in some build.
let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

const EXPORT_CARD_WIDTH = 320;
const EXPORT_QR_SIZE = 220;
// Points at 72pt/inch — standard page sizes for the PDF export.
const PDF_PAGE_SIZES: Record<'A6' | 'A4', { width: number; height: number }> = {
  A6: { width: 298, height: 420 },
  A4: { width: 595, height: 842 },
};

interface TipStats {
  todayAmount: number;
  todayCount: number;
  weekAmount: number;
  weekCount: number;
  monthAmount: number;
  monthCount: number;
}

export default function LiveSessionsScreen({ navigation }: any) {
  const route = useRoute<any>();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const isAdmin = userProfile?.is_admin === true;
  const isCreator = hasCreatorAccess(userProfile);

  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'tip_room'>(
    route.params?.initialTab ?? 'live'
  );
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tipStats, setTipStats] = useState<TipStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const exportCardRef = useRef<View>(null);

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

  // Captures the hidden white export card (QR + artist name, not the
  // themed on-screen card) as a PNG, writes it to a named cache file, and
  // returns both the file uri and the raw base64 (base64 needed to embed
  // inline in the PDF's HTML).
  const captureExportCard = async (): Promise<{ uri: string; base64: string } | null> => {
    if (!captureRef) {
      Alert.alert('App update required', 'QR image export needs a newer version of the app.');
      return null;
    }
    if (!exportCardRef.current) return null;
    try {
      const base64 = await captureRef(exportCardRef.current, {
        format: 'png',
        quality: 1,
        result: 'base64',
        pixelRatio: 4, // 320pt * 4 = 1280px, clears the 1200px minimum
      });
      const uri = `${FileSystem.cacheDirectory}sb-tiproom-qr-${userProfile?.username ?? 'me'}.png`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return { uri, base64 };
    } catch (err) {
      console.error('[TipRoom] captureExportCard error:', err);
      return null;
    }
  };

  const handleSaveQrImage = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to save your Tip Room QR code.');
        return;
      }
      const result = await captureExportCard();
      if (!result) {
        Alert.alert('Error', 'Could not create the QR image. Please try again.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(result.uri);
      Alert.alert('Saved', 'Your Tip Room QR code has been saved to your photos.');
    } catch {
      Alert.alert('Error', 'Could not save the QR image. Please try again.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleShareQrImage = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const result = await captureExportCard();
      if (!result) {
        Alert.alert('Error', 'Could not create the QR image. Please try again.');
        return;
      }
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(result.uri, { mimeType: 'image/png', dialogTitle: 'Share Tip Room QR' });
      } else {
        await Share.share({ url: result.uri });
      }
    } catch {
      Alert.alert('Error', 'Could not share the QR image. Please try again.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleSharePdf = (size: 'A6' | 'A4') => async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const result = await captureExportCard();
      if (!result) {
        Alert.alert('Error', 'Could not create the QR PDF. Please try again.');
        return;
      }
      const { width, height } = PDF_PAGE_SIZES[size];
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>
          @page { size: ${width}pt ${height}pt; margin: 0; }
          body { margin: 0; width: ${width}pt; height: ${height}pt; display: flex; align-items: center; justify-content: center; background: #ffffff; }
          img { width: ${Math.round(width * 0.7)}pt; height: auto; }
        </style>
      </head><body>
        <img src="data:image/png;base64,${result.base64}" />
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, width, height, base64: false });
      const dest = `${FileSystem.cacheDirectory}sb-tiproom-qr-${size}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: `Share Tip Room QR (${size})`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Sharing not available', 'Your device does not support file sharing.');
      }
    } catch (err) {
      console.error('[TipRoom] handleSharePdf error:', err);
      Alert.alert('Error', 'Could not create the QR PDF. Please try again.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleSharePdfPrompt = () => {
    Alert.alert('Share as PDF', 'Choose a page size.', [
      { text: 'A6 (small card)', onPress: handleSharePdf('A6') },
      { text: 'A4 (full page)', onPress: handleSharePdf('A4') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
          <Text style={[styles.tipRoomEmptyTitle, { color: theme.colors.text }]}>Your own Tip Room is for creators</Text>
          <Text style={[styles.tipRoomEmptySub, { color: theme.colors.textSecondary }]}>
            This QR code page is for creators to receive tips. You can already tip any creator directly from their profile or posts.
          </Text>
          <TouchableOpacity
            style={[styles.tipRoomCTA, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Discover')}
            activeOpacity={0.85}
          >
            <Text style={styles.tipRoomCTAText}>Find Creators to Support</Text>
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

        {/* Export actions — Save/Share the QR as an image, or as a PDF */}
        {tipRoomUrl && (
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: theme.colors.border }]}
              onPress={handleSaveQrImage}
              disabled={exportBusy}
              activeOpacity={0.8}
            >
              {exportBusy ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={theme.colors.text} />
                  <Text style={[styles.exportBtnText, { color: theme.colors.text }]}>Save Image</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: theme.colors.border }]}
              onPress={handleShareQrImage}
              disabled={exportBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="image-outline" size={16} color={theme.colors.text} />
              <Text style={[styles.exportBtnText, { color: theme.colors.text }]}>Share Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: theme.colors.border }]}
              onPress={handleSharePdfPrompt}
              disabled={exportBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="document-outline" size={16} color={theme.colors.text} />
              <Text style={[styles.exportBtnText, { color: theme.colors.text }]}>Share PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hidden capture target for exports — always white/black regardless
            of theme (a QR needs to scan reliably on paper), laid out
            off-screen so captureRef can measure it without showing a
            second, visually-redundant QR card to the user. collapsable=
            false on both the wrapper and the target is required on
            Android, otherwise the view-flattening optimiser can drop a
            plain View with no visible styling before captureRef runs. */}
        {tipRoomUrl && (
          <View style={styles.exportCardOffscreen} collapsable={false} pointerEvents="none">
            <View ref={exportCardRef} collapsable={false} style={styles.exportCard}>
              <QRCode
                value={tipRoomUrl}
                size={EXPORT_QR_SIZE}
                backgroundColor="#ffffff"
                color="#000000"
                logo={require('../../assets/images/logos/logo-trans-lockup.png')}
                logoSize={44}
                logoBackgroundColor="#ffffff"
                logoBorderRadius={4}
                logoMargin={3}
              />
              <Text style={styles.exportCardName} numberOfLines={1}>
                {userProfile?.display_name || userProfile?.username}
              </Text>
            </View>
          </View>
        )}

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

        {/* Live usage guidance */}
        <View style={[styles.guidanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.guidanceTitle, { color: theme.colors.text }]}>Using your QR code at live events</Text>
          {[
            { icon: 'laptop-outline' as const, text: 'Open soundbridge.live/tip/you on your laptop — no extra setup needed.' },
            { icon: 'tv-outline' as const, text: 'Connect to a projector and beam it to the room. Any smartphone can scan it.' },
            { icon: 'print-outline' as const, text: 'Print it as a card or poster for your merch table. It never expires or changes.' },
          ].map(({ icon, text }) => (
            <View key={icon} style={styles.guidanceRow}>
              <Ionicons name={icon} size={15} color={theme.colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.guidanceText, { color: theme.colors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>
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
    gap: 8, borderRadius: 28, paddingVertical: 15, marginBottom: 12,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  exportRow: {
    flexDirection: 'row', gap: 8, marginBottom: 36,
  },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 11,
  },
  exportBtnText: { fontSize: 12.5, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  exportCardOffscreen: {
    position: 'absolute', top: -4000, left: 0,
  },
  exportCard: {
    width: EXPORT_CARD_WIDTH,
    backgroundColor: '#ffffff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  exportCardName: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    fontFamily: Typography.body.fontFamily,
  },
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
    marginBottom: 24,
  },
  guidanceCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, marginBottom: 8,
  },
  guidanceTitle: {
    fontSize: 14, fontWeight: '700', marginBottom: 4, fontFamily: Typography.body.fontFamily,
  },
  guidanceRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  guidanceText: {
    flex: 1, fontSize: 13, lineHeight: 19, fontFamily: Typography.body.fontFamily,
  },

  // Non-creator states
  tipRoomEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  tipRoomEmptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', fontFamily: Typography.body.fontFamily },
  tipRoomEmptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontFamily: Typography.body.fontFamily },
  tipRoomCTA: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, marginTop: 8 },
  tipRoomCTAText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: Typography.body.fontFamily },
});
