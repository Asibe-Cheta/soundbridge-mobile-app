/**
 * GoLiveScreen — the real broadcast flow (Step 2 of MOBILE_TEAM_LIVE_STREAMING.MD),
 * replaces the throwaway LiveStreamSpikeTestScreen. Video live streaming, separate
 * from and unrelated to the existing Agora audio-live feature (CreateLiveSessionScreen,
 * LiveSessionRoomScreen) — do not touch those.
 *
 * Duration limit (3hr cutoff, 2h45m warning) is server-enforced (cron), not a client
 * timer — this screen only *displays* elapsed time and reacts to the server's signals
 * (push notification for the warning, Realtime status change for forced end).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ExpoLiveStreamPublisherView, useLiveStream, VideoQuality } from 'expo-live-stream';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { liveStreamService, StartLiveStreamResponse } from '../services/liveStreamService';
import { notificationService } from '../services/NotificationService';
import BackButton from '../components/BackButton';

type Phase = 'setup' | 'starting' | 'live' | 'ending';

export default function GoLiveScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [phase, setPhase] = useState<Phase>('setup');
  const [title, setTitle] = useState('');
  const [checkingReconnect, setCheckingReconnect] = useState(true);
  const [liveStream, setLiveStream] = useState<StartLiveStreamResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndingSoonBanner, setShowEndingSoonBanner] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const stream = useLiveStream({ autoStopOnUnmount: true });
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Reconnect flow — if the app was killed/reopened mid-stream, re-fetch fresh credentials
  // rather than assuming stale local state.
  useEffect(() => {
    (async () => {
      if (!user?.id) { setCheckingReconnect(false); return; }
      const active = await liveStreamService.getActiveStatus(session, user.id);
      if (active.live && active.liveStreamId) {
        try {
          const creds = await liveStreamService.getCredentials(session, active.liveStreamId);
          setLiveStream({ liveStreamId: active.liveStreamId, ...creds });
          startedAtRef.current = active.startedAt ? new Date(active.startedAt).getTime() : Date.now();
          setPhase('live');
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      }
      setCheckingReconnect(false);
    })();
  }, [user?.id]);

  // Elapsed-time display only — not used for any cutoff enforcement.
  useEffect(() => {
    if (phase !== 'live' || !startedAtRef.current) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Start streaming once we have credentials and the publisher view is mounted (live phase).
  useEffect(() => {
    if (phase === 'live' && liveStream) {
      stream.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, liveStream?.liveStreamId]);

  // In-app "15 minutes left" banner while this screen is foregrounded.
  useFocusEffect(
    useCallback(() => {
      notificationService.setLiveStreamEndingSoonCallback(() => setShowEndingSoonBanner(true));
      return () => notificationService.setLiveStreamEndingSoonCallback(null);
    }, [])
  );

  // Detect forced end (3hr cutoff, or ended from another device) via Realtime.
  useEffect(() => {
    if (!liveStream?.liveStreamId) return;

    const channel = supabase
      .channel(`live-stream-owner-${liveStream.liveStreamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${liveStream.liveStreamId}` },
        (payload: any) => {
          setViewerCount(payload.new.viewer_count ?? 0);
          if (payload.new.status !== 'active') {
            handleStreamEndedRemotely();
          }
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStream?.liveStreamId]);

  const handleStreamEndedRemotely = () => {
    stream.stop();
    setPhase('setup');
    setLiveStream(null);
    setShowEndingSoonBanner(false);
    setViewerCount(0);
    Alert.alert('Stream Ended', 'Your live stream has ended.');
  };

  // Best-effort cleanup if the creator backgrounds/kills the app while live — the
  // 3hr cron is the ultimate backstop if this never fires (per spec).
  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === 'background' && phase === 'live' && liveStream?.liveStreamId) {
        liveStreamService.endLiveStream(session, liveStream.liveStreamId).catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [phase, liveStream?.liveStreamId, session]);

  const handleGoLive = async () => {
    if (!user?.id) return;
    setPhase('starting');
    try {
      const eligibility = await liveStreamService.checkEligibility(session);
      if (!eligibility.eligible) {
        setPhase('setup');
        Alert.alert(
          'Live Streaming Not Available Yet',
          eligibility.message || 'Live streaming is available to creators with 50 or more followers or to designated SoundBridge partners. Keep growing your following!',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await liveStreamService.startLiveStream(session, title.trim() || undefined);
      startedAtRef.current = Date.now();
      setLiveStream(result);
      setPhase('live');
    } catch (err: any) {
      setPhase('setup');
      Alert.alert('Couldn’t Start Stream', err.message);
    }
  };

  const handleEndStream = () => {
    Alert.alert('End Live Stream?', 'This will end your broadcast for everyone watching.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: async () => {
          if (!liveStream?.liveStreamId) return;
          setPhase('ending');
          stream.stop();
          try {
            await liveStreamService.endLiveStream(session, liveStream.liveStreamId);
          } catch (err: any) {
            // Stream is stopped locally either way — surface but don't block returning.
            console.warn('[GoLiveScreen] endLiveStream error:', err);
          }
          setPhase('setup');
          setLiveStream(null);
          setShowEndingSoonBanner(false);
          setViewerCount(0);
          navigation.goBack();
        },
      },
    ]);
  };

  const formatElapsed = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (checkingReconnect) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (phase === 'live' && liveStream) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <ExpoLiveStreamPublisherView
          ref={stream.ref}
          style={styles.preview}
          url={liveStream.rtmpUrl}
          streamKey={liveStream.streamKey}
          quality={VideoQuality.HD_720P}
          frontCamera
          onStreamStateChanged={stream.handleStreamStateChanged}
          onConnectionFailed={stream.handleConnectionFailed}
          onConnectionSuccess={stream.handleConnectionSuccess}
          onDisconnect={stream.handleDisconnect}
          onBitrateUpdate={stream.handleBitrateUpdate}
        />

        <SafeAreaView style={styles.overlaySafeArea} edges={['top', 'bottom']}>
          <View style={styles.liveTopBar}>
            <View style={styles.liveIndicatorPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
            <View style={styles.viewerCountPill}>
              <Ionicons name="eye" size={12} color="#fff" />
              <Text style={styles.viewerCountText}>{viewerCount}</Text>
            </View>
            <Text style={styles.elapsedText}>{formatElapsed(elapsedSeconds)}</Text>
            <TouchableOpacity onPress={() => stream.switchCamera()} style={styles.iconButton}>
              <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {showEndingSoonBanner && (
            <View style={styles.endingSoonBanner}>
              <Ionicons name="time-outline" size={16} color="#000" />
              <Text style={styles.endingSoonText}>Your stream will end in 15 minutes (3-hour limit)</Text>
              <TouchableOpacity onPress={() => setShowEndingSoonBanner(false)}>
                <Ionicons name="close" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.liveBottomBar}>
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleEndStream}
              disabled={phase !== 'live' as any}
            >
              <Text style={styles.endButtonText}>End Stream</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.setupContent}>
          <View style={[styles.setupIconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="videocam" size={40} color={theme.colors.primary} />
          </View>
          <Text style={[styles.setupTitle, { color: theme.colors.text }]}>Start a Live Stream</Text>
          <Text style={[styles.setupSubtitle, { color: theme.colors.textSecondary }]}>
            Go live to your followers for up to 3 hours. They'll get notified the moment you start.
          </Text>

          <TextInput
            style={[styles.titleInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Stream title (optional)"
            placeholderTextColor={theme.colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TouchableOpacity
            style={[styles.goLiveButton, { backgroundColor: theme.colors.primary, opacity: phase === 'starting' ? 0.7 : 1 }]}
            onPress={handleGoLive}
            disabled={phase === 'starting'}
          >
            {phase === 'starting' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={styles.goLiveButtonText}>Go Live</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  setupContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  setupIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  setupTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  setupSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  titleInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  goLiveButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  goLiveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  preview: { flex: 1, alignSelf: 'stretch' },
  overlaySafeArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  liveTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveIndicatorText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  viewerCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  viewerCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  elapsedText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
  iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  endingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FCD34D',
  },
  endingSoonText: { flex: 1, color: '#000', fontSize: 12, fontWeight: '600' },
  liveBottomBar: { paddingHorizontal: 16, paddingBottom: 12 },
  endButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  endButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
