/**
 * LiveStreamViewerScreen — watching someone else's video live stream.
 * Plays HLS via expo-av's Video component (already installed, used elsewhere in
 * this project — per MOBILE_TEAM_LIVE_STREAMING.MD, do not add expo-video or any
 * other playback library for this). Separate from the existing Agora audio-live
 * feature (LiveSessionRoomScreen) — do not touch that.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Image, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { liveStreamService } from '../services/liveStreamService';
import LiveBadge from '../components/LiveBadge';
import LiveVideoTippingModal from '../components/LiveVideoTippingModal';

interface RouteParams {
  creatorId: string;
  creatorName?: string;
  creatorUsername?: string;
  creatorAvatarUrl?: string | null;
}

export default function LiveStreamViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { creatorId, creatorName, creatorUsername, creatorAvatarUrl } = (route.params ?? {}) as RouteParams;
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [ended, setEnded] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackKey, setPlaybackKey] = useState(0);
  const videoRef = useRef<Video>(null);
  const joinedRef = useRef(false);

  // Without this, iOS defaults to playsInSilentModeIOS: false — audio silently
  // doesn't play whenever the device's mute switch is on. staysActiveInBackground
  // matches the convention elsewhere in the app (PostAudioPlayer.tsx) so this
  // doesn't fight TrackPlayer's shared AVAudioSession.
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: Platform.OS === 'ios',
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setPlaybackError(null);
    const status = await liveStreamService.getActiveStatus(session, creatorId);
    if (!status.live || !status.liveStreamId || !status.hlsPlaybackUrl) {
      setEnded(true);
      setLoading(false);
      return;
    }
    setLiveStreamId(status.liveStreamId);
    setHlsUrl(status.hlsPlaybackUrl);
    setTitle(status.title ?? null);
    setViewerCount(status.viewerCount ?? 0);
    setEnded(false);
    setLoading(false);
  }, [creatorId, session]);

  const handleRetryPlayback = () => {
    setPlaybackError(null);
    setIsBuffering(true);
    setPlaybackKey((k) => k + 1);
  };

  useEffect(() => { load(); }, [load]);

  // Join/leave viewer count — join on mount, leave on unmount (per spec: a viewer
  // who force-quits without triggering this just leaves the count slightly high
  // until the stream ends, not something to over-engineer).
  useEffect(() => {
    if (!liveStreamId) return;
    liveStreamService.joinAsViewer(session, liveStreamId);
    joinedRef.current = true;
    return () => {
      if (joinedRef.current) {
        liveStreamService.leaveAsViewer(session, liveStreamId);
        joinedRef.current = false;
      }
    };
  }, [liveStreamId, session]);

  // Also leave when navigating away within the app (screen loses focus) even if not unmounted.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (liveStreamId && joinedRef.current) {
          liveStreamService.leaveAsViewer(session, liveStreamId);
          joinedRef.current = false;
        }
      };
    }, [liveStreamId, session])
  );

  // Real-time viewer count + end detection — exact pattern from MOBILE_TEAM_LIVE_STREAMING.MD.
  useEffect(() => {
    if (!liveStreamId) return;

    const channel = supabase
      .channel(`live-stream-${liveStreamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${liveStreamId}` },
        (payload: any) => {
          setViewerCount(payload.new.viewer_count);
          if (payload.new.status !== 'active') {
            setEnded(true);
            videoRef.current?.pauseAsync().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveStreamId]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ((status as any).error) {
        console.warn('[LiveStreamViewerScreen] playback error:', (status as any).error);
        setIsBuffering(false);
        setPlaybackError(String((status as any).error));
      }
      return;
    }
    setPlaybackError(null);
    setIsBuffering(status.isBuffering ?? false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (ended || !hlsUrl) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.endedText}>
          {creatorName || creatorUsername || 'This creator'} is no longer live.
        </Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonLargeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      <Video
        key={playbackKey}
        ref={videoRef}
        source={{ uri: hlsUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      {isBuffering && !playbackError && (
        <View style={[styles.video, styles.centered]} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {playbackError && (
        <View style={[styles.video, styles.centered]}>
          <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.endedText}>Couldn't connect to the stream.</Text>
          <TouchableOpacity style={styles.backButtonLarge} onPress={handleRetryPlayback}>
            <Text style={styles.backButtonLargeText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Connection details', `URL: ${hlsUrl}\n\nError: ${playbackError}`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.detailsLink}>Show details</Text>
          </TouchableOpacity>
        </View>
      )}

      <SafeAreaView style={styles.overlaySafeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.creatorInfo}>
            {creatorAvatarUrl ? (
              <Image source={{ uri: creatorAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LiveBadge size="small" />
                <View style={styles.viewerCountPill}>
                  <Ionicons name="eye" size={11} color="#fff" />
                  <Text style={styles.viewerCountText}>{viewerCount}</Text>
                </View>
              </View>
              <Text style={styles.creatorName} numberOfLines={1}>
                {creatorName || creatorUsername}
              </Text>
            </View>
          </View>
        </View>

        {title && (
          <View style={styles.titleWrap}>
            <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
          </View>
        )}

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.tipButton} onPress={() => setShowTipModal(true)}>
            <Ionicons name="gift" size={18} color="#FACC15" />
            <Text style={styles.tipButtonText}>Tip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <LiveVideoTippingModal
        visible={showTipModal}
        onClose={() => setShowTipModal(false)}
        creatorId={creatorId}
        creatorName={creatorName || creatorUsername || 'this creator'}
        liveStreamId={liveStreamId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  video: { ...StyleSheet.absoluteFillObject },
  overlaySafeArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 10 },
  iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  viewerCountText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  creatorName: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 },
  titleWrap: { paddingHorizontal: 16 },
  titleText: { color: '#fff', fontSize: 14, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'flex-end' },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tipButtonText: { color: '#FACC15', fontSize: 14, fontWeight: '700' },
  endedText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center' },
  backButtonLarge: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999 },
  backButtonLargeText: { color: '#fff', fontWeight: '600' },
  detailsLink: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4, textDecorationLine: 'underline' },
});
