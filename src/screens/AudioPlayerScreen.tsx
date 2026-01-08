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
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { offlineDownloadService } from '../services/OfflineDownloadService';
import TipModal from '../components/TipModal';
import { BlurView as ExpoBlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
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
    repeatMode,
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
  const { theme } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isProgressPressed, setIsProgressPressed] = useState(false);
  const [isVolumePressed, setIsVolumePressed] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsRecoveryAttempted = useRef(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  
  // Lyrics modal drag animation
  const lyricsModalTranslateY = useRef(new Animated.Value(0)).current;
  const lyricsModalOpacity = useRef(new Animated.Value(0)).current;
  const [lyricsModalDragOffset, setLyricsModalDragOffset] = useState(0);

  // Check like status and reset lyrics when track changes
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!currentTrack || !user) {
        setIsLiked(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', currentTrack.id)
          .eq('content_type', 'track')
          .maybeSingle();
        
        if (error) {
          console.error('❌ Error checking like status:', error);
          setIsLiked(false);
        } else {
          setIsLiked(!!data);
        }
      } catch (error) {
        console.error('❌ Error checking like status:', error);
        setIsLiked(false);
      }
    };
    
    checkLikeStatus();
    setShowLyrics(false);
    setLyricsData(null);
    lyricsRecoveryAttempted.current = false;
  }, [currentTrack, user]);
  
  // Track peeks are static - no animation resets needed
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Menu dropdown animation
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(-50)).current;
  
  // Swipe feature disabled - using button controls only
  
  // Pan responder for vertical swipe (close player)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dx) < 50;
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
  
  // Swipe feature disabled - removed PanResponder

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

  const handlePlayPause = async () => {
    console.log('🎮 Play/Pause button pressed, isPlaying:', isPlaying);
    try {
      if (isPlaying) {
        await pause();
      } else {
        await resume();
      }
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
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
      
      if (newLikeStatus) {
        // Like: Insert into likes table using polymorphic design
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: currentTrack.id,
            content_type: 'track', // Polymorphic type
          });
        
        if (error) {
          console.error('❌ Error inserting like:', error);
          setIsLiked(originalLikeStatus);
          Alert.alert('Error', 'Failed to like track. Please try again.');
          return;
        }
        
        // Update local likes count
        const newLikesCount = (currentTrack.likes_count || 0) + 1;
        updateCurrentTrack({ likes_count: newLikesCount });
        console.log('✅ Liked track:', currentTrack.title);
        
      } else {
        // Unlike: Delete from likes table
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', currentTrack.id)
          .eq('content_type', 'track');
        
        if (error) {
          console.error('❌ Error removing like:', error);
          setIsLiked(originalLikeStatus);
          Alert.alert('Error', 'Failed to unlike track. Please try again.');
          return;
        }
        
        // Update local likes count
        const newLikesCount = Math.max(0, (currentTrack.likes_count || 0) - 1);
        updateCurrentTrack({ likes_count: newLikesCount });
        console.log('✅ Unliked track:', currentTrack.title);
      }
      
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      setIsLiked(originalLikeStatus);
      Alert.alert('Error', 'Unable to update like status. Please try again.');
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow functionality
  };

  const handleTipSuccess = () => {
    setShowTipModal(false);
  };

  const handleShare = async () => {
    if (!currentTrack) {
      console.log('❌ No current track to share');
      return;
    }
    
    try {
      console.log('📤 Sharing track:', currentTrack.title);
      
      const shareUrl = `https://soundbridge.live/track/${currentTrack.id}`;
      const message = `🎵 Check out "${currentTrack.title}" by ${currentTrack.creator?.display_name || 'Unknown Artist'} on SoundBridge!\n\n${shareUrl}`;
      
      const shareOptions = Platform.OS === 'ios' 
        ? {
            // iOS: Use url property for better native sharing
            url: shareUrl,
            message: `🎵 ${currentTrack.title} by ${currentTrack.creator?.display_name || 'Unknown Artist'}`,
          }
        : {
            // Android: Use message with URL included
            message: message,
            title: `${currentTrack.title} - SoundBridge`,
          };
      
      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        console.log('✅ Track shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('ℹ️ Share dismissed by user');
      }
    } catch (error: any) {
      console.error('❌ Error sharing track:', error);
      if (error?.message && !error.message.includes('User did not share')) {
        Alert.alert('Share Failed', 'Unable to share this track. Please try again.');
      }
    }
  };

  const handleTipCreator = () => {
    if (!currentTrack?.creator?.id) {
      Alert.alert('Error', 'Creator information not available');
      return;
    }
    
    setShowTipModal(true);
  };

  const handleOptionsMenu = () => {
    setShowOptionsMenu(true);
    // Animate menu dropdown
    Animated.parallel([
      Animated.timing(menuFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(menuSlideAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeOptionsMenu = () => {
    Animated.parallel([
      Animated.timing(menuFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(menuSlideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOptionsMenu(false);
      // Reset animation values
      menuSlideAnim.setValue(-50);
      menuFadeAnim.setValue(0);
    });
  };

  const handleAddToPlaylist = async () => {
    closeOptionsMenu();
    
    // Wait for menu to close before showing playlist selector
    setTimeout(async () => {
      setIsLoadingPlaylists(true);
      
      try {
        if (!user) {
          Alert.alert('Sign In Required', 'Please sign in to add tracks to playlists');
          return;
        }

        console.log('📋 Loading user playlists...');
        
        const { data, error } = await supabase
          .from('playlists')
          .select('id, name, description, cover_image_url, tracks_count')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error loading playlists:', error);
          throw error;
        }

        console.log('✅ Loaded playlists:', data?.length || 0);
        setUserPlaylists(data || []);
        setShowPlaylistSelector(true);
      } catch (error) {
        console.error('❌ Error loading playlists:', error);
        Alert.alert('Error', 'Unable to load your playlists. Please try again.');
      } finally {
        setIsLoadingPlaylists(false);
      }
    }, 300);
  };

  const handlePlaylistSelect = async (playlistId: string) => {
    try {
      if (!currentTrack) return;

      // Check if track is already in playlist
      const { data: existing } = await supabase
        .from('playlist_tracks')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('track_id', currentTrack.id)
        .maybeSingle();

      if (existing) {
        Alert.alert('Already Added', 'This track is already in the selected playlist');
        setShowPlaylistSelector(false);
        return;
      }

      // Get current max position
      const { data: maxPos } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newPosition = (maxPos?.position || 0) + 1;

      // Add track to playlist
      const { error } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: currentTrack.id,
          position: newPosition,
        });

      if (error) throw error;

      Alert.alert('Success', 'Track added to playlist!');
      setShowPlaylistSelector(false);
    } catch (error) {
      console.error('Error adding to playlist:', error);
      Alert.alert('Error', 'Unable to add track to playlist. Please try again.');
    }
  };

  const handleCreateNewPlaylist = () => {
    setShowPlaylistSelector(false);
    navigation.navigate('CreatePlaylist' as never, { 
      trackToAdd: currentTrack 
    } as never);
  };

  const handleShareTrackMenu = async () => {
    closeOptionsMenu();
    // Wait a brief moment for menu to close before showing share sheet
    setTimeout(() => {
      handleShare();
    }, 300);
  };

  const handleGoToAlbum = async () => {
    closeOptionsMenu();
    
    // Check if track has an album_id
    if (!currentTrack.id) {
      Alert.alert('Error', 'No track is currently playing');
      return;
    }

    try {
      // Query the album_tracks table to find which album this track belongs to
      const { data, error } = await supabase
        .from('album_tracks')
        .select('album_id')
        .eq('track_id', currentTrack.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.album_id) {
        // Navigate to the album
        navigation.navigate('AlbumDetails' as never, { 
          albumId: data.album_id 
        } as never);
      } else {
        // Track is not part of an album
        Alert.alert('Not Available', 'This track is not part of an album');
      }
    } catch (error) {
      console.error('Error checking album:', error);
      Alert.alert('Error', 'Failed to load album information');
    }
  };

  const handleGoToArtist = () => {
    closeOptionsMenu();
    if (currentTrack.creator?.id) {
      navigation.navigate('CreatorProfile' as never, { 
        creatorId: currentTrack.creator.id 
      } as never);
    } else {
      Alert.alert('Error', 'Artist information not available');
    }
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

  // Lyrics recovery mechanism
  const recoverLyrics = async () => {
    if (!currentTrack || lyricsRecoveryAttempted.current) return;
    
    lyricsRecoveryAttempted.current = true;
    setIsLoadingLyrics(true);
    
    try {
      console.log('🎵 Attempting lyrics recovery for track:', currentTrack.id);
      
      // Fetch track data from database
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('lyrics, lyrics_language, has_lyrics')
        .eq('id', currentTrack.id)
        .single();
      
      if (error) {
        console.error('Error fetching lyrics:', error);
        return;
      }
      
      if (data?.lyrics) {
        console.log('✅ Lyrics recovered successfully');
        console.log('🎵 Recovered lyrics length:', data.lyrics.length);
        console.log('🎵 Recovered lyrics preview:', data.lyrics.substring(0, 100));
        setLyricsData(data.lyrics);
        // Update current track with lyrics
        updateCurrentTrack({
          lyrics: data.lyrics,
          lyrics_language: data.lyrics_language,
          has_lyrics: data.has_lyrics
        });
        console.log('🎵 Updated current track with lyrics');
      } else {
        console.log('ℹ️ No lyrics available for this track');
        setLyricsData(null);
      }
    } catch (error) {
      console.error('Failed to recover lyrics:', error);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  // Animate lyrics modal in
  const animateLyricsModalIn = () => {
    lyricsModalTranslateY.setValue(300);
    lyricsModalOpacity.setValue(0);
    setLyricsModalDragOffset(0);
    
    Animated.parallel([
      Animated.timing(lyricsModalTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(lyricsModalOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate lyrics modal out
  const animateLyricsModalOut = () => {
    Animated.parallel([
      Animated.timing(lyricsModalTranslateY, {
        toValue: 300,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(lyricsModalOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLyrics(false);
      lyricsModalTranslateY.setValue(0);
      lyricsModalOpacity.setValue(0);
      setLyricsModalDragOffset(0);
    });
  };

  // Parse lyrics into lines
  const parseLyrics = (lyricsText: string | null | undefined): string[] => {
    if (!lyricsText) return [];
    // Split by newlines and filter empty lines
    return lyricsText.split(/\r?\n/).filter(line => line.trim().length > 0);
  };

  // Calculate current lyric line index based on playback position
  const getCurrentLyricIndex = (): number => {
    if (!duration || !position || !hasLyrics) return -1;
    
    const lyricsText = currentTrack?.lyrics || lyricsData;
    if (!lyricsText) return -1;
    
    const lines = parseLyrics(lyricsText);
    if (lines.length === 0) return -1;
    
    // Simple calculation: distribute lyrics evenly across duration
    // This is a basic implementation - can be enhanced with timestamped lyrics later
    const progress = position / duration;
    const lineIndex = Math.floor(progress * lines.length);
    return Math.min(lineIndex, lines.length - 1);
  };

  // Toggle lyrics display
  const handleToggleLyrics = async () => {
    if (!currentTrack) {
      console.log('❌ No current track');
      return;
    }
    
    console.log('🎵 Opening lyrics modal...');
    console.log('🎵 Current track:', currentTrack.id);
    console.log('🎵 Has lyrics in track:', !!currentTrack.lyrics);
    console.log('🎵 Has lyrics data:', !!lyricsData);
    console.log('🎵 Recovery attempted:', lyricsRecoveryAttempted.current);
    
    // Always try to recover lyrics if we don't have them yet
    if (!currentTrack.lyrics && !lyricsData && !lyricsRecoveryAttempted.current) {
      console.log('🔄 Attempting to recover lyrics...');
      await recoverLyrics();
    }
    
    // Always show the modal, even if no lyrics (will show "No lyrics available")
    setShowLyrics(true);
    console.log('✅ Lyrics modal should now be visible');
  };

  // Close lyrics modal
  const handleCloseLyrics = () => {
    setShowLyrics(false);
  };

  // Simple drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle drag start
  const handleDragStart = (event: any) => {
    event.stopPropagation();
    setIsDragging(true);
    setDragStartY(event.nativeEvent.pageY);
    setDragOffset(lyricsModalTranslateY._value);
  };

  // Handle drag move
  const handleDragMove = (event: any) => {
    if (!isDragging) return;
    event.stopPropagation();
    const currentY = event.nativeEvent.pageY;
    const deltaY = currentY - dragStartY;
    lyricsModalTranslateY.setValue(dragOffset + deltaY);
  };

  // Handle drag end
  const handleDragEnd = (event: any) => {
    if (!isDragging) return;
    event.stopPropagation();
    setIsDragging(false);
    
    const currentValue = lyricsModalTranslateY._value;
    if (currentValue > 80) { // More sensitive threshold
      // Close modal if dragged down significantly
      animateLyricsModalOut();
    } else {
      // Snap back to original position with smooth animation
      Animated.spring(lyricsModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }).start();
    }
  };

  // Create PanResponder for drag handle
  const createDragPanResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(true);
        setDragStartY(evt.nativeEvent.pageY);
        setDragOffset(lyricsModalTranslateY._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDragging) return;
        const currentY = evt.nativeEvent.pageY;
        const deltaY = currentY - dragStartY;
        lyricsModalTranslateY.setValue(dragOffset + deltaY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        const currentValue = lyricsModalTranslateY._value;
        if (currentValue > 80) {
          animateLyricsModalOut();
        } else {
          Animated.spring(lyricsModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 10,
          }).start();
        }
      },
    });
  };

  // Check if track has lyrics (including recovery attempt check)
  const hasLyrics = !!(currentTrack?.lyrics || currentTrack?.has_lyrics || lyricsData);
  
  // Debug logging for lyrics state
  console.log('🎵 Lyrics state check:', {
    trackId: currentTrack?.id,
    hasLyricsField: currentTrack?.has_lyrics,
    hasLyricsContent: !!currentTrack?.lyrics,
    hasLyricsData: !!lyricsData,
    recoveryAttempted: lyricsRecoveryAttempted.current,
    finalHasLyrics: hasLyrics
  });

  // Check if track is available offline
  const checkOfflineStatus = async () => {
    if (!currentTrack) return;
    
    try {
      const isTrackOffline = await offlineDownloadService.isTrackOffline(currentTrack.id);
      setIsOffline(isTrackOffline);
    } catch (error) {
      console.error('Error checking offline status:', error);
    }
  };

  // Check offline status when track changes
  useEffect(() => {
    if (currentTrack) {
      checkOfflineStatus();
    }
  }, [currentTrack]);

  // Handle download track for offline
  const handleDownload = async () => {
    if (!currentTrack || isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      const trackForDownload = {
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: currentTrack.duration,
        coverArt: currentTrack.coverArt,
        url: currentTrack.url,
      };
      
      const success = await offlineDownloadService.downloadTrack(trackForDownload);
      
      if (success) {
        setIsOffline(true);
        Alert.alert('Download Complete', `${currentTrack.title} is now available offline`);
      } else {
        Alert.alert('Download Failed', 'Failed to download track for offline listening');
      }
    } catch (error) {
      console.error('Error downloading track:', error);
      Alert.alert('Download Error', 'An error occurred while downloading the track');
    } finally {
      setIsDownloading(false);
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


  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlsMainRow}>
        {/* Shuffle */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleShuffle}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isShuffled ? 'shuffle' : 'shuffle-outline'} 
            size={24} 
            color={isShuffled ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={playPrevious}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.9}
        >
          <View style={[styles.playButtonCircle, { backgroundColor: theme.colors.primary }]}>
            <Ionicons 
              name={isPlaying ? 'pause' : 'play'} 
              size={32} 
              color="#FFFFFF" 
            />
          </View>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={playNext}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-forward" size={28} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleRepeat}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons 
              name={repeatMode !== 'off' ? 'repeat' : 'repeat-outline'} 
              size={24} 
              color={repeatMode !== 'off' ? theme.colors.primary : theme.colors.textSecondary} 
            />
            {repeatMode === 'one' && (
              <View style={styles.repeatOneBadge}>
                <Text style={styles.repeatOneBadgeText}>1</Text>
              </View>
            )}
          </View>
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
            key={`queue-${track.id}-${index}`}
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
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} translucent />
      <SafeAreaView style={styles.safeArea} edges={[]}>
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

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!showLyrics}
      >
      {/* Header - Matching HTML design */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
        <TouchableOpacity onPress={closePlayer} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={32} color={theme.isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'} />
        </TouchableOpacity>
        <View style={styles.headerHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }]} />
        </View>
        <TouchableOpacity onPress={handleOptionsMenu} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'} />
        </TouchableOpacity>
      </View>

      {/* Title Section - Matching HTML design */}
      <View style={styles.titleSection}>
        <View style={styles.titleTextContainer}>
          <Text style={[styles.largeTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {currentTrack.title}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              if (currentTrack.creator?.id) {
                navigation.navigate('CreatorProfile' as never, { 
                  creatorId: currentTrack.creator.id 
                } as never);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.artistName, { color: theme.isDark ? 'rgba(251, 207, 232, 0.6)' : 'rgba(147, 51, 234, 0.8)' }]} numberOfLines={1}>
              {currentTrack.creator?.display_name || currentTrack.creator?.username || 'Unknown Artist'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.heartButton} 
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={28} 
            color={isLiked ? theme.colors.primary : (theme.isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')} 
          />
        </TouchableOpacity>
      </View>

      {/* Main Visual / Player Ring - Matching HTML design */}
      <View style={styles.mainVisualContainer}>
        {/* Previous Track Peek - Static */}
        {(() => {
          const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
          const prevTrack = currentIndex > 0 
            ? queue[currentIndex - 1] 
            : currentIndex === -1 && queue.length > 0 
              ? queue[queue.length - 1] 
              : null;
          
          if (!prevTrack) return null;
          
          return (
            <View style={styles.trackPeekPrevious}>
              <Image
                source={{ uri: prevTrack.cover_image_url || prevTrack.cover_art_url || prevTrack.artwork_url || 'https://via.placeholder.com/300' }}
                style={styles.trackPeekImage}
                blurRadius={Platform.OS === 'ios' ? 2 : 0}
              />
            </View>
          );
        })()}
        
        {/* Next Track Peek - Static */}
        {(() => {
          const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
          const nextTrack = currentIndex >= 0 && currentIndex < queue.length - 1
            ? queue[currentIndex + 1]
            : currentIndex === -1 && queue.length > 0
              ? queue[0]
              : null;
          
          if (!nextTrack) return null;
          
          return (
            <View style={styles.trackPeekNext}>
              <Image
                source={{ uri: nextTrack.cover_image_url || nextTrack.cover_art_url || nextTrack.artwork_url || 'https://via.placeholder.com/300' }}
                style={styles.trackPeekImage}
                blurRadius={Platform.OS === 'ios' ? 2 : 0}
              />
            </View>
          );
        })()}
        
        {/* Central Player - Static, no swipe animations */}
        <View style={styles.centralPlayerContainer}>
          {/* Glass Ring */}
          <ExpoBlurView intensity={20} tint={theme.isDark ? 'dark' : 'light'} style={styles.glassRingBlur}>
            <LinearGradient
              colors={theme.isDark 
                ? ['rgba(255, 255, 255, 0.1)', 'transparent']
                : ['rgba(0, 0, 0, 0.1)', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassRingGradient}
            />
          </ExpoBlurView>
          <View style={[styles.glassRing, { 
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: theme.isDark ? '#a855f7' : '#9333ea',
          }]} />
          
          {/* Progress Arc (SVG) - Matching HTML exactly */}
          <View style={styles.progressArcContainer}>
            <Svg width={320} height={320} style={styles.svgProgress}>
              {/* Background track */}
              <Circle
                cx={160}
                cy={160}
                r={121.6} // 38% of 320
                fill="none"
                stroke={theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                strokeWidth={1.5}
              />
              {/* Active Progress - grows in length using stroke-dashoffset */}
              {duration > 0 && (() => {
                const circumference = 2 * Math.PI * 121.6; // ~764
                const progress = Math.min(position / duration, 1);
                const strokeDashoffset = circumference * (1 - progress);
                
                return (
                  <Circle
                    cx={160}
                    cy={160}
                    r={121.6}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 160 160)"
                  />
                );
              })()}
            </Svg>
          </View>
          
          {/* Inner Glow Circle */}
          <View style={[styles.innerGlowCircle, { 
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          }]} />
          
          {/* Album Art */}
          <TouchableOpacity 
            style={styles.albumArtContainer} 
            onPress={handleAlbumArtTap}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: currentTrack.cover_image_url || currentTrack.cover_art_url || currentTrack.artwork_url || 'https://via.placeholder.com/300' }}
              style={styles.albumArt}
            />
            {/* Shine overlay */}
            <LinearGradient
              colors={theme.isDark 
                ? ['rgba(0, 0, 0, 0.2)', 'transparent', 'rgba(255, 255, 255, 0.2)']
                : ['rgba(0, 0, 0, 0.1)', 'transparent', 'rgba(255, 255, 255, 0.1)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shineOverlay}
              pointerEvents="none"
            />
          </TouchableOpacity>
          
          {/* Time Label */}
          <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
            {formatTime(position)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      {renderControls()}

      {/* Action Buttons Row - Lyrics and Tip */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.lyricsButton}
          onPress={handleToggleLyrics}
          activeOpacity={0.7}
        >
          <Ionicons
            name="musical-notes"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.lyricsButtonText, { color: theme.colors.primary }]}>
            Lyrics
          </Text>
        </TouchableOpacity>

        {/* Tip Button */}
        {currentTrack?.creator?.id && (
          <TouchableOpacity
            style={styles.tipButton}
            onPress={handleTipCreator}
            activeOpacity={0.7}
          >
            <Ionicons
              name="gift"
              size={20}
              color="#FACC15"
            />
            <Text style={[styles.tipButtonText, { color: '#FACC15' }]}>
              Tip Artist
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Next Songs Section */}
      {queue.length > 0 && (
        <View style={styles.nextSongsSection}>
          <Text style={[styles.nextSongsTitle, { color: theme.colors.text }]}>Next Songs</Text>
          <TouchableOpacity 
            style={styles.nextSongItem}
            onPress={() => queue[0] && play(queue[0])}
            activeOpacity={0.7}
          >
            <Image 
              source={{ 
                uri: queue[0].cover_image_url || queue[0].cover_art_url || queue[0].artwork_url || 'https://via.placeholder.com/60' 
              }}
              style={styles.nextSongImage}
            />
            <View style={styles.nextSongInfo}>
              <Text style={[styles.nextSongTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {queue[0].title}
              </Text>
              <Text style={[styles.nextSongArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {queue[0].creator?.display_name || queue[0].creator?.username || 'Unknown Artist'}
              </Text>
            </View>
            <Text style={[styles.nextSongDuration, { color: theme.colors.textSecondary }]}>
              {formatTime(queue[0].duration || 0)}
            </Text>
          </TouchableOpacity>
          
          {queue.length > 1 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('QueueView' as never)}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>+ See All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      </ScrollView>

      {/* Queue Modal */}
      {showQueue && renderQueue()}

      {/* Lyrics Modal - Full Screen */}
      <Modal
        visible={showLyrics}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseLyrics}
        statusBarTranslucent={true}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.lyricsModalFullScreen} edges={[]}>
          {/* Background Gradient - Dark with visible progression */}
          <LinearGradient
            colors={['#16213e', '#0f1419', '#000000']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.container}>

            {/* Swipe indicator */}
            <View style={styles.swipeIndicator} />
            
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCloseLyrics} style={styles.headerButton}>
                <Ionicons name="chevron-down" color="rgba(255, 255, 255, 0.8)" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleOptionsMenu}>
                <Ionicons name="ellipsis-vertical" color="rgba(255, 255, 255, 0.8)" size={24} />
              </TouchableOpacity>
            </View>

            {/* Lyrics */}
            <ScrollView
              style={styles.lyricsContainer}
              contentContainerStyle={styles.lyricsContent}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const lyricsText = currentTrack?.lyrics || lyricsData;
                const lyricsLines = parseLyrics(lyricsText);
                const currentLineIndex = getCurrentLyricIndex();
                
                if (lyricsLines.length === 0) {
                  return (
                    <Text style={styles.lyricsEmptyText}>
                      No lyrics available for this track
                    </Text>
                  );
                }
                
                return lyricsLines.map((line, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.lyricLine,
                      index === currentLineIndex ? styles.currentLyric : styles.inactiveLyric,
                    ]}
                  >
                    {line}
                  </Text>
                ));
              })()}
            </ScrollView>

            {/* Mini Player - Liquid Glass iOS 26 Style */}
            <View style={styles.miniPlayerWrapper}>
              {/* iOS System Material Blur */}
              <ExpoBlurView 
                intensity={Platform.OS === 'ios' ? 50 : 80} 
                tint="dark" 
                style={styles.miniPlayer}
              >
                {/* Adaptive Tint Layer - creates depth */}
                <View style={[
                  StyleSheet.absoluteFill,
                  { 
                    backgroundColor: theme.isDark 
                      ? 'rgba(0, 0, 0, 0.3)' 
                      : 'rgba(255, 255, 255, 0.2)' 
                  }
                ]} />

                {/* Glass Highlight - top sheen for "liquid glass" feel */}
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.35)',
                    'rgba(255, 255, 255, 0.12)',
                    'transparent',
                  ]}
                  style={styles.glassHighlight}
                />

                {/* Content Layer */}
                <View style={styles.miniPlayerContent}>
                  <View style={styles.albumArtContainer}>
                    <Image
                      source={{ 
                        uri: currentTrack?.cover_image_url || 
                             currentTrack?.cover_art_url || 
                             currentTrack?.artwork_url || 
                             'https://via.placeholder.com/56' 
                      }}
                      style={styles.albumArt}
                    />
                  </View>

                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {currentTrack?.title || 'Unknown Track'}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {currentTrack?.creator?.display_name || 
                       currentTrack?.creator?.username || 
                       'Unknown Artist'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={isPlaying ? pause : resume}
                    style={styles.playButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      color="#000000"
                      size={20}
                    />
                  </TouchableOpacity>
                </View>
              </ExpoBlurView>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Tip Modal */}
      {currentTrack?.creator?.id && (
        <TipModal
          visible={showTipModal}
          creatorId={currentTrack.creator.id}
          creatorName={
            currentTrack.creator.display_name ||
            currentTrack.creator.username ||
            'Creator'
          }
          onClose={() => setShowTipModal(false)}
          onTipSuccess={(amount) => handleTipSuccess()}
        />
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="none"
        onRequestClose={closeOptionsMenu}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closeOptionsMenu}
        >
          <Animated.View 
            style={[
              styles.menuContainer,
              {
                opacity: menuFadeAnim,
                transform: [{ translateY: menuSlideAnim }]
              }
            ]}
          >
            <ExpoBlurView
              intensity={80}
              tint={theme.isDark ? 'dark' : 'light'}
              style={styles.menuBlur}
            >
              <ScrollView 
                style={styles.menuContent}
                contentContainerStyle={styles.menuContentContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Menu Header */}
                <View style={styles.menuHeader}>
                  <View style={styles.menuTrackInfo}>
                    {currentTrack?.cover_image_url && (
                      <Image 
                        source={{ uri: currentTrack.cover_image_url }} 
                        style={styles.menuTrackImage}
                      />
                    )}
                    <View style={styles.menuTrackDetails}>
                      <Text style={[styles.menuTrackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {currentTrack?.title}
                      </Text>
                      <Text style={[styles.menuTrackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {currentTrack?.creator?.display_name || 'Unknown Artist'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Menu Options */}
                <View style={styles.menuOptions}>
                  <TouchableOpacity 
                    style={styles.menuOption}
                    onPress={handleAddToPlaylist}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={theme.colors.text} />
                    <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                      Add to a Playlist
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOption}
                    onPress={handleShareTrackMenu}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={24} color={theme.colors.text} />
                    <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                      Share Track
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOption}
                    onPress={handleGoToAlbum}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="disc-outline" size={24} color={theme.colors.text} />
                    <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                      Go to Album
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOption}
                    onPress={handleGoToArtist}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-outline" size={24} color={theme.colors.text} />
                    <View style={styles.menuOptionTextContainer}>
                      <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                        Go to Artist
                      </Text>
                      <Text style={[styles.menuOptionSubtext, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {currentTrack?.creator?.display_name || 'Unknown'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </ExpoBlurView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Selector Modal */}
      <Modal
        visible={showPlaylistSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlaylistSelector(false)}
      >
        <View style={styles.playlistModalContainer}>
          <View style={[styles.playlistModalContent, { backgroundColor: theme.colors.card }]}>
            {/* Header */}
            <View style={styles.playlistModalHeader}>
              <Text style={[styles.playlistModalTitle, { color: theme.colors.text }]}>
                Add to Playlist
              </Text>
              <TouchableOpacity onPress={() => setShowPlaylistSelector(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Create New Playlist Button */}
            <TouchableOpacity 
              style={[styles.createPlaylistButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateNewPlaylist}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>

            {/* Playlists List */}
            {isLoadingPlaylists ? (
              <View style={styles.playlistLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : userPlaylists.length === 0 ? (
              <View style={styles.noPlaylistsContainer}>
                <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.noPlaylistsText, { color: theme.colors.textSecondary }]}>
                  No playlists yet
                </Text>
                <Text style={[styles.noPlaylistsSubtext, { color: theme.colors.textSecondary }]}>
                  Create your first playlist to get started
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.playlistsList}>
                {userPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => handlePlaylistSelect(playlist.id)}
                    activeOpacity={0.7}
                  >
                    {playlist.cover_image_url ? (
                      <Image 
                        source={{ uri: playlist.cover_image_url }} 
                        style={styles.playlistCover}
                      />
                    ) : (
                      <View style={[styles.playlistCoverPlaceholder, { backgroundColor: theme.colors.primary + '30' }]}>
                        <Ionicons name="musical-notes" size={24} color={theme.colors.primary} />
                      </View>
                    )}
                    <View style={styles.playlistInfo}>
                      <Text style={[styles.playlistName, { color: theme.colors.text }]} numberOfLines={1}>
                        {playlist.name}
                      </Text>
                      <Text style={[styles.playlistMeta, { color: theme.colors.textSecondary }]}>
                        {playlist.tracks_count || 0} tracks
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1a0f2e', // Match gradient start color
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: height, // Ensure minimum height covers full screen
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Reduced to bring action buttons back up
    overflow: 'visible', // Allow content to extend beyond bounds
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
    paddingHorizontal: 32,
    marginTop: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerHandle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    opacity: 0.2,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 32,
    marginTop: 24,              // Reduced to bring content up
    marginBottom: 12,            // Reduced spacing
  },
  titleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  largeTitle: {
    fontSize: 48,
    fontWeight: '300', // font-light
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 52,
  },
  artistName: {
    fontSize: 20,
    fontWeight: '400',
  },
  heartButton: {
    padding: 8,
    marginTop: 8,
  },
  mainVisualContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,           // Reduced to compress vertically
    minHeight: 280,              // Reduced to bring content up
    position: 'relative',
    overflow: 'visible', // Allow peeks to extend outside container
    width: '100%',
  },
  trackPeekPrevious: {
    position: 'absolute',
    left: -128, // -left-32 from HTML = -128px
    top: '50%',
    marginTop: -96, // Center vertically (half of 192px)
    width: 192, // w-48 = 192px
    height: 192,
    borderRadius: 96,
    overflow: 'hidden',
    opacity: 0.3,
    transform: [{ scale: 0.9 }],
    zIndex: 10,
  },
  trackPeekNext: {
    position: 'absolute',
    right: -128, // -right-32 from HTML = -128px
    top: '50%',
    marginTop: -96, // Center vertically (half of 192px)
    width: 192, // w-48 = 192px
    height: 192,
    borderRadius: 96,
    overflow: 'hidden',
    opacity: 0.3,
    transform: [{ scale: 0.9 }],
    zIndex: 10,
  },
  trackPeekImage: {
    width: '100%',
    height: '100%',
  },
  centralPlayerContainer: {
    width: 320, // w-80 = 320px
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressArcContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 320,
    height: 320,
    pointerEvents: 'none',
  },
  svgProgress: {
    transform: [{ rotate: '-90deg' }],
  },
  glassRingBlur: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    overflow: 'hidden',
  },
  glassRingGradient: {
    width: '100%',
    height: '100%',
  },
  glassRing: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.15,
    elevation: 5,
  },
  innerGlowCircle: {
    position: 'absolute',
    width: 304, // 320 - 16 (inset-4)
    height: 304,
    borderRadius: 152,
    borderWidth: 1,
  },
  albumArtContainer: {
    width: 192, // w-48 = 192px
    height: 192,
    borderRadius: 96,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 96,
  },
  timeLabel: {
    position: 'absolute',
    bottom: 24,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 45,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 16,
    height: 24,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressBarPressed: {
    transform: [{ scaleY: 1.2 }],
  },
  progressTrackPressed: {
    height: 4,
  },
  controlsContainer: {
    paddingHorizontal: 24,
    marginTop: 12,              // Reduced space between album art and controls
    marginBottom: 24,            // Reduced bottom margin
  },
  controlsMainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  repeatOneBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  playButton: {
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextSongsSection: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 32,
  },
  nextSongsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  nextSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker card background matching reference
    marginBottom: 12,
  },
  nextSongImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  nextSongInfo: {
    flex: 1,
    marginRight: 12,
  },
  nextSongTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextSongArtist: {
    fontSize: 14,
    fontWeight: '400',
  },
  nextSongDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
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
  lyricsModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  lyricsModalContainer: {
    width: '90%',
    height: '70%',
    borderRadius: 16,
    overflow: 'visible',
    backgroundColor: 'rgba(20, 20, 20, 0.95)', // Solid dark background
    zIndex: 1001,
  },
  lyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lyricsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lyricsLanguage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  lyricsContent: {
    flex: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Temporary red background to see if content area is visible
    zIndex: 999,
  },
  lyricsScrollContent: {
    padding: 20,
    minHeight: 200,
  },
  lyricsText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#FF0000', // Bright red text to make it visible
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green background to see text area
    padding: 10,
    margin: 10,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'top',
    zIndex: 1000,
  },
  lyricsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  lyricsLoadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
  },
  noLyricsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noLyricsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 16,
  },
  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  // Lyrics Button
  lyricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  lyricsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Tip Button
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  tipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lyricsButtonDisabled: {
    opacity: 0.5,
  },
  // Lyrics Screen Styles (Exact Figma code)
  lyricsModalFullScreen: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  lyricsContent: {
    paddingHorizontal: 8,
    gap: 24,
  },
  lyricLine: {
    marginBottom: 24,
  },
  currentLyric: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  inactiveLyric: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 16,
  },
  lyricsEmptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  miniPlayerWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  miniPlayer: {
    borderRadius: 999,          // Capsule shape (pill-shaped)
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',  // Subtle edge definition
    backgroundColor: 'transparent',
    height: 84,                 // Apple Music mini-player height
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,                 // Subtle top sheen for glass effect
    zIndex: 1,
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    zIndex: 2,                  // Above highlight
  },
  albumArtContainer: {
    width: 48,                  // Apple Music mini-player artwork size
    height: 48,
    borderRadius: 6,            // iOS 26 style rounded corners
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  songInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 15,               // Apple Music text sizing
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '27%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  // Options Menu Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingRight: 20,
    paddingLeft: 20,
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 60,
    right: 20,
    maxWidth: 320,
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  menuBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuContent: {
    flex: 1,
  },
  menuContentContainer: {
    padding: 8,
    paddingBottom: 12,
  },
  menuHeader: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTrackImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  menuTrackDetails: {
    flex: 1,
  },
  menuTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuTrackArtist: {
    fontSize: 14,
  },
  menuOptions: {
    paddingVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuOptionText: {
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 16,
    flex: 1,
  },
  menuOptionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuOptionSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  // Playlist Selector Modal Styles
  playlistModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  playlistModalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  playlistModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playlistModalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createPlaylistText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  playlistLoadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPlaylistsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPlaylistsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noPlaylistsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  playlistsList: {
    maxHeight: 400,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistCoverPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistMeta: {
    fontSize: 14,
  },
});