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
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
// import type { AudioTrack } from '@soundbridge/types'; // Commented out - using local type

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
    updateCurrentTrack,
    toggleShuffle,
    toggleRepeat,
    clearQueue
  } = useAudioPlayer();
  
  const { user } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isProgressPressed, setIsProgressPressed] = useState(false);
  const [isVolumePressed, setIsVolumePressed] = useState(false);

  // Reset like status when track changes (simplified approach)
  useEffect(() => {
    setIsLiked(false);
  }, [currentTrack]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
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

  }, []);


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

  const handleLike = async () => {
    if (!currentTrack || !user) {
      Alert.alert('Authentication Required', 'Please sign in to like tracks.');
      return;
    }
    
    const originalLikeStatus = isLiked;
    const newLikeStatus = !originalLikeStatus;
    
    try {
      setIsLiked(newLikeStatus);
      
      // Update likes count in audio_tracks table only
      // This is a safer approach that doesn't rely on a likes table that might not exist
      const likeIncrement = newLikeStatus ? 1 : -1;
      const newLikesCount = Math.max(0, (currentTrack.likes_count || 0) + likeIncrement);
      
      const { error: updateError } = await supabase
        .from('audio_tracks')
        .update({ 
          likes_count: newLikesCount 
        })
        .eq('id', currentTrack.id);
      
      if (updateError) {
        console.error('Error updating likes count:', updateError);
        // Revert the like status if database update failed
        setIsLiked(originalLikeStatus);
        Alert.alert('Error', 'Failed to update likes count. Please try again.');
        return;
      }
      
      // Update the current track in the context with the new likes count
      updateCurrentTrack({ likes_count: newLikesCount });
      
      console.log(`${newLikeStatus ? 'Liked' : 'Unliked'} track:`, currentTrack.title);
      console.log('New likes count:', newLikesCount);
      
    } catch (error) {
      console.error('Error liking track:', error);
      // Revert the like status if there was an error
      setIsLiked(originalLikeStatus);
      Alert.alert('Error', 'Unable to like this track. Please try again.');
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow functionality
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    
    try {
      const shareUrl = `https://soundbridge.live/track/${currentTrack.id}`;
      const message = `🎵 Check out "${currentTrack.title}" by ${currentTrack.creator?.display_name || 'Unknown Artist'} on SoundBridge!\n\n${shareUrl}`;
      
      await Share.share({
        message: message,
        url: shareUrl,
        title: `${currentTrack.title} - SoundBridge`,
      });
    } catch (error) {
      console.error('Error sharing track:', error);
      Alert.alert('Share Failed', 'Unable to share this track. Please try again.');
    }
  };

  const handleTipCreator = () => {
    if (!currentTrack?.creator?.id) {
      Alert.alert('Error', 'Creator information not available');
      return;
    }
    
    navigation.navigate('CreatorProfile', { 
      creatorId: currentTrack.creator.id,
      creator: currentTrack.creator 
    });
  };

  const handleFastForward = async () => {
    const newPosition = Math.min(position + 15, duration);
    await seekTo(newPosition);
  };

  const handleRewind = async () => {
    const newPosition = Math.max(position - 15, 0);
    await seekTo(newPosition);
  };

  const handleAlbumArtTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const tapX = Math.random() * width; // For simplicity, we'll use random side
      if (tapX < width / 2) {
        handleRewind();
      } else {
        handleFastForward();
      }
    } else {
      setLastTap(now);
    }
  };


  // Progress bar pan responder for dragging
  const progressPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // User started touching - seek immediately and magnify
        setIsProgressPressed(true);
        const locationX = evt.nativeEvent.locationX;
        const progressBarWidth = width - 112; // Account for padding and time labels
        const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
        const newPosition = percentage * duration;
        seekTo(newPosition);
      },
      onPanResponderMove: (evt, gestureState) => {
        // User is dragging - update position
        const locationX = Math.max(0, gestureState.moveX - 76); // Account for left padding
        const progressBarWidth = width - 112;
        const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
        const newPosition = percentage * duration;
        seekTo(newPosition);
      },
      onPanResponderRelease: () => {
        // User stopped dragging - return to normal size
        setIsProgressPressed(false);
      },
    })
  ).current;

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.timeText}>{formatTime(position)}</Text>
      <View 
        style={[
          styles.progressBar,
          isProgressPressed && styles.progressBarPressed
        ]}
        {...progressPanResponder.panHandlers}
      >
        <View style={[
          styles.progressTrack,
          isProgressPressed && styles.progressTrackPressed
        ]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(position / duration) * 100}%` }
            ]} 
          />
        </View>
      </View>
      <Text style={styles.timeText}>{formatTime(duration)}</Text>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      {/* Main row: Skip, Rewind, Play, Forward, Skip */}
      <View style={styles.controlsMainRow}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={playPrevious}
        >
          <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleRewind}
        >
          <Ionicons name="play-back" size={28} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15s</Text>
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
          onPress={handleFastForward}
        >
          <Ionicons name="play-forward" size={28} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15s</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={playNext}
        >
          <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Volume control pan responder for dragging
  const volumePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // User started touching - set volume immediately and magnify
        setIsVolumePressed(true);
        const locationX = evt.nativeEvent.locationX;
        const volumeBarWidth = width - 152; // Account for padding and icons
        const newVolume = Math.max(0, Math.min(1, locationX / volumeBarWidth));
        setVolume(newVolume);
      },
      onPanResponderMove: (evt, gestureState) => {
        // User is dragging - update volume
        const locationX = Math.max(0, gestureState.moveX - 76); // Account for left padding
        const volumeBarWidth = width - 152;
        const newVolume = Math.max(0, Math.min(1, locationX / volumeBarWidth));
        setVolume(newVolume);
      },
      onPanResponderRelease: () => {
        // User stopped dragging - return to normal size
        setIsVolumePressed(false);
      },
    })
  ).current;

  const renderVolumeControl = () => (
    <View style={styles.volumeContainer}>
      <Ionicons name="volume-low" size={20} color="rgba(255, 255, 255, 0.6)" />
      <View 
        style={[
          styles.volumeBar,
          isVolumePressed && styles.volumeBarPressed
        ]}
        {...volumePanResponder.panHandlers}
      >
        <View style={[
          styles.volumeTrack,
          isVolumePressed && styles.volumeTrackPressed
        ]}>
          <View 
            style={[
              styles.volumeFill, 
              { width: `${volume * 100}%` }
            ]} 
          />
        </View>
      </View>
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
              source={{ uri: track.cover_image_url || track.cover_art_url || track.artwork_url || 'https://via.placeholder.com/60' }}
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
      
      {/* Bottom gradient overlay to blend with system UI */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bottomGradient}
      />

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
        <TouchableOpacity style={styles.albumArtContainer} onPress={handleAlbumArtTap}>
          <Image 
            source={{ uri: currentTrack.cover_image_url || currentTrack.cover_art_url || currentTrack.artwork_url || 'https://via.placeholder.com/300' }}
            style={styles.albumArt}
          />
          <View style={styles.albumArtOverlay} />
        </TouchableOpacity>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.creator?.display_name || currentTrack.creator?.username || 'Unknown Artist'}
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
      </ScrollView>

      {/* Queue Modal */}
      {showQueue && renderQueue()}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    minHeight: height, // Ensure minimum height covers full screen
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Reduced to bring action buttons back up
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: height, // Ensure it covers full screen height
    zIndex: -1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // Extra height to cover system UI area
    zIndex: -1,
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
  trackStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  likesCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  playsCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
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
  progressBarPressed: {
    transform: [{ scaleY: 1.5 }], // Magnify vertically when pressed
  },
  progressTrackPressed: {
    height: 6, // Make track thicker when pressed
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 40, // Increased margin
  },
  controlsMainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
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
    marginBottom: 40, // Reduced to bring action buttons closer to volume
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
  volumeBarPressed: {
    transform: [{ scaleY: 1.5 }], // Magnify vertically when pressed
  },
  volumeTrackPressed: {
    height: 5, // Make track thicker when pressed
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 30, // Reduced to bring buttons up but still avoid obstruction
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