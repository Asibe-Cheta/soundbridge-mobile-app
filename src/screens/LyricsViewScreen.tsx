import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import MiniPlayer from '../components/MiniPlayer';

const { width, height } = Dimensions.get('window');

export default function LyricsViewScreen() {
  const { currentTrack, position, duration } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [lyrics, setLyrics] = useState<string>('');
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const lineRefs = useRef<{ [key: number]: View }>({});

  useEffect(() => {
    if (currentTrack?.lyrics) {
      setLyrics(currentTrack.lyrics);
    } else if (currentTrack?.has_lyrics) {
      // Try to fetch lyrics from database if has_lyrics is true but lyrics not loaded
      loadLyricsFromDatabase();
    }
  }, [currentTrack]);

  const loadLyricsFromDatabase = async () => {
    if (!currentTrack?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('lyrics')
        .eq('id', currentTrack.id)
        .single();
      
      if (!error && data?.lyrics) {
        setLyrics(data.lyrics);
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  // Split lyrics into lines
  const lyricsLines = lyrics
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim());

  // Simulate highlighting current line based on position
  // In a real implementation, you'd sync this with the audio playback
  useEffect(() => {
    if (lyricsLines.length > 0 && duration > 0) {
      // Simple calculation - in real app, you'd have timing data for each line
      const progress = position / duration;
      const estimatedLineIndex = Math.floor(progress * lyricsLines.length);
      setCurrentLineIndex(Math.min(estimatedLineIndex, lyricsLines.length - 1));
    }
  }, [position, duration, lyricsLines.length]);

  // Scroll to current line
  useEffect(() => {
    if (lineRefs.current[currentLineIndex] && scrollViewRef.current) {
      lineRefs.current[currentLineIndex]?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset to center the line
            animated: true,
          });
        },
        () => {}
      );
    }
  }, [currentLineIndex]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Purple gradient background matching reference */}
      <LinearGradient
        colors={
          theme.isDark
            ? ['#1a0f2e', '#2d1b4e', '#1a0f2e'] // Dark purple gradient like reference
            : ['#f3e8ff', '#e9d5ff', '#f3e8ff'] // Light purple gradient
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.colors.textSecondary }]} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Lyrics Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lyricsLines.length > 0 ? (
          lyricsLines.map((line, index) => {
            const isActive = index === currentLineIndex;
            return (
              <View
                key={index}
                ref={(ref) => {
                  if (ref) lineRefs.current[index] = ref;
                }}
                style={styles.lyricsLineContainer}
              >
                <Text
                  style={[
                    styles.lyricsLine,
                    {
                      color: isActive 
                        ? (theme.isDark ? '#60A5FA' : '#3B82F6') // Bright blue/light blue for active line
                        : (theme.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'), // White text for inactive
                      fontSize: isActive ? 22 : 18,
                      fontWeight: isActive ? '700' : '400',
                      opacity: isActive ? 1 : (theme.isDark ? 0.85 : 0.7),
                      lineHeight: isActive ? 36 : 28,
                    },
                  ]}
                >
                  {line}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubble-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No lyrics available
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Mini Player at Bottom */}
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: height,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerHandle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120, // Space for mini player
  },
  lyricsLineContainer: {
    marginBottom: 20,
    minHeight: 36,
    paddingVertical: 4,
  },
  lyricsLine: {
    textAlign: 'left',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

