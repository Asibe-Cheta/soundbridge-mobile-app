import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, Alert, AppState, DeviceEventEmitter } from 'react-native';
import { audioLog } from '../lib/audioDebugLog';
import { SB_STOP_FEED_TEASERS } from '../lib/audioEvents';
import { isExpoAvBypassedForBgTest } from '../config/audioBgIsolationTest';
import { supabase } from '../lib/supabase';
import { backgroundAudioService, BackgroundAudioTrack } from '../services/BackgroundAudioService';
import { contentPurchaseService } from '../services/ContentPurchaseService';
import { playSessionService } from '../services/PlaySessionService';
import { useScreenCaptureProtection } from '../hooks/useScreenCaptureProtection';
// import { realAudioProcessor } from '../services/RealAudioProcessor';

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url?: string;
  file_url?: string;
  cover_image_url?: string;
  duration?: number;
  plays_count?: number;
  likes_count?: number;
  created_at: string;
  creator_id?: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  // Lyrics fields
  lyrics?: string;
  lyrics_language?: string;
  has_lyrics?: boolean;
  // Moderation fields
  moderation_status?: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed' | 'taken_down';
  // Paid content fields
  is_paid?: boolean;
  price?: number;
  currency?: string;
  // Live interest
  live_interest_enabled?: boolean;
}

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  isCaptured: boolean;
  duration: number;
  position: number;
  isLoading: boolean;
  error: string | null;
  play: (track: AudioTrack, withQueue?: AudioTrack[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  updateCurrentTrack: (updates: Partial<AudioTrack>) => void;
  /** Starts play-session tracking — play_count is updated server-side after valid listen. */
  beginPlaySession: (trackId: string) => Promise<void>;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  autoPlay: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoPlay: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  queue: AudioTrack[];
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

// Helper function to get moderation error messages
const getModerationErrorMessage = (status: string): string => {
  switch (status) {
    case 'flagged':
      return 'This track is under review by our moderation team.';
    case 'rejected':
      return 'This track was not approved. You can appeal this decision.';
    case 'appealed':
      return 'Your appeal is being reviewed. We\'ll notify you soon.';
    case 'taken_down':
      return 'This track has been removed following a copyright notice. The uploader may submit a counter-notice.';
    default:
      return 'This track is currently unavailable.';
  }
};

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [autoPlay, setAutoPlay] = useState(true);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<any>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const playPositionRef = useRef<number>(0);

  // Screen capture protection — pause audio when screen recording starts.
  // iOS: audio pause is disabled here. The IsScreenCapturedIos native module fires
  // false positives on some iOS versions during App Switcher / backgrounding, which
  // was the primary cause of music stopping when the user pressed Home. We log the
  // event for diagnostics but do NOT pause on iOS.
  // Android: screen capture events are reliable so we still enforce the pause.
  const handleCaptureChange = (captured: boolean) => {
    audioLog('SCREEN_CAPTURE_CHANGED', { isCaptured: captured, appState: AppState.currentState });
    if (Platform.OS === 'ios') return; // iOS: do not pause — native module unreliable
    if (captured) {
      backgroundAudioService.pause('screenCapture').catch(() => {});
      if (playerRef.current) {
        try { playerRef.current.pause(); } catch (e) {}
      }
      setIsPlaying(false);
      setIsPaused(true);
    }
  };
  const { isCaptured } = useScreenCaptureProtection(handleCaptureChange);
  const isCapturedRef = useRef(isCaptured);
  useEffect(() => { isCapturedRef.current = isCaptured; }, [isCaptured]);

  // Refs to always access latest state inside async callbacks — prevents stale closures
  const repeatModeRef = useRef(repeatMode);
  const currentTrackRef = useRef(currentTrack);
  const autoPlayRef = useRef(autoPlay);
  const queueRef = useRef(queue);
  const handleTrackFinishedRef = useRef<() => Promise<void>>(async () => {});

  type ServiceStatus = { position: number; duration: number; isPlaying: boolean };

  const restoreTrackFromService = (
    svc: ReturnType<typeof backgroundAudioService.getCurrentTrack>,
  ) => {
    if (!svc) return null;
    return {
      id: svc.id,
      title: svc.title,
      file_url: svc.url,
      audio_url: svc.url,
      cover_image_url: svc.artwork,
      duration: svc.duration,
      created_at: new Date().toISOString(),
      creator: { id: svc.creatorId || '', username: svc.artist, display_name: svc.artist },
    };
  };

  /** Service status → React UI. Position ref always updated; setState only in foreground. */
  const applyServiceStatusToUi = (s: ServiceStatus, options?: { restoreTrack?: boolean }) => {
    playPositionRef.current = s.position;
    if (AppState.currentState !== 'active') return;

    setIsPlaying(s.isPlaying);
    setPosition(s.position);
    if (s.duration > 0) setDuration(s.duration);

    if (!options?.restoreTrack) return;
    setCurrentTrack(prev => {
      const svcTrack = backgroundAudioService.getCurrentTrack();
      if (!svcTrack) return prev;
      const restored = restoreTrackFromService(svcTrack);
      if (!prev) return restored;
      if (!prev.cover_image_url && svcTrack.artwork) {
        return { ...prev, cover_image_url: svcTrack.artwork };
      }
      return prev;
    });
  };

  const syncUiFromService = () => {
    applyServiceStatusToUi({
      position: backgroundAudioService.getPosition(),
      duration: backgroundAudioService.getDuration(),
      isPlaying: backgroundAudioService.getIsPlaying(),
    });
  };

  // On mount: subscribe unconditionally so we receive status updates from
  // _resumeAfterJsRestart even if it completes AFTER this effect runs (race condition).
  // When a playing update arrives with no current track set, restore the MiniPlayer.
  useEffect(() => {
    const unsub = backgroundAudioService.onStatusUpdate((s) => {
      applyServiceStatusToUi(s, { restoreTrack: true });
    });
    statusUnsubscribeRef.current = unsub;

    const svc = backgroundAudioService.getCurrentTrack();
    const isActuallyPlaying = backgroundAudioService.getIsPlaying();
    if (svc && isActuallyPlaying) {
      setCurrentTrack(restoreTrackFromService(svc));
      applyServiceStatusToUi({
        position: backgroundAudioService.getPosition(),
        duration: backgroundAudioService.getDuration(),
        isPlaying: true,
      });
    }

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-shot UI sync when returning to foreground (no background position polling).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && backgroundAudioService.getCurrentTrack()) {
        syncUiFromService();
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
      }
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Keep refs in sync with latest state so async callbacks always see fresh values
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Audio status handler (for expo-audio)
  const onPlaybackStatusUpdate = (status: any) => {
    if (playerRef.current && playerRef.current.isLoaded) {
      const nextDuration = Math.floor(playerRef.current.duration || 0);
      const nextPosition = Math.floor(playerRef.current.currentTime || 0);
      playPositionRef.current = nextPosition;
      if (AppState.currentState === 'active') {
        setDuration(nextDuration);
        setPosition(nextPosition);
      }
      // Check if track finished
      if (playerRef.current.currentTime >= playerRef.current.duration && playerRef.current.duration > 0) {
        // Track finished, handle based on repeat mode and auto-play settings
        if (repeatMode === 'one') {
          // Repeat current track
          playerRef.current.seekTo(0);
          playerRef.current.play();
        } else if (repeatMode === 'all' || (autoPlay && queue.length > 0)) {
          // Play next track (loop back to start if repeatMode is 'all')
          playNext();
        } else {
          // Stop playback if auto-play is disabled or no tracks in queue
          setIsPlaying(false);
          setIsPaused(false);
        }
      }
    } else if (status?.error) {
      console.error('Audio playback error:', status.error);
      setError(`Playback error: ${status.error}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const play = async (track: AudioTrack, withQueue?: AudioTrack[]) => {
    try {
      // Block playback while screen recording is active
      if (isCapturedRef.current) return;

      // PHASE 2: Moderation Playability Check
      // Block playback for tracks that are flagged, rejected, or appealed
      const unplayableStatuses = ['flagged', 'rejected', 'appealed', 'taken_down'];
      const moderationStatus = (track as any).moderation_status;

      if (moderationStatus && unplayableStatuses.includes(moderationStatus)) {
        const errorMessage = getModerationErrorMessage(moderationStatus);
        setError(errorMessage);
        setIsLoading(false);

        // Show user-friendly alert
        Alert.alert('Track Unavailable', errorMessage, [{ text: 'OK' }]);
        return; // Exit early without throwing
      }

      // Paid tracks are freely streamable — purchase is for ownership/download only
      if (track.is_paid) {
        console.log('💰 Paid track - allowing free stream:', track.title);
      }

      setIsLoading(true);
      setError(null);
      
      console.log('🛑 Stopping any currently playing track before starting new one...');

      // Tear down feed expo-av teasers (mounted Feed tab) before taking the iOS audio session.
      if (!isExpoAvBypassedForBgTest()) {
        DeviceEventEmitter.emit(SB_STOP_FEED_TEASERS);
      }

      // Flush play session for the track we're leaving before starting a new one
      await flushPlaySession();

      // IMPORTANT: Stop ALL audio sources before starting new track
      // 1. Stop background audio service first (this is the main player)
      try {
        await backgroundAudioService.stop('playNewTrack');
        console.log('✅ Background audio service stopped');
      } catch (error) {
        console.warn('Error stopping background audio service:', error);
      }
      
      // 2. Stop expo-audio player if it exists
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
          playerRef.current = null;
          console.log('✅ Expo-audio player stopped');
        } catch (error) {
          console.warn('Error stopping expo-audio player:', error);
        }
      }
      
      // 3. Clear any existing status subscriptions
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }
      
      // 5. Clear track finished callback
      try {
        if (backgroundAudioService && typeof backgroundAudioService.clearOnTrackFinished === 'function') {
          backgroundAudioService.clearOnTrackFinished();
        }
      } catch (error) {
        console.warn('Error clearing track finished callback:', error);
      }
      
      // 6. Reset state
      setIsPlaying(false);
      setIsPaused(false);
      setPosition(0);
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if track has a valid audio URL (support both field names)
      const audioUrl = track.file_url || track.audio_url;
      if (!audioUrl) {
        throw new Error('Track has no audio file URL');
      }
      
      // Validate URL format
      try {
        new URL(audioUrl);
      } catch {
        throw new Error('Invalid audio URL format');
      }
      
      console.log('🎵 Loading track:', track.title, 'URL:', audioUrl);
      
      // Try to use real audio processor first (for enhanced audio)
      // const audioProcessorSuccess = await realAudioProcessor.playTrackWithEnhancement({
      //   id: track.id,
      //   title: track.title,
      //   url: audioUrl,
      //   artist: track.creator?.display_name || track.creator?.username || 'Unknown Artist',
      //   artwork: track.cover_image_url,
      //   duration: track.duration,
      // });

      const audioProcessorSuccess = false; // Disabled for Expo compatibility
      if (audioProcessorSuccess) {
        console.log('✅ Using real audio processor for enhanced playback');
        setCurrentTrack(track);
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
        
        // Increment play count in database
        beginPlaySession(track.id);
        return;
      }

      console.log('⚠️ Real audio processor failed, falling back to expo-audio');
      
      // Update UI state BEFORE awaiting TrackPlayer — so MiniPlayer appears
      // immediately even if the native audio setup takes time or hangs (e.g.
      // post-SIGABRT on Android where TrackPlayer calls may block indefinitely).
      // Normalize creator — some API responses use flat creator_id instead of nested creator object,
      // or provide artist_name as a flat string (TracksListScreen, AlbumDetailsScreen patterns).
      const creatorId = track.creator?.id || (track as any).creator_id || '';
      const flatArtistName = (track as any).artist_name || '';
      const normalizedTrack = {
        ...track,
        creator: track.creator
          ? {
              ...track.creator,
              id: creatorId,
              // Patch null/empty display_name with flat artist_name if available
              display_name: track.creator.display_name || track.creator.username || flatArtistName,
              username: track.creator.username || flatArtistName,
            }
          : creatorId
            ? { id: creatorId, username: flatArtistName, display_name: flatArtistName }
            : { id: '', username: flatArtistName, display_name: flatArtistName },
      };
      // Don't set currentTrack until native playback confirms — avoids mini player flicker on failure.
      setIsPlaying(false);
      setIsPaused(false);
      setPosition(0);
      setDuration(track.duration || 0);

      // Use background audio service for background playback
      const backgroundTrack: BackgroundAudioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || track.creator?.username || 'Unknown Artist',
        url: audioUrl,
        streamUrl: audioUrl,
        artwork: track.cover_image_url,
        duration: track.duration,
        creatorId,
      };

      // Clean up old subscription before starting new one
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }

      // Subscribe to status updates from background audio service (no duplicate 500ms poll).
      const unsubscribe = backgroundAudioService.onStatusUpdate((status) => {
        applyServiceStatusToUi(status);
        if (status.duration > 0 && AppState.currentState === 'active') {
          setIsLoading(false);
        }
      });

      backgroundAudioService.setOnTrackFinished(() => {
        handleTrackFinishedRef.current();
      });

      // When RNTP native layer skips to a different track (lock-screen Next/Previous),
      // update the React currentTrack so the UI stays in sync.
      backgroundAudioService.setRemoteTrackChangedCallback((bgTrack) => {
        const match = queueRef.current.find(t => t.id === bgTrack.id);
        if (match) {
          setCurrentTrack(match);
        } else {
          setCurrentTrack({
            id: bgTrack.id,
            title: bgTrack.title,
            audio_url: bgTrack.url,
            file_url: bgTrack.url,
            cover_image_url: bgTrack.artwork,
            duration: bgTrack.duration,
            created_at: new Date().toISOString(),
            creator: { id: '', username: bgTrack.artist, display_name: bgTrack.artist },
          });
        }
        setPosition(0);
        setIsPlaying(true);
      });

      statusUnsubscribeRef.current = () => {
        unsubscribe();
        backgroundAudioService.clearOnTrackFinished();
        backgroundAudioService.clearRemoteTrackChangedCallback();
      };

      // Start server-validated play session (count updates after valid listen)
      beginPlaySession(track.id);

      // Build native queue from JS queue so lock-screen skip buttons work end-to-end.
      // IMPORTANT: only pass the queue if the new track is already IN it — otherwise
      // the native player falls back to index 0 of the stale queue and plays the wrong song.
      let jsQueue = queueRef.current;
      if (withQueue && withQueue.length > 0) {
        jsQueue = withQueue;
        setQueue(withQueue);
        queueRef.current = withQueue;
      }
      const trackInQueue = jsQueue.some(t => t.id === track.id);
      const bgQueueTracks: BackgroundAudioTrack[] | undefined = (jsQueue.length > 0 && trackInQueue)
        ? jsQueue
            .map(t => ({
              id: t.id,
              title: t.title,
              artist: t.creator?.display_name || t.creator?.username || (t as any).artist_name || 'Unknown Artist',
              url: t.file_url || t.audio_url || '',
              artwork: t.cover_image_url,
              duration: t.duration,
              creatorId: t.creator?.id || (t as any).creator_id || '',
            }))
            .filter(t => !!t.url)
        : undefined;
      const nativeQueueIndex = bgQueueTracks
        ? bgQueueTracks.findIndex(t => t.id === track.id)
        : 0;

      // Kick off native audio — must complete so TrackPlayer queue is loaded before backgrounding.
      try {
        await backgroundAudioService.playTrack(
          backgroundTrack,
          bgQueueTracks,
          nativeQueueIndex >= 0 ? nativeQueueIndex : 0,
        );
      } catch (err) {
        console.warn('Background audio service failed:', err);
        setError('Playback failed to start. Try again.');
        setIsPlaying(false);
        setCurrentTrack(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);

      setCurrentTrack(normalizedTrack);
      setIsPlaying(true);
      setIsPaused(false);

      console.log('🎵 Successfully started playing with background audio service');
      return;
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(`Failed to play track: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCurrentTrack(null);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const pause = async () => {
    try {
      // Use background audio service
      await backgroundAudioService.pause('userAction');
      
      // Also pause expo-audio player if it's being used
      if (playerRef.current) {
        playerRef.current.pause();
      }
      
      setIsPlaying(false);
      setIsPaused(true);
      console.log('🎵 Paused playback');
    } catch (err) {
      console.error('Failed to pause:', err);
      setError('Failed to pause playback');
    }
  };

  const resume = async () => {
    try {
      if (isCapturedRef.current) return;

      // Use background audio service
      await backgroundAudioService.resume();
      
      // Also resume expo-audio player if it's being used
      if (playerRef.current) {
        playerRef.current.play();
      }
      
      setIsPlaying(true);
      setIsPaused(false);
      console.log('🎵 Resumed playback');
    } catch (err) {
      console.error('Failed to resume:', err);
      setError('Failed to resume playback');
    }
  };

  const stop = async () => {
    try {
      await flushPlaySession();
      // Use background audio service
      await backgroundAudioService.stop('userStop');
      
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.seekTo(0);
        setIsPlaying(false);
        setIsPaused(false);
        setPosition(0);
        console.log('🎵 Stopped playback');
      }
    } catch (err) {
      console.error('Failed to stop:', err);
      setError('Failed to stop playback');
    }
  };

  const seekTo = async (newPosition: number) => {
    try {
      // Validate position (newPosition is in seconds)
      const maxDuration = duration > 0 ? duration : 999999; // Allow seeking if duration not yet loaded
      if (newPosition < 0 || (duration > 0 && newPosition > duration)) {
        console.warn('🎵 Invalid seek position:', newPosition, 'Duration:', duration);
        return;
      }
      
      // Use background audio service (expects seconds, not milliseconds)
      await backgroundAudioService.seekTo(newPosition);
      
      // Update position immediately for responsive UI
      setPosition(newPosition);
      
      console.log('🎵 Successfully seeked to:', newPosition, 'seconds');
    } catch (err) {
      console.warn('🎵 Seek interrupted or failed:', err);
      // Don't set error state for seeking issues, just log and continue
    }
  };

  const setVolume = async (newVolume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolumeState(clampedVolume);
      
      // Use background audio service
      await backgroundAudioService.setVolume(clampedVolume);
      
      if (playerRef.current) {
        playerRef.current.volume = clampedVolume;
      }
      
      console.log('🎵 Volume set to:', clampedVolume);
    } catch (err) {
      console.error('Failed to set volume:', err);
      setError('Failed to set volume');
    }
  };

  const updateCurrentTrack = (updates: Partial<AudioTrack>) => {
    setCurrentTrack(prev => prev ? { ...prev, ...updates } : null);
    console.log('🎵 Updated current track:', updates);
  };

  const handleTrackFinished = async () => {
    await flushPlaySession();
    // Read from refs so we always use the latest state, not stale closure values
    const mode = repeatModeRef.current;
    const track = currentTrackRef.current;
    const shouldAutoPlay = autoPlayRef.current;
    const currentQueue = queueRef.current;

    if (mode === 'one' && track) {
      // Repeat current track
      await play(track);
    } else if (mode === 'all' || (shouldAutoPlay && currentQueue.length > 0)) {
      // Play next track in queue
      await playNext();
    } else {
      // Stop playback
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  // Keep ref updated so any registered callback always invokes the latest version
  useEffect(() => {
    handleTrackFinishedRef.current = handleTrackFinished;
  });

  // Tracks the wall-clock time when a valid play session started (after 30s threshold passes)
  const playSessionStartRef = useRef<{ trackId: string; startedAt: number; userId: string | null } | null>(null);

  const recordPlaySession = async (
    trackId: string,
    userId: string,
    durationListened: number,
    trackTotalDuration: number,
  ) => {
    try {
      const result = await playSessionService.recordPlaySession(
        trackId,
        userId,
        durationListened,
        trackTotalDuration,
      );

      if (!result.recorded) return;

      if (result.isValid && !result.isRejected && result.playCount != null) {
        if (currentTrack?.id === trackId) {
          updateCurrentTrack({ plays_count: result.playCount });
        }
      }

      console.log(
        `✅ Play session recorded (valid=${result.isValid}, rejected=${result.isRejected}, suspicious=${result.isSuspicious})`,
      );

      if (result.isValid && !result.isRejected) {
        await maybeSendLiveInterestPush(trackId, userId);
      }
    } catch (err) {
      console.warn('⚠️ recordPlaySession error:', err);
    }
  };

  const countValidUserPlays = async (trackId: string, userId: string): Promise<number> => {
    const withFraudCols = await supabase
      .from('play_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .eq('is_valid', true)
      .eq('is_rejected', false);

    if (!withFraudCols.error) return withFraudCols.count ?? 0;

    const legacy = await supabase
      .from('play_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .eq('user_id', userId);

    return legacy.count ?? 0;
  };

  const maybeSendLiveInterestPush = async (trackId: string, userId: string) => {
    try {
      // Check if track has live_interest_enabled and user hasn't been sent push yet
      const [{ data: track }, { data: alreadySent }] = await Promise.all([
        supabase
          .from('audio_tracks')
          .select('title, live_interest_enabled, creator_id')
          .eq('id', trackId)
          .single(),
        supabase
          .from('live_interest_push_sent')
          .select('id')
          .eq('user_id', userId)
          .eq('track_id', trackId)
          .maybeSingle(),
      ]);

      if (!track?.live_interest_enabled) return;
      if (alreadySent) return; // already sent, never send twice
      if (track.creator_id === userId) return; // don't prompt the creator about their own track

      // Count how many valid play sessions this user has for this track
      const validPlayCount = await countValidUserPlays(trackId, userId);
      if (validPlayCount < 2) return; // only fire on 2nd+ valid listen

      // Get creator name for push title
      const { data: creator } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', track.creator_id)
        .single();

      const artistName = creator?.display_name || creator?.username || 'The artist';

      // Mark as sent BEFORE dispatching so we never double-send even if push fails
      await supabase.from('live_interest_push_sent').insert({
        user_id: userId,
        track_id: trackId,
      });

      // Insert into notifications table — NotificationService picks this up and dispatches push
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'live_interest',
        title: artistName,
        body: `You have listened to ${track.title} twice. Would you like to hear it live?`,
        data: JSON.stringify({
          screen: 'AudioPlayer',
          trackId,
          showLiveInterest: true,
        }),
      });

      console.log(`🎤 Live interest push queued for track ${track.title}`);
    } catch (err) {
      // non-critical — never surface
    }
  };

  const beginPlaySession = async (trackId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      playSessionStartRef.current = {
        trackId,
        startedAt: Date.now(),
        userId: user.id,
      };
      playPositionRef.current = 0;
    } catch (error) {
      console.warn('⚠️ beginPlaySession error:', error);
    }
  };

  // Flush the current play session when track stops or changes
  const flushPlaySession = async () => {
    const session = playSessionStartRef.current;
    if (!session || !session.userId) return;
    playSessionStartRef.current = null;

    const durationListened = backgroundAudioService.getPosition() || playPositionRef.current;
    const trackDuration = currentTrack?.duration ?? 0;
    if (durationListened <= 0) return;

    await recordPlaySession(session.trackId, session.userId, durationListened, trackDuration);
  };


  const playNext = async () => {
    if (isCapturedRef.current) return;
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
    let nextIndex: number;
    
    if (isShuffled) {
      // When shuffled, pick a random track (but try to avoid current)
      const availableTracks = queue.filter(track => track.id !== currentTrack?.id);
      if (availableTracks.length > 0) {
        const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
        await play(randomTrack);
        return;
      }
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      const nextIndexRaw = currentIndex + 1;
      if (repeatModeRef.current !== 'all' && nextIndexRaw >= queue.length) {
        // Reached the end of the queue with repeat off — stop instead of wrapping
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }
      nextIndex = nextIndexRaw % queue.length;
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await play(nextTrack);
    }
  };

  const playPrevious = async () => {
    if (isCapturedRef.current) return;
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
    let prevIndex: number;
    
    if (isShuffled) {
      // When shuffled, pick a random track (but try to avoid current)
      const availableTracks = queue.filter(track => track.id !== currentTrack?.id);
      if (availableTracks.length > 0) {
        const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
        await play(randomTrack);
        return;
      }
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    }
    
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      await play(prevTrack);
    }
  };

  const addToQueue = (track: AudioTrack) => {
    setQueue(prev => [...prev, track]);
    console.log('Added to queue:', track.title);
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
    console.log('Removed from queue:', trackId);
  };

  const clearQueue = () => {
    setQueue([]);
    console.log('Queue cleared');
  };

  const toggleShuffle = () => {
    setIsShuffled(prev => !prev);
    console.log('Shuffle toggled:', !isShuffled);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      const next: 'off' | 'all' | 'one' = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      backgroundAudioService.setRepeatMode(next);
      return next;
    });
  };

  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
    console.log('Auto-play toggled:', !autoPlay);
  };

  const value: AudioPlayerContextType = {
    currentTrack,
    isPlaying,
    isPaused,
    isCaptured,
    duration,
    position,
    isLoading,
    error,
    play,
    pause,
    resume,
    stop,
    seekTo,
    setVolume,
    updateCurrentTrack,
    beginPlaySession,
    volume,
    isShuffled,
    repeatMode,
    autoPlay,
    toggleShuffle,
    toggleRepeat,
    toggleAutoPlay,
    playNext,
    playPrevious,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextType {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
