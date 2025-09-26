import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import type { AudioTrack } from '@soundbridge/types';

const { width, height } = Dimensions.get('window');

interface AudioPlayerScreenProps {
  navigation: any;
  route: any;
}

export default function AudioPlayerScreen({ navigation, route }: AudioPlayerScreenProps) {
  const { 
    currentTrack, 
    isPlaying, 
    position, 
    duration, 
    volume, 
    isShuffled, 
    isRepeat,
    queue,
    play,
    pause,
    resume,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    clearQueue
  } = useAudioPlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          // Close player
          closePlayer();
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Animate in when screen loads
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    // Start album rotation animation
    if (isPlaying) {
      startRotationAnimation();
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startRotationAnimation();
    } else {
      stopRotationAnimation();
    }
  }, [isPlaying]);

  const startRotationAnimation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRotationAnimation = () => {
    rotateAnim.stopAnimation();
  };

  const closePlayer = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleSeek = (position: number) => {
    const newTime = (position / width) * duration;
    seekTo(newTime);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Implement like functionality
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow functionality
  };

  const handleShare = () => {
    // TODO: Implement share functionality
  };

  const handleTipCreator = () => {
    // TODO: Navigate to tip creator screen
    navigation.navigate('CreatorProfile', { username: 'unknown' });
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.timeText}>{formatTime(position)}</Text>
      <TouchableOpacity 
        style={styles.progressBar}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          handleSeek(locationX);
        }}
      >
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(position / duration) * 100}%` }
            ]} 
          />
        </View>
      </TouchableOpacity>
      <Text style={styles.timeText}>{formatTime(duration)}</Text>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <TouchableOpacity 
        style={styles.controlButton}
        onPress={toggleShuffle}
      >
        <Ionicons 
          name="shuffle" 
          size={24} 
          color={isShuffled ? '#DC2626' : 'rgba(255, 255, 255, 0.6)'} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.controlButton}
        onPress={playPrevious}
      >
        <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.playButton}
        onPress={handlePlayPause}
      >
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          style={styles.playButtonGradient}
        >
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={32} 
            color="#FFFFFF" 
          />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.controlButton}
        onPress={playNext}
      >
        <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.controlButton}
        onPress={toggleRepeat}
      >
        <Ionicons 
          name={isRepeat ? 'repeat' : 'repeat-outline'} 
          size={24} 
          color={isRepeat ? '#DC2626' : 'rgba(255, 255, 255, 0.6)'} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderVolumeControl = () => (
    <View style={styles.volumeContainer}>
      <Ionicons name="volume-low" size={20} color="rgba(255, 255, 255, 0.6)" />
      <TouchableOpacity 
        style={styles.volumeBar}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          const newVolume = Math.max(0, Math.min(1, locationX / 200));
          setVolume(newVolume);
        }}
      >
        <View style={styles.volumeTrack}>
          <View 
            style={[
              styles.volumeFill, 
              { width: `${volume * 100}%` }
            ]} 
          />
        </View>
      </TouchableOpacity>
      <Ionicons name="volume-high" size={20} color="rgba(255, 255, 255, 0.6)" />
    </View>
  );

  const renderQueue = () => (
    <View style={styles.queueContainer}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>Up Next</Text>
        <TouchableOpacity onPress={() => setShowQueue(false)}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.queueList}>
        {queue.map((track, index) => (
          <TouchableOpacity
            key={track.id}
            style={[
              styles.queueItem,
              currentTrack?.id === track.id && styles.currentQueueItem
            ]}
            onPress={() => play(track)}
          >
            <Image 
              source={{ uri: track.cover_image_url || track.artwork_url || track.cover_art_url || 'https://via.placeholder.com/60' }}
              style={styles.queueItemImage}
            />
            <View style={styles.queueItemInfo}>
              <Text style={styles.queueItemTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.queueItemArtist} numberOfLines={1}>
                {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
              </Text>
            </View>
            {currentTrack?.id === track.id && (
              <Ionicons name="musical-notes" size={20} color="#DC2626" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (!currentTrack) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
        <Text style={styles.emptyText}>No track playing</Text>
        <TouchableOpacity style={styles.closeButton} onPress={closePlayer}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#1A0A0A', '#2D1B1B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={closePlayer}>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity onPress={() => setShowQueue(true)}>
          <Ionicons name="list" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.albumContainer}>
        <Animated.View
          style={[
            styles.albumArtContainer,
            { transform: [{ rotate: rotateInterpolate }] }
          ]}
        >
          <Image 
            source={{ uri: currentTrack.cover_image_url || currentTrack.artwork_url || currentTrack.cover_art_url || 'https://via.placeholder.com/300' }}
            style={styles.albumArt}
          />
          <View style={styles.albumArtOverlay} />
        </Animated.View>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.creator?.display_name || currentTrack.creator?.username || 'Unknown Artist'}
        </Text>
        <Text style={styles.trackCreator} numberOfLines={1}>
          @{currentTrack.creator?.username || 'unknown'}
        </Text>
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Controls */}
      {renderControls()}

      {/* Volume Control */}
      {renderVolumeControl()}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isLiked ? '#DC2626' : 'rgba(255, 255, 255, 0.6)'} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleTipCreator}>
          <Ionicons name="cash-outline" size={24} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFollow}>
          <Ionicons 
            name={isFollowing ? 'person-remove' : 'person-add'} 
            size={24} 
            color={isFollowing ? '#DC2626' : 'rgba(255, 255, 255, 0.6)'} 
          />
        </TouchableOpacity>
      </View>

      {/* Queue Modal */}
      {showQueue && renderQueue()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  albumContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  albumArtContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  albumArt: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.7) / 2,
  },
  albumArtOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  trackCreator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 16,
    height: 20,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  controlButton: {
    padding: 16,
  },
  playButton: {
    marginHorizontal: 20,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  volumeBar: {
    flex: 1,
    height: 20,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#EC4899',
    borderRadius: 1.5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  actionButton: {
    padding: 12,
  },
  queueContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.6,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  queueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  queueList: {
    maxHeight: height * 0.5,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  currentQueueItem: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  queueItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  queueItemArtist: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});