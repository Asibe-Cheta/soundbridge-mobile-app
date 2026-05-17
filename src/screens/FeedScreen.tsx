import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { walkthroughable, useCopilot } from 'react-native-copilot';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import { useFeed } from '../hooks/useFeed';
import CreatePostPrompt from '../components/CreatePostPrompt';
import LiveAudioBanner from '../components/LiveAudioBanner';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import CommentsModal from '../modals/CommentsModal';
import TipModal from '../components/TipModal';
import { feedService } from '../services/api/feedService';
import { deepLinkingService } from '../services/DeepLinkingService';
import { socialService } from '../services/api/socialService';
import { imageSaveService } from '../services/ImageSaveService';
import { Alert } from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { checkShouldShowTour } from '../services/tourService';
import { SystemTypography as Typography } from '../constants/Typography';
import { SkeletonFeed } from '../components/SkeletonLoader';

// Create walkthroughable components
const WalkthroughableView = walkthroughable(View);
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);

export default function FeedScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { start: startTour } = useCopilot();
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    addReaction,
    deletePost,
    updatePostLocally,
  } = useFeed();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAuthorId, setTipAuthorId] = useState<string>('');
  const [tipAuthorName, setTipAuthorName] = useState<string>('');

  // Notification permission modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifAlreadyDenied, setNotifAlreadyDenied] = useState(false);
  const notifCheckedThisSession = useRef(false);
  const flatListRef = useRef<any>(null);
  useScrollToTop(flatListRef);

  // Refresh + scroll to top when user taps the Feed tab while already on it
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = (navigation as any).addListener?.('tabPress', () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        refresh();
      });
      return unsubscribe;
    }, [navigation, refresh])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || notifCheckedThisSession.current) return;
      notifCheckedThisSession.current = true;
      (async () => {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          console.log('🔔 Notification permission status:', status);
          if (status !== 'granted') {
            setNotifAlreadyDenied(status === 'denied');
            setTimeout(() => setShowNotifModal(true), 1500);
          }
        } catch (e) {
          console.warn('🔔 Could not check notification permission:', e);
        }
      })();
    }, [user?.id])
  );

  // Initialize app tour for new users
  useEffect(() => {
    const initializeTour = async () => {
      const shouldShow = await checkShouldShowTour();
      if (shouldShow && posts.length > 0) {
        // Small delay to let screen fully render
        setTimeout(() => {
          startTour();
        }, 1000);
      }
    };

    initializeTour();
  }, [posts.length]); // Start tour once posts are loaded

  // Load bookmark status for posts
  useEffect(() => {
    if (user?.id && posts.length > 0) {
      const loadBookmarkStatus = async () => {
        try {
          const postIds = posts.map((p) => p.id);
          const { data: bookmarks, error } = await socialService.getBookmarks(user.id, 'post', 100, 0);
          
          if (!error && bookmarks) {
            const bookmarkedPostIds = new Set(
              bookmarks
                .filter((b) => postIds.includes(b.content_id))
                .map((b) => b.content_id)
            );
            setSavedPosts(bookmarkedPostIds);
          }
        } catch (error) {
          console.error('Failed to load bookmark status:', error);
        }
      };

      loadBookmarkStatus();
    }
  }, [posts.length, user?.id]); // Only reload when post count or user changes

  const handleCreatePost = () => {
    setIsCreateModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalVisible(false);
  };

  const handleSubmitPost = async (data: {
    content: string;
    post_type: any;
    visibility: any;
    image_url?: string;
    audio_url?: string;
    event_id?: string;
  }) => {
    // Post is already created via API in CreatePostModal
    // Just refresh the feed to show the new post
    await refresh();
    setIsCreateModalVisible(false);
  };

  const handleReactionPress = async (postId: string, reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    try {
      await addReaction(postId, reactionType);
    } catch (err) {
      console.error('Failed to add reaction:', err);
      // Error is handled optimistically in the hook
    }
  };

  const handleCommentPress = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setSelectedPostForComments(post);
    }
  };

  const handlePostPress = (postId: string) => {
    // Navigate to post detail screen
    console.log('📍 Navigating to post detail:', postId);
    navigation.navigate('PostDetail' as never, { postId } as never);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsCreateModalVisible(true);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      Alert.alert('Error', 'Failed to delete drop. Please try again.');
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      await deepLinkingService.sharePost(post.id, post.content.substring(0, 100));
    } catch (error) {
      console.error('Failed to share post:', error);
      Alert.alert('Error', 'Failed to share drop. Please try again.');
    }
  };

  const handleRepost = async (post: Post, withComment?: boolean, comment?: string) => {
    try {
      // Check if user has already reposted (toggle behavior)
      if (post.user_reposted) {
        // Un-repost
        console.log('🗑️ Un-reposting post:', post.id);
        await feedService.unrepost(post.reposted_from_id || post.id);
        
        // Refresh feed to show updated state
        console.log('🔄 Refreshing feed after unrepost...');
        await refresh();
        
        showToast('Repost removed successfully', 'success');
      } else {
        // Determine if this is a quick repost or repost with comment
        console.log('📤 Reposting post:', post.id, 'with comment:', withComment);
        const result = await feedService.repost(
          post.reposted_from_id || post.id, // Repost from original if already a repost
          withComment || false,
          comment
        );
        
        console.log('✅ Repost created:', result);
        
        // Refresh feed to show new repost at top
        console.log('🔄 Refreshing feed after repost...');
        await refresh();
        
        showToast('Your post was sent', 'success');
      }
    } catch (error: any) {
      console.error('❌ Failed to repost/unrepost:', error);
      showToast(
        error.message || 'Failed to complete action. Please try again.',
        'error'
      );
    }
  };

  const handleSavePost = async (postId: string) => {
    try {
      const { data, error } = await socialService.toggleBookmark({
        content_id: postId,
        content_type: 'post',
      });

      if (error) {
        throw error;
      }

      // If data is returned, bookmark was added; if null, it was removed
      if (data) {
        setSavedPosts((prev) => new Set(prev).add(postId));
      } else {
        setSavedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      Alert.alert('Error', 'Failed to save drop. Please try again.');
    }
  };

  const handleUnsavePost = async (postId: string) => {
    // Same as save - toggleBookmark handles both add and remove
    await handleSavePost(postId);
  };

  const handleSaveImage = async (imageUrl: string) => {
    console.log('📸 FeedScreen.handleSaveImage: Called with URL:', imageUrl);
    try {
      if (!imageUrl) {
        console.error('❌ FeedScreen.handleSaveImage: No image URL provided');
        Alert.alert('Error', 'No image URL provided.');
        return;
      }
      await imageSaveService.saveImageWithFeedback(imageUrl);
    } catch (error) {
      console.error('❌ FeedScreen.handleSaveImage: Failed to save image:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    }
  };

  const handleAuthorPress = (authorId: string) => {
    console.log('👤 Navigating to author profile:', authorId);
    navigation.navigate('CreatorProfile' as never, { creatorId: authorId } as never);
  };

  const handleTip = (authorId: string, authorName: string) => {
    setTipAuthorId(authorId);
    setTipAuthorName(authorName);
    setShowTipModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

            <FlatList
              ref={flatListRef}
              data={posts}
              renderItem={({ item, index }) => (
                <PostCard
                  post={item}
                  onPress={() => handlePostPress(item.id)}
                  onReactionPress={(reactionType) => handleReactionPress(item.id, reactionType)}
                  onCommentPress={() => handleCommentPress(item.id)}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  onShare={handleSharePost}
                  onSave={handleSavePost}
                  onUnsave={handleUnsavePost}
                  onSaveImage={handleSaveImage}
                  onAuthorPress={handleAuthorPress}
                  onRepost={handleRepost}
                  onTip={handleTip}
                  onBlocked={async () => {
                    // Refresh feed to remove blocked user's posts
                    await refresh();
                  }}
                  onReported={async () => {
                    // Optionally refresh feed or show success message
                    console.log('Report submitted successfully');
                  }}
                  isSaved={savedPosts.has(item.id)}
                />
              )}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={5}
              windowSize={10}
              ListHeaderComponent={
                <>
                  {/* Step 1: Drop Content & Get Tipped */}
                  <WalkthroughableView
                    order={1}
                    name="create_drop_earn"
                    text="Tap here to drop content and GET TIPPED! Share music, updates, or studio sessions. Unlike Spotify's £0.003/stream, fans tip you directly - you keep 95%. Build your network and grow your profile while earning real money."
                  >
                    <CreatePostPrompt onPress={handleCreatePost} />
                  </WalkthroughableView>
                  <LiveAudioBanner />
                </>
              }
              ListFooterComponent={
                loading && posts.length > 0 ? (
                  <View style={styles.loadMoreContainer}>
                    <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
                      Loading more...
                    </Text>
                  </View>
                ) : !hasMore && posts.length > 0 ? (
                  <View style={styles.loadMoreContainer}>
                    <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
                      End of feed
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                // Only show loading if we truly have no posts and are loading
                // With cache, we should have posts immediately, so this should rarely show
                loading && posts.length === 0 ? (
                  <SkeletonFeed />
                ) : error && posts.length === 0 ? (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {error}
                    </Text>
                  </View>
                ) : null
              }
            />
      </SafeAreaView>

      {/* Create/Edit Post Modal */}
      <CreatePostModal
        visible={isCreateModalVisible}
        onClose={() => {
          handleCloseModal();
          setEditingPost(null);
        }}
        onSubmit={async (data) => {
          if (editingPost) {
            // Update existing post
            try {
              const updatedPost = await feedService.updatePost(editingPost.id, data);
              // Optimistically update UI immediately — no waiting for feed re-fetch
              if (updatedPost) updatePostLocally(updatedPost);
              setEditingPost(null);
              setIsCreateModalVisible(false);
            } catch (error) {
              console.error('Failed to update post:', error);
              Alert.alert('Error', 'Failed to update drop. Please try again.');
            }
          } else {
            // Create new post
            await handleSubmitPost(data);
          }
        }}
        editingPost={editingPost}
      />

      {/* Comments Modal */}
      {selectedPostForComments && (
        <CommentsModal
          visible={!!selectedPostForComments}
          post={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
          onViewFullPost={(postId) => {
            setSelectedPostForComments(null);
            handlePostPress(postId);
          }}
        />
      )}

      {/* Tip Modal */}
      <TipModal
        visible={showTipModal}
        creatorId={tipAuthorId}
        creatorName={tipAuthorName}
        onClose={() => setShowTipModal(false)}
        onTipSuccess={(amount, message) => {
          console.log('Tip sent successfully:', amount, message);
        }}
      />

      {/* Notification permission bottom sheet */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <BlurView intensity={22} tint="dark" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ padding: 28, paddingBottom: 44 }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 24 }} />

              {/* Bell icon */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <LinearGradient colors={['#EC4899', '#9333EA']} style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="notifications" size={30} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Headline */}
              <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.2 }}>
                SoundBridge works best with notifications on
              </Text>

              {/* Sub-head */}
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 20 }}>
                This app is built for timely alerts. Off = you miss matched events, paid gigs, sales moments, and personalised growth nudges.
              </Text>

              {/* Bullets */}
              {[
                { icon: 'flash-outline',      text: 'Urgent gigs — Paid, time-critical. No alert = you\'re not in the running.' },
                { icon: 'calendar-outline',   text: 'Events matched to you — Local + your interests. Off = your crowd fills the room without you.' },
                { icon: 'cash-outline',       text: 'Audio sales & drops — Off = others see it first.' },
                { icon: 'trending-up-outline', text: 'Personalised career tips — Right-time nudges to grow. Off = you\'re on your own.' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13, gap: 12 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(236,72,153,0.18)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Ionicons name={item.icon as any} size={15} color="#EC4899" />
                  </View>
                  <Text style={{ flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20 }}>{item.text}</Text>
                </View>
              ))}

              {/* Trust line */}
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20, lineHeight: 17 }}>
                You choose categories and quiet hours in the app — we don't blast you.
              </Text>

              {/* Primary CTA — context-aware label */}
              <TouchableOpacity
                style={{ borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}
                activeOpacity={0.85}
                onPress={async () => {
                  setShowNotifModal(false);
                  if (notifAlreadyDenied) {
                    Linking.openSettings();
                  } else {
                    await Notifications.requestPermissionsAsync();
                  }
                }}
              >
                <LinearGradient colors={['#EC4899', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 999 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                    {notifAlreadyDenied ? 'Open Settings' : 'Allow notifications'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary */}
              <TouchableOpacity onPress={() => setShowNotifModal(false)} activeOpacity={0.6} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14 }}>Not now</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for mini player
  },
  loadMoreContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadMoreText: {
    ...Typography.label,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.label,
  },
  errorContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.label,
    textAlign: 'center',
  },

});

