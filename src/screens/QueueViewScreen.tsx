import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import MiniPlayer from '../components/MiniPlayer';

const { width, height } = Dimensions.get('window');

export default function QueueViewScreen() {
  const { queue, currentTrack, play } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const formatTime = (timeInSeconds?: number) => {
    if (!timeInSeconds || timeInSeconds === 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    
    return (
      <TouchableOpacity
          style={[
          styles.trackItem,
          {
            backgroundColor: isCurrentTrack
              ? theme.isDark
                ? 'rgba(220, 38, 38, 0.3)' // Red/pink highlight matching reference
                : 'rgba(220, 38, 38, 0.2)'
              : 'transparent',
            borderRadius: 12,
          },
        ]}
        onPress={() => play(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri:
              item.cover_image_url ||
              item.cover_art_url ||
              item.artwork_url ||
              'https://via.placeholder.com/60',
          }}
          style={styles.trackImage}
        />
        <View style={styles.trackInfo}>
        <Text
          style={[
            styles.trackTitle,
            { 
              color: isCurrentTrack 
                ? '#DC2626' // Red text for current track (matching reference)
                : theme.colors.text 
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.trackArtist, 
            { 
              color: isCurrentTrack 
                ? '#DC2626' // Red text for current track artist
                : theme.colors.textSecondary 
            }
          ]}
          numberOfLines={1}
        >
          {item.creator?.display_name || item.creator?.username || 'Unknown Artist'}
        </Text>
        </View>
        <Text 
          style={[
            styles.trackDuration, 
            { color: isCurrentTrack ? '#DC2626' : theme.colors.textSecondary }
          ]}
        >
          {formatTime(item.duration)}
        </Text>
        {isCurrentTrack && (
          <Ionicons name="musical-notes" size={20} color="#DC2626" />
        )}
      </TouchableOpacity>
    );
  };

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
            ? ['#1a0f2e', '#2d1b4e', '#1a0f2e'] // Dark purple gradient
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
        <TouchableOpacity onPress={() => {/* TODO: Add menu */}} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      <FlatList
        data={queue}
        keyExtractor={(item, index) => `queue-${item.id}-${index}`}
        renderItem={renderTrackItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Queue
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="musical-notes-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Queue is empty
            </Text>
          </View>
        }
      />

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
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120, // Space for mini player
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: '400',
  },
  trackDuration: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
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

