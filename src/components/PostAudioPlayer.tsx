import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { SB_STOP_FEED_TEASERS } from '../lib/audioEvents';
import { backgroundAudioService } from '../services/BackgroundAudioService';
import { isExpoAvBypassedForBgTest } from '../config/audioBgIsolationTest';

const PILL_HEIGHT = 52;
const TEASER_MAX_SECONDS = 60;

interface PostAudioPlayerProps {
  audioUrl: string;
  title?: string;
  duration?: number;
}

/** Feed teaser — disabled during expo-av BG isolation test on iOS. */
export default function PostAudioPlayer({ audioUrl, title = 'Teaser', duration }: PostAudioPlayerProps) {
  if (isExpoAvBypassedForBgTest()) {
    return null;
  }

  const { theme } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  // Cap display duration at TEASER_MAX_SECONDS so the progress bar and time reflect the playable clip
  const [audioDuration, setAudioDuration] = useState(duration ? Math.min(duration, TEASER_MAX_SECONDS) : 0);
  const [error, setError] = useState<string | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme.isDark;

  const unloadTeaser = async () => {
    if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
    }
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SB_STOP_FEED_TEASERS, () => {
      unloadTeaser();
    });
    return () => sub.remove();
  }, [sound]);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync().catch(console.error);
      if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
      // iOS: TrackPlayer owns AVAudioSession — expo-av setAudioModeAsync disrupts background playback.
      if (Platform.OS === 'ios') return;
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    };
  }, [sound]);

  // iOS: unload feed teasers when app backgrounds so expo-av doesn't fight TrackPlayer's session.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (sound) {
          sound.stopAsync().catch(() => {});
          sound.unloadAsync().catch(() => {});
          setSound(null);
          setIsPlaying(false);
          setPosition(0);
          if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
        }
      }
    });
    return () => sub.remove();
  }, [sound]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startPositionTracking = async () => {
    if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
    positionUpdateInterval.current = setInterval(async () => {
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const pos = status.positionMillis / 1000;
          if (status.durationMillis) setAudioDuration(Math.min(status.durationMillis / 1000, TEASER_MAX_SECONDS));
          if (pos >= TEASER_MAX_SECONDS) {
            await sound.pauseAsync();
            await sound.setPositionAsync(0);
            setIsPlaying(false);
            setPosition(0);
            if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
            return;
          }
          setPosition(pos);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
          }
        }
      } catch {}
    }, 500);
  };

  const handlePlayPause = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Main player owns the shared iOS AVAudioSession — never start a teaser over it.
      if (backgroundAudioService.getCurrentTrack() || backgroundAudioService.getIsPlaying()) {
        return;
      }

      if (!sound) {
        setIsLoading(true);
        setError(null);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          // Must be true on iOS: expo-av and TrackPlayer share the same AVAudioSession.
          // Setting false causes iOS to call setActive(false) on backgrounding, which
          // deactivates the session and kills TrackPlayer's background audio.
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, isLooping: false, volume: 1.0, progressUpdateIntervalMillis: 500 }
        );
        setSound(newSound);
        setIsPlaying(true);
        setIsLoading(false);
        const status = await newSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) setAudioDuration(Math.min(status.durationMillis / 1000, TEASER_MAX_SECONDS));
        await startPositionTracking();
        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded) {
            const pos = status.positionMillis / 1000;
            if (status.durationMillis) setAudioDuration(Math.min(status.durationMillis / 1000, TEASER_MAX_SECONDS));
            if (pos >= TEASER_MAX_SECONDS) {
              await newSound.pauseAsync().catch(() => {});
              await newSound.setPositionAsync(0).catch(() => {});
              setIsPlaying(false);
              setPosition(0);
              if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
              return;
            }
            setPosition(pos);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
            }
          }
        });
      } else {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            if (positionUpdateInterval.current) clearInterval(positionUpdateInterval.current);
          } else {
            if (
              status.didJustFinish ||
              (status.positionMillis && status.durationMillis &&
               status.positionMillis >= status.durationMillis - 100)
            ) {
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

  const progressPct = audioDuration > 0 ? (position / audioDuration) * 100 : 0;

  return (
    <View style={[styles.outerPill, { height: PILL_HEIGHT }]}>
      {/* Dark cinematic glass surface */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 28 : 0}
        tint="dark"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: Platform.OS === 'android'
              ? 'rgba(12,6,30,0.85)'
              : 'transparent',
          },
        ]}
      />

      {/* Dark overlay for depth */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(8,4,20,0.35)' }]} />

      {/* Subtle top sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'transparent']}
        style={[StyleSheet.absoluteFillObject, { height: PILL_HEIGHT * 0.4 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Progress bar — red */}
      <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon bubble — red tint */}
        <View style={[styles.iconBubble, { backgroundColor: 'rgba(220,38,38,0.18)' }]}>
          <Ionicons name="musical-notes" size={15} color="#DC2626" />
        </View>

        {/* Label + time */}
        <View style={styles.textStack}>
          <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.45)' }]}>
            {formatTime(position)} / {formatTime(audioDuration)}
          </Text>
        </View>

        {/* Play button — red→pink gradient */}
        <TouchableOpacity
          onPress={handlePlayPause}
          disabled={isLoading}
          style={styles.playButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={16}
                color="#FFFFFF"
                style={isPlaying ? undefined : { marginLeft: 2 }}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerPill: {
    borderRadius: PILL_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 2,
    gap: 10,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStack: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
