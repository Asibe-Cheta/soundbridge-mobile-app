import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import { useFeed } from '../hooks/useFeed';
import CreatePostPrompt from '../components/CreatePostPrompt';
import LiveAudioBanner from '../components/LiveAudioBanner';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import CommentsModal from '../modals/CommentsModal';
import { feedService } from '../services/api/feedService';
import { deepLinkingService } from '../services/DeepLinkingService';
import { socialService } from '../services/api/socialService';
import { imageSaveService } from '../services/ImageSaveService';
import { Alert } from 'react-native';

export default function FeedScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
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
  } = useFeed();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

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
    // TODO: Navigate to post details in future phase
    console.log('Post pressed:', postId);
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
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      await deepLinkingService.sharePost(post.id, post.content.substring(0, 100));
    } catch (error) {
      console.error('Failed to share post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
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
        await loadFeed();
        
        Alert.alert('Success', '✅ Repost removed successfully!');
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
        await loadFeed();
        
        Alert.alert('Success', '✅ Post reposted successfully!');
      }
    } catch (error: any) {
      console.error('❌ Failed to repost/unrepost:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to complete action. Please try again.'
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
      Alert.alert('Error', 'Failed to save post. Please try again.');
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
              data={posts}
              renderItem={({ item }) => (
                <PostCard
                  key={item.id}
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
              keyExtractor={(item) => item.id}
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
                  <CreatePostPrompt onPress={handleCreatePost} />
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
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                      Loading feed...
                    </Text>
                  </View>
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
              await feedService.updatePost(editingPost.id, data);
              await refresh();
              setEditingPost(null);
              setIsCreateModalVisible(false);
            } catch (error) {
              console.error('Failed to update post:', error);
              Alert.alert('Error', 'Failed to update post. Please try again.');
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
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

