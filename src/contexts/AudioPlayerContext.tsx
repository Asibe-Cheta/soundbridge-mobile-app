import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { supabase } from '../lib/supabase';
import { realAudioProcessor } from '../services/RealAudioProcessor';

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
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio session
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.error('Failed to setup audio session:', err);
        setError('Failed to setup audio session');
      }
    };
    
    setupAudio();
    
    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
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
      if (soundRef.current && isPlaying) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            setPosition(Math.floor(status.positionMillis / 1000)); // Convert milliseconds to seconds
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

  // Audio status handler
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setDuration(Math.floor((status.durationMillis || 0) / 1000)); // Convert milliseconds to seconds
      setPosition(Math.floor((status.positionMillis || 0) / 1000)); // Convert milliseconds to seconds
      
      if (status.didJustFinish && !status.isLooping) {
        // Track finished, handle based on repeat and auto-play settings
        if (isRepeat) {
          // Replay current track
          soundRef.current?.replayAsync();
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
    } else if (status.error) {
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
      const audioProcessorSuccess = await realAudioProcessor.playTrackWithEnhancement({
        id: track.id,
        title: track.title,
        url: audioUrl,
        artist: track.creator?.display_name || track.creator?.username || 'Unknown Artist',
        artwork: track.cover_image_url,
        duration: track.duration,
      });

      if (audioProcessorSuccess) {
        console.log('✅ Using real audio processor for enhanced playback');
        setCurrentTrack(track);
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
        return;
      }

      console.log('⚠️ Real audio processor failed, falling back to Expo AV');
      
      // Test URL accessibility and try different URL approaches
      let finalAudioUrl = audioUrl;
      let urlTestFailed = false;
      
      try {
        const session = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          'User-Agent': 'SoundBridge-Mobile/1.0',
        };
        
        // Add authorization header if we have a session
        if (session.data.session?.access_token) {
          headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
        }
        
        const response = await fetch(audioUrl, { 
          method: 'HEAD', 
          headers,
          timeout: 5000 
        });
        
        console.log(`🔗 URL test for ${audioUrl}: ${response.status}`);
        
        if (!response.ok) {
          console.warn(`Audio file returned status ${response.status}, response: ${response.statusText}`);
          urlTestFailed = true;
          
          // For 400 errors, try signed URL approach
          if (response.status === 400) {
            console.log('🔄 Trying signed URL approach for 400 error...');
            
            // Extract the path from the public URL
            const urlParts = audioUrl.split('/storage/v1/object/public/audio-tracks/');
            if (urlParts.length === 2) {
              const filePath = urlParts[1];
              const { data: signedUrlData } = await supabase.storage
                .from('audio-tracks')
                .createSignedUrl(filePath, 3600); // 1 hour expiry
              
              if (signedUrlData?.signedUrl) {
                finalAudioUrl = signedUrlData.signedUrl;
                console.log('🔄 Using signed URL:', finalAudioUrl);
                urlTestFailed = false; // Reset since we have a new URL to try
              }
            }
          }
        }
      } catch (fetchError) {
        console.error('URL accessibility test failed:', fetchError);
        urlTestFailed = true;
      }
      
      // If all URL approaches failed, throw an error
      if (urlTestFailed && finalAudioUrl === audioUrl) {
        throw new Error(`Audio file is not accessible: ${audioUrl}`);
      }
      
      // Create new sound with more robust settings and timeout
      const soundPromise = Audio.Sound.createAsync(
        { 
          uri: finalAudioUrl,
          headers: {
            'User-Agent': 'SoundBridge-Mobile/1.0',
          }
        },
        { 
          shouldPlay: true,
          volume: volume,
          progressUpdateIntervalMillis: 1000,
          positionMillis: 0,
        },
        onPlaybackStatusUpdate
      );

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Audio loading timeout after 10 seconds')), 10000)
      );

      const { sound } = await Promise.race([soundPromise, timeoutPromise]) as any;
      
      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsPaused(false);
      setPosition(0);
      setIsLoading(false);
      
      // Start tracking position
      startPositionTracking();
      
      console.log('🎵 Successfully started playing:', track.title);
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(`Failed to play track: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const pause = async () => {
    try {
      // Try real audio processor first
      await realAudioProcessor.pausePlayback();
      
      // Also pause Expo AV if it's being used
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
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
      // Try real audio processor first
      await realAudioProcessor.resumePlayback();
      
      // Also resume Expo AV if it's being used
      if (soundRef.current) {
        await soundRef.current.playAsync();
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
      if (soundRef.current) {
        await soundRef.current.stopAsync();
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
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(newPosition);
        setPosition(newPosition);
        console.log('🎵 Seeked to:', newPosition);
      }
    } catch (err) {
      console.error('Failed to seek:', err);
      setError('Failed to seek to position');
    }
  };

  const setVolume = async (newVolume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolumeState(clampedVolume);
      
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(clampedVolume);
      }
      
      console.log('🎵 Volume set to:', clampedVolume);
    } catch (err) {
      console.error('Failed to set volume:', err);
      setError('Failed to set volume');
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
