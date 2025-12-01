import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface PostAudioPlayerProps {
  audioUrl: string;
  title?: string;
  duration?: number; // in seconds
}

export default function PostAudioPlayer({ audioUrl, title = 'Audio Preview', duration }: PostAudioPlayerProps) {
  const { theme } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [error, setError] = useState<string | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [sound]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startPositionTracking = async () => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
    }

    positionUpdateInterval.current = setInterval(async () => {
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            if (status.durationMillis) {
              setAudioDuration(status.durationMillis / 1000);
            }
            
            // Auto-stop when finished
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              if (positionUpdateInterval.current) {
                clearInterval(positionUpdateInterval.current);
              }
            }
          }
        } catch (err) {
          console.error('Error getting playback status:', err);
        }
      }
    }, 500);
  };

  const handlePlayPause = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!sound) {
        // Load and play
        setIsLoading(true);
        setError(null);

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          {
            shouldPlay: true,
            isLooping: false,
            volume: 1.0,
            progressUpdateIntervalMillis: 500,
          }
        );

        setSound(newSound);
        setIsPlaying(true);
        setIsLoading(false);

        // Get duration
        const status = await newSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setAudioDuration(status.durationMillis / 1000);
        }

        // Start position tracking
        await startPositionTracking();

        // Listen for playback status updates
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            if (status.durationMillis) {
              setAudioDuration(status.durationMillis / 1000);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              if (positionUpdateInterval.current) {
                clearInterval(positionUpdateInterval.current);
              }
            }
          }
        });
      } else {
        // Toggle play/pause
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            if (positionUpdateInterval.current) {
              clearInterval(positionUpdateInterval.current);
            }
          } else {
            // If audio finished (position at end), reset to start before playing
            if (status.didJustFinish || (status.positionMillis && status.durationMillis && status.positionMillis >= status.durationMillis - 100)) {
              await sound.setPositionAsync(0);
              setPosition(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
            await startPositionTracking();
          }
        }
      }
    } catch (err: any) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleSeek = async (seekPosition: number) => {
    if (sound && seekPosition >= 0 && seekPosition <= audioDuration) {
      try {
        await sound.setPositionAsync(seekPosition * 1000);
        setPosition(seekPosition);
      } catch (err) {
        console.error('Error seeking:', err);
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark 
            ? 'rgba(124, 58, 237, 0.1)' 
            : 'rgba(124, 58, 237, 0.05)',
          borderColor: theme.isDark 
            ? 'rgba(124, 58, 237, 0.2)' 
            : 'rgba(124, 58, 237, 0.15)',
        },
      ]}
    >
      <Ionicons 
        name="musical-notes" 
        size={24} 
        color={theme.isDark ? '#A78BFA' : '#7C3AED'} 
      />
      
      <View style={styles.audioInfo}>
        <Text style={[styles.audioTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${audioDuration > 0 ? (position / audioDuration) * 100 : 0}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
            {formatTime(position)} / {formatTime(audioDuration)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={isLoading}
        style={styles.playButton}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={32}
            color={theme.colors.primary}
          />
        )}
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
  },
  playButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
});

