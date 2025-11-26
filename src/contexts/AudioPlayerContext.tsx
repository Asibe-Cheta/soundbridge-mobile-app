import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
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
  isRepeat: boolean;
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
  const [isRepeat, setIsRepeat] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<AudioPlayer | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);

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
    };
  }, []);

  // Position tracking
  const startPositionTracking = () => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
    }
    
    positionUpdateRef.current = setInterval(async () => {
      if (playerRef.current && isPlaying) {
        try {
          // expo-audio uses currentTime property directly (in seconds)
          const currentTime = playerRef.current.currentTime;
          if (currentTime !== undefined) {
            setPosition(Math.floor(currentTime)); // Already in seconds
          }
        } catch (err) {
          console.error('Failed to get position:', err);
        }
      }
    }, 1000);
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
        // Track finished, handle based on repeat and auto-play settings
        if (isRepeat) {
          // Replay current track
          playerRef.current.seekTo(0);
          playerRef.current.play();
        } else if (autoPlay && queue.length > 0) {
          // Auto-play next track in queue
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
      setIsLoading(true);
      setError(null);
      
      // Stop current track if playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      
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
      
      // Update context state
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoading(false);
      
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
      // Validate position
      if (newPosition < 0 || newPosition > duration) {
        console.warn('🎵 Invalid seek position:', newPosition, 'Duration:', duration);
        return;
      }
      
      // Use background audio service
      await backgroundAudioService.seekTo(newPosition * 1000); // Convert to milliseconds
      
      if (playerRef.current && isPlaying !== undefined) {
        // Add a small delay to prevent rapid seeking
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (playerRef.current.isLoaded) {
          await playerRef.current.seekTo(newPosition); // expo-audio expects seconds
          setPosition(newPosition);
          console.log('🎵 Successfully seeked to:', newPosition);
        } else {
          console.warn('🎵 Audio not loaded, cannot seek');
        }
      }
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
    setIsRepeat(prev => !prev);
    console.log('Repeat toggled:', !isRepeat);
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
    isRepeat,
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
