import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { backgroundAudioService, BackgroundAudioTrack } from '../services/BackgroundAudioService';
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
  moderation_status?: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed';
}

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
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
  
  const playerRef = useRef<AudioPlayer | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize audio session - let BackgroundAudioService handle background config
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Use basic audio mode, BackgroundAudioService will handle background playback
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionModeAndroid: 'duckOthers',
          interruptionMode: 'mixWithOthers',
        });
        console.log('✅ Audio session configured');
      } catch (err) {
        console.error('Failed to setup audio session:', err);
        setError('Failed to setup audio session');
      }
    };
    
    setupAudio();
    
    return () => {
      // Cleanup on unmount
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

  // Position tracking - polls backgroundAudioService for updates
  const startPositionTracking = () => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
    }
    
    positionUpdateRef.current = setInterval(async () => {
      if (isPlaying || isPaused) {
        try {
          // Get position and duration from backgroundAudioService
          const currentPosition = backgroundAudioService.getPosition();
          const currentDuration = backgroundAudioService.getDuration();
          const serviceIsPlaying = backgroundAudioService.getIsPlaying();
          
          // Update state if values are valid
          if (currentDuration > 0) {
            setDuration(currentDuration);
          }
          if (currentPosition >= 0) {
            setPosition(currentPosition);
          }
          setIsPlaying(serviceIsPlaying);
        } catch (err) {
          console.error('Failed to get position from background service:', err);
        }
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
      // PHASE 2: Moderation Playability Check
      // Block playback for tracks that are flagged, rejected, or appealed
      const unplayableStatuses = ['flagged', 'rejected', 'appealed'];
      const moderationStatus = (track as any).moderation_status;
      
      if (moderationStatus && unplayableStatuses.includes(moderationStatus)) {
        const errorMessage = getModerationErrorMessage(moderationStatus);
        setError(errorMessage);
        setIsLoading(false);
        
        // Show user-friendly alert
        Alert.alert('Track Unavailable', errorMessage, [{ text: 'OK' }]);
        return; // Exit early without throwing
      }
      
      setIsLoading(true);
      setError(null);
      
      console.log('🛑 Stopping any currently playing track before starting new one...');
      
      // IMPORTANT: Stop ALL audio sources before starting new track
      // 1. Stop background audio service first (this is the main player)
      try {
        await backgroundAudioService.stop();
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
      
      // Use background audio service for background playback
      const backgroundTrack: BackgroundAudioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || track.creator?.username || 'Unknown Artist',
        url: audioUrl,
        artwork: track.cover_image_url,
        duration: track.duration,
      };

      await backgroundAudioService.playTrack(backgroundTrack);
      
      // Clean up old subscription if any
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }
      
      // Subscribe to status updates from background audio service
      const unsubscribe = backgroundAudioService.onStatusUpdate((status) => {
        // Position and duration are already in seconds
        setPosition(status.position);
        if (status.duration > 0) {
          setDuration(status.duration);
          setIsLoading(false);
        }
        // Update isPlaying state from status
        setIsPlaying(status.isPlaying);
        
        // Check if track finished (position reached duration)
        if (status.duration > 0 && status.position >= status.duration - 0.5 && !status.isPlaying) {
          handleTrackFinished();
        }
      });
      
      // Set up track finished handler (with error handling)
      // Note: This is optional - track finished is also handled via status updates
      try {
        // Check if method exists before calling
        if (backgroundAudioService && 'setOnTrackFinished' in backgroundAudioService) {
          const setOnTrackFinished = (backgroundAudioService as any).setOnTrackFinished;
          if (typeof setOnTrackFinished === 'function') {
            setOnTrackFinished(() => {
              handleTrackFinished();
            });
          }
        }
      } catch (error) {
        // Silently fail - track finished is handled via status updates anyway
        console.warn('setOnTrackFinished not available (this is OK):', error);
      }
      
      // Store unsubscribe function for cleanup
      statusUnsubscribeRef.current = () => {
        unsubscribe();
        try {
          // Check if method exists before calling
          if (backgroundAudioService && 'clearOnTrackFinished' in backgroundAudioService) {
            const clearOnTrackFinished = (backgroundAudioService as any).clearOnTrackFinished;
            if (typeof clearOnTrackFinished === 'function') {
              clearOnTrackFinished();
            }
          }
        } catch (error) {
          // Silently fail - not critical
          console.warn('clearOnTrackFinished not available (this is OK):', error);
        }
      };
      
      // Update context state IMMEDIATELY to ensure UI updates
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsPaused(false);
      setPosition(0);
      setDuration(track.duration || 0);
      
      // Start polling for position updates as fallback
      startPositionTracking();
      
      // Increment play count in database
      incrementPlayCount(track.id);
      
      console.log('🎵 Successfully started playing with background audio service');
      return;
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(`Failed to play track: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const pause = async () => {
    try {
      // Use background audio service
      await backgroundAudioService.pause();
      
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
      await backgroundAudioService.stop();
      
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
    if (repeatMode === 'one' && currentTrack) {
      // Repeat current track
      await play(currentTrack);
    } else if (repeatMode === 'all' || (autoPlay && queue.length > 0)) {
      // Play next track in queue
      await playNext();
    } else {
      // Stop playback
      setIsPlaying(false);
      setIsPaused(false);
      stopPositionTracking();
    }
  };

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
      nextIndex = (currentIndex + 1) % queue.length;
    }
    
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await play(nextTrack);
    }
  };

  const playPrevious = async () => {
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
