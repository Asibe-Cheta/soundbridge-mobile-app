import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import { audioLog } from '../lib/audioDebugLog';
import { supabase } from '../lib/supabase';
import { backgroundAudioService, BackgroundAudioTrack } from '../services/BackgroundAudioService';
import { contentPurchaseService } from '../services/ContentPurchaseService';
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
  play: (track: AudioTrack) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  updateCurrentTrack: (updates: Partial<AudioTrack>) => void;
  incrementPlayCount: (trackId: string) => Promise<void>;
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
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

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
      stopPositionTracking();
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

  // On mount: subscribe unconditionally so we receive status updates from
  // _resumeAfterJsRestart even if it completes AFTER this effect runs (race condition).
  // When a playing update arrives with no current track set, restore the MiniPlayer.
  useEffect(() => {
    const restoreTrack = (svc: ReturnType<typeof backgroundAudioService.getCurrentTrack>) => {
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

    const unsub = backgroundAudioService.onStatusUpdate((s) => {
      setIsPlaying(s.isPlaying);
      setPosition(s.position);
      if (s.duration > 0) setDuration(s.duration);
      // If audio resumed in background but we have no track in UI, restore it now.
      if (s.isPlaying) {
        setCurrentTrack(prev => {
          if (prev) return prev;
          return restoreTrack(backgroundAudioService.getCurrentTrack());
        });
      }
    });
    statusUnsubscribeRef.current = unsub;

    // Also check immediately in case _resumeAfterJsRestart already completed.
    const svc = backgroundAudioService.getCurrentTrack();
    if (svc && backgroundAudioService.getIsPlaying()) {
      setCurrentTrack(restoreTrack(svc));
      setIsPlaying(true);
      setPosition(backgroundAudioService.getPosition());
      setDuration(backgroundAudioService.getDuration());
    }

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
      }
      if (positionUpdateRef.current) {
        clearInterval(positionUpdateRef.current);
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

  // Position tracking - polls backgroundAudioService for updates
  const startPositionTracking = () => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
    }
    
    positionUpdateRef.current = setInterval(() => {
      if (!backgroundAudioService.getCurrentTrack()) return;
      try {
        const currentPosition = backgroundAudioService.getPosition();
        const currentDuration = backgroundAudioService.getDuration();
        const serviceIsPlaying = backgroundAudioService.getIsPlaying();

        if (currentDuration > 0) setDuration(currentDuration);
        if (currentPosition >= 0) setPosition(currentPosition);
        setIsPlaying(serviceIsPlaying);
      } catch (err) {
        console.error('Failed to get position from background service:', err);
      }
    }, 500); // Poll every 500ms for smoother updates
  };

  const stopPositionTracking = () => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
  };

  // Audio status handler (for expo-audio)
  const onPlaybackStatusUpdate = (status: any) => {
    if (playerRef.current && playerRef.current.isLoaded) {
      setDuration(Math.floor(playerRef.current.duration || 0)); // Already in seconds
      setPosition(Math.floor(playerRef.current.currentTime || 0)); // Already in seconds
      
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
          stopPositionTracking();
        }
      }
    } else if (status?.error) {
      console.error('Audio playback error:', status.error);
      setError(`Playback error: ${status.error}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const play = async (track: AudioTrack) => {
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
      
      // 3. Stop position tracking
      stopPositionTracking();
      
      // 4. Clear any existing status subscriptions
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
        incrementPlayCount(track.id);
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
      setCurrentTrack(normalizedTrack);
      setIsPlaying(true);
      setIsPaused(false);
      setPosition(0);
      setDuration(track.duration || 0);
      setIsLoading(false);

      // Use background audio service for background playback
      const backgroundTrack: BackgroundAudioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || track.creator?.username || 'Unknown Artist',
        url: audioUrl,
        artwork: track.cover_image_url,
        duration: track.duration,
        creatorId,
      };

      // Clean up old subscription before starting new one
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }

      // Subscribe to status updates from background audio service
      const unsubscribe = backgroundAudioService.onStatusUpdate((status) => {
        setPosition(status.position);
        if (status.duration > 0) {
          setDuration(status.duration);
          setIsLoading(false);
        }
        setIsPlaying(status.isPlaying);
      });

      backgroundAudioService.setOnTrackFinished(() => {
        handleTrackFinishedRef.current();
      });

      statusUnsubscribeRef.current = () => {
        unsubscribe();
        backgroundAudioService.clearOnTrackFinished();
      };

      // Start polling as fallback for position/duration
      startPositionTracking();

      // Increment play count immediately (optimistic)
      incrementPlayCount(track.id);

      // Kick off native audio in the background — don't await so that a hanging
      // TrackPlayer call (e.g. post-SIGABRT) never blocks the UI update above.
      backgroundAudioService.playTrack(backgroundTrack).catch((err) => {
        console.warn('Background audio service failed:', err);
      });

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
      stopPositionTracking();
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
      startPositionTracking();
      console.log('🎵 Resumed playback');
    } catch (err) {
      console.error('Failed to resume:', err);
      setError('Failed to resume playback');
    }
  };

  const stop = async () => {
    try {
      // Use background audio service
      await backgroundAudioService.stop('userStop');
      
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.seekTo(0);
        setIsPlaying(false);
        setIsPaused(false);
        setPosition(0);
        stopPositionTracking();
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
      stopPositionTracking();
    }
  };

  // Keep ref updated so any registered callback always invokes the latest version
  useEffect(() => {
    handleTrackFinishedRef.current = handleTrackFinished;
  });

  const incrementPlayCount = async (trackId: string) => {
    try {
      console.log('📊 Incrementing play count for track:', trackId);
      
      // Get current play count from database
      const { data: trackData, error: fetchError } = await supabase
        .from('audio_tracks')
        .select('play_count')
        .eq('id', trackId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current play count:', fetchError);
        return;
      }
      
      const currentPlayCount = trackData?.play_count || 0;
      const newPlayCount = currentPlayCount + 1;
      
      // Update play count in database
      const { error: updateError } = await supabase
        .from('audio_tracks')
        .update({ 
          play_count: newPlayCount 
        })
        .eq('id', trackId);
      
      if (updateError) {
        console.error('Error updating play count:', updateError);
        return;
      }
      
      // Update current track if it's the same track
      if (currentTrack && currentTrack.id === trackId) {
        updateCurrentTrack({ plays_count: newPlayCount });
      }
      
      console.log('✅ Play count updated:', newPlayCount);
      
    } catch (error) {
      console.error('❌ Error incrementing play count:', error);
    }
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
        stopPositionTracking();
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
      // Cycle: off → all → one → off
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
    console.log('Repeat mode cycled');
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
    incrementPlayCount,
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
