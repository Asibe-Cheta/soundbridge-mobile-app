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

const { width } = Dimensions.get('window');

export default function MiniPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    position, 
    duration, 
    play,
    pause,
    resume,
    playNext
  } = useAudioPlayer();
  
  const navigation = useNavigation();
  
  // Hide mini player when AudioPlayer screen is active
  const currentRouteName = useNavigationState(state => {
    if (!state || !state.routes) return null;
    const route = state.routes[state.index];
    return route.name;
  });

  if (!currentTrack) {
    return null; // Don't show mini player if no track is playing
  }
  
  // Hide mini player when full AudioPlayerScreen is open
  if (currentRouteName === 'AudioPlayer') {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleExpand = () => {
    navigation.navigate('AudioPlayer' as never);
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <ExpoBlurView intensity={100} style={styles.blurContainer}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
        
        <View style={styles.content}>
          {/* Track info and cover art */}
          <TouchableOpacity style={styles.trackInfo} onPress={handleExpand}>
            <View style={styles.coverContainer}>
              {(currentTrack.cover_image_url || currentTrack.cover_art_url || currentTrack.artwork_url) ? (
                <Image 
                  source={{ uri: currentTrack.cover_image_url || currentTrack.cover_art_url || currentTrack.artwork_url }} 
                  style={styles.coverImage} 
                />
              ) : (
                <View style={styles.defaultCover}>
                  <Ionicons name="musical-notes" size={18} color="#999" />
                </View>
              )}
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.creator?.display_name || currentTrack.creator?.username || 'Unknown Artist'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause}>
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={playNext}>
              <Ionicons name="play-skip-forward" size={20} color="#FFFFFF" />
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
    bottom: 100, // Position well above tab bar with padding
    left: 8,
    right: 8,
    zIndex: 1000,
  },
  blurContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Fallback for blur
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF375F', // Apple Music red
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 68,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverContainer: {
    marginRight: 14,
  },
  coverImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  defaultCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 10,
    marginHorizontal: 2,
  },
});
