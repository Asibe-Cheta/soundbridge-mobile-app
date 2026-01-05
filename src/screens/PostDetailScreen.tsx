import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import { feedService } from '../services/api/feedService';
import { socialService } from '../services/api/socialService';
import { imageSaveService } from '../services/ImageSaveService';
import type { Post } from '../types/feed.types';
import { useToast } from '../contexts/ToastContext';

type PostDetailRouteProp = RouteProp<
  { PostDetail: { postId: string } },
  'PostDetail'
>;

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch post details
  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await feedService.getPostById(postId);
      setPost(postData);
    } catch (err: any) {
      console.error('❌ Failed to fetch post:', err);
      setError(err.message || 'Failed to load post');
      showToast('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactionPress = async (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    if (!post) return;
    try {
      const response = await feedService.reactToPost(post.id, reactionType);
      // Update local post state
      setPost({
        ...post,
        user_reaction: response.user_reaction,
        reactions_count: response.reactions_count,
      });
    } catch (err: any) {
      console.error('❌ Failed to react:', err);
      showToast(err.message || 'Failed to react to post', 'error');
    }
  };

  const handleCommentPress = () => {
    // TODO: Open comments modal
    console.log('📝 Comments modal not implemented yet');
  };

  const handleEditPost = (postToEdit: Post) => {
    // TODO: Open edit modal
    console.log('✏️ Edit post not implemented yet');
  };

  const handleDeletePost = async (postIdToDelete: string) => {
    try {
      await feedService.deletePost(postIdToDelete);
      showToast('Post deleted successfully', 'success');
      navigation.goBack();
    } catch (err: any) {
      console.error('❌ Failed to delete post:', err);
      showToast(err.message || 'Failed to delete post', 'error');
    }
  };

  const handleSharePost = async (postToShare: Post) => {
    // TODO: Implement share
    console.log('📤 Share post not implemented yet');
  };

  const handleSavePost = async (postIdToSave: string) => {
    try {
      await socialService.savePost(postIdToSave);
      if (post) {
        setPost({ ...post, is_saved: true });
      }
      showToast('Post saved', 'success');
    } catch (err: any) {
      console.error('❌ Failed to save post:', err);
      showToast(err.message || 'Failed to save post', 'error');
    }
  };

  const handleUnsavePost = async (postIdToUnsave: string) => {
    try {
      await socialService.unsavePost(postIdToUnsave);
      if (post) {
        setPost({ ...post, is_saved: false });
      }
      showToast('Post unsaved', 'success');
    } catch (err: any) {
      console.error('❌ Failed to unsave post:', err);
      showToast(err.message || 'Failed to unsave post', 'error');
    }
  };

  const handleSaveImage = async (imageUrl: string) => {
    try {
      const result = await imageSaveService.saveImageToGallery(imageUrl);
      if (result.success) {
        showToast('Image saved to gallery', 'success');
      } else {
        showToast(result.error || 'Failed to save image', 'error');
      }
    } catch (err: any) {
      console.error('❌ Failed to save image:', err);
      showToast('Failed to save image', 'error');
    }
  };

  const handleAuthorPress = (authorId: string) => {
    navigation.navigate('CreatorProfile' as never, { creatorId: authorId } as never);
  };

  const handleRepost = async (postToRepost: Post, withComment?: boolean, comment?: string) => {
    try {
      await feedService.repost(postToRepost.id, withComment, comment);
      // Update local post state
      const updatedPost = await feedService.getPostById(postToRepost.id);
      setPost(updatedPost);
      showToast(
        withComment ? 'Redropped with your thoughts!' : 'Redropped successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('❌ Failed to repost:', err);
      showToast(err.message || 'Failed to redrop', 'error');
    }
  };

  const handleTip = (authorId: string, authorName: string) => {
    // TODO: Open tip modal
    console.log('💰 Tip modal not implemented yet');
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        {/* Header with back button */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !post) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        {/* Header with back button */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {error || 'Post not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={fetchPost}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render post detail
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header with back button */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Post content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PostCard
          post={post}
          onPress={() => {
            // Already on post detail, do nothing
            // (Navigation for embedded reposts is handled internally by PostCard)
          }}
          onReactionPress={handleReactionPress}
          onCommentPress={handleCommentPress}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onShare={handleSharePost}
          onSave={handleSavePost}
          onUnsave={handleUnsavePost}
          onSaveImage={handleSaveImage}
          onAuthorPress={handleAuthorPress}
          onRepost={handleRepost}
          onTip={handleTip}
          isSaved={post.is_saved}
        />

        {/* TODO: Add comments section below the post */}
        <View style={styles.commentsPlaceholder}>
          <Text style={[styles.commentsPlaceholderText, { color: theme.colors.textSecondary }]}>
            Comments will appear here
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32, // Same width as back button for centering
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  commentsPlaceholder: {
    padding: 32,
    alignItems: 'center',
  },
  commentsPlaceholderText: {
    fontSize: 14,
  },
});
