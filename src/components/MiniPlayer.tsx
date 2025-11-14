import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    pause,
    resume,
    playNext,
  } = useAudioPlayer();

  const navigation = useNavigation();
  const { theme } = useTheme();

  const currentRouteName = useNavigationState((state) => {
    if (!state || !state.routes) return null;
    const route = state.routes[state.index];
    return route?.name;
  });

  if (!currentTrack || currentRouteName === 'AudioPlayer') {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else resume();
  };

  const handleExpand = () => {
    navigation.navigate('AudioPlayer' as never);
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const isDark = theme.isDark;
  // Web app glassmorphism colors
  const glassGradientColors = isDark
    ? ['rgba(86, 28, 133, 0.25)', 'rgba(37, 25, 70, 0.35)'] // #561C85 and #251946
    : ['rgba(255, 255, 255, 0.87)', 'rgba(255, 255, 255, 0.55)'];
  const fallbackBackground = isDark ? 'rgba(37, 25, 70, 0.7)' : 'rgba(255, 255, 255, 0.65)'; // #251946
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(148, 163, 184, 0.35)';
  const titleColor = isDark ? '#FFFFFF' : '#0F172A';
  const artistColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.7)';
  const primaryControlColor = isDark ? '#FFFFFF' : '#111827';

  return (
    <View style={styles.container}>
      <ExpoBlurView
        intensity={isDark ? 90 : 55}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          {
            backgroundColor: fallbackBackground,
            borderColor,
            shadowColor: isDark ? '#000' : '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
          },
        ]}
      >
        <LinearGradient
          colors={glassGradientColors}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View
          style={[
            styles.progressContainer,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercentage}%`,
                backgroundColor: isDark ? theme.colors.primary : '#FF375F',
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.trackInfo} onPress={handleExpand}>
            <View style={styles.coverContainer}>
              {(currentTrack.cover_image_url || currentTrack.cover_art_url || currentTrack.artwork_url) ? (
                <Image
                  source={{
                    uri:
                      currentTrack.cover_image_url ||
                      currentTrack.cover_art_url ||
                      currentTrack.artwork_url,
                  }}
                  style={[
                    styles.coverImage,
                    { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)' },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.defaultCover,
                    { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.16)' },
                  ]}
                >
                  <Ionicons name="musical-notes" size={18} color={isDark ? '#CBD5F5' : '#475569'} />
                </View>
              )}
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={[styles.artist, { color: artistColor }]} numberOfLines={1}>
                {currentTrack.creator?.display_name || currentTrack.creator?.username || 'Unknown Artist'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={primaryControlColor} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={playNext}>
              <Ionicons name="play-skip-forward" size={20} color={primaryControlColor} />
            </TouchableOpacity>
          </View>
        </View>
      </ExpoBlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  blurContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
  },
  progressContainer: {
    height: 2,
  },
  progressBar: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 72,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverContainer: {
    marginRight: 16,
  },
  coverImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  defaultCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    padding: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

