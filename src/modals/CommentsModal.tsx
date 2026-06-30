import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  FlatList,
  Keyboard,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types/feed.types';
import { Connection } from '../types/network.types';
import { useComments } from '../hooks/useComments';
import CommentCard from '../components/CommentCard';
import { networkService } from '../services/api/networkService';
import { uploadImage } from '../services/UploadService';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Sheet opens at ~60% of screen height
const SHEET_INITIAL_H = Math.round(SCREEN_HEIGHT * 0.60);

interface CommentsModalProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onViewFullPost?: (postId: string) => void;
}

export default function CommentsModal({
  visible,
  post,
  onClose,
  onViewFullPost,
}: CommentsModalProps) {
  const { theme } = useTheme();
  const { userProfile, user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    comments,
    loading,
    hasMore,
    error,
    addComment: addCommentAPI,
    likeComment,
    deleteComment,
    repliesMap,
    loadingRepliesSet,
    loadReplies,
    loadMore,
  } = useComments(post.id);

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Plain state for height/bottom — updated on keyboardWillShow (before keyboard animates)
  // so changes appear synchronized. Cannot be Animated.Value on same view as native-driver translateY.
  const [sheetHeight, setSheetHeight] = useState(SHEET_INITIAL_H);
  const [sheetBottom, setSheetBottom] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Image attachment
  const [imageAttachment, setImageAttachment] = useState<{ uri: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // @ mentions
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // slideAnim drives translateY only — native driver is safe here
  const slideAnim = useRef(new Animated.Value(SHEET_INITIAL_H)).current;

  // Slide the sheet in / reset when visibility changes
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SHEET_INITIAL_H);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    } else {
      slideAnim.setValue(SHEET_INITIAL_H);
      setKeyboardHeight(0);
      setSheetHeight(SHEET_INITIAL_H);
      setSheetBottom(0);
      setNewComment('');
      setReplyingTo(null);
      setReplyingToName('');
      setImageAttachment(null);
      setShowMentionsList(false);
    }
  }, [visible]);

  // Track keyboard and resize sheet via plain state (not Animated.Value)
  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      const kbH = e.endCoordinates.height;
      setKeyboardHeight(kbH);
      setSheetHeight(SCREEN_HEIGHT - kbH - insets.top - 24);
      setSheetBottom(kbH);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setSheetHeight(SHEET_INITIAL_H);
      setSheetBottom(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [visible, insets.top]);

  // Backdrop fades in as the sheet slides up (opacity is native-driver safe)
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, SHEET_INITIAL_H],
    outputRange: [0.55, 0],
    extrapolate: 'clamp',
  });

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onClose();
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageAttachment({ uri: result.assets[0].uri });
    }
  };

  // ── @ mentions ────────────────────────────────────────────────────────────
  const handleAtPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showMentionsList) {
      setShowMentionsList(false);
      return;
    }
    setShowMentionsList(true);
    if (connections.length === 0) {
      setLoadingConnections(true);
      try {
        const { connections: conns } = await networkService.getConnections(1, 50);
        setConnections(conns);
      } catch {
        // silent fail — list stays empty
      } finally {
        setLoadingConnections(false);
      }
    }
  };

  const handleMentionSelect = (conn: Connection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const handle = conn.user.username || conn.user.display_name;
    setNewComment((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} @${handle} ` : `@${handle} `;
    });
    setShowMentionsList(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const hasText = newComment.trim().length > 0;
    const hasImage = imageAttachment !== null;
    if ((!hasText && !hasImage) || isPosting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = newComment.trim();
    setNewComment('');
    setReplyingTo(null);
    setReplyingToName('');
    setIsPosting(true);

    let imageUrl: string | undefined;
    if (hasImage && imageAttachment && user?.id) {
      setIsUploadingImage(true);
      try {
        const ext = imageAttachment.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const result = await uploadImage(
          user.id,
          { uri: imageAttachment.uri, name: `comment-${Date.now()}.${ext}`, type: mimeType },
          'post-attachments'
        );
        if (result.success && result.data?.url) {
          imageUrl = result.data.url;
        }
      } catch (err) {
        console.error('Failed to upload comment image:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }
    setImageAttachment(null);

    try {
      await addCommentAPI(text, replyingTo || undefined, imageUrl);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try { await likeComment(commentId); }
    catch (err) { console.error('Failed to like comment:', err); }
  };

  const handleDelete = async (commentId: string) => {
    try { await deleteComment(commentId); }
    catch (err) { console.error('Failed to delete comment:', err); }
  };

  const handleReply = (commentId: string) => {
    let comment = comments.find((c) => c.id === commentId);
    if (!comment) {
      for (const replies of Object.values(repliesMap)) {
        const found = replies.find((c) => c.id === commentId);
        if (found) { comment = found; break; }
      }
    }
    if (comment) {
      setReplyingTo(commentId);
      setReplyingToName(comment.user?.display_name || comment.user?.username || 'user');
      inputRef.current?.focus();
    }
  };

  const handlePressAuthor = (userId: string) => {
    if (!userId || userId === 'current-user') return;
    navigation.navigate('CreatorProfile' as never, { creatorId: userId } as never);
    onClose();
  };

  const handleViewReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
        loadReplies(commentId);
      }
      return next;
    });
  };

  const getRepliesForComment = (id: string) => repliesMap[id] ?? [];
  const canSend = (newComment.trim().length > 0 || imageAttachment !== null) && !isPosting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Semi-transparent backdrop — tap to close */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* The sheet itself */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            bottom: sheetBottom,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Filter row */}
        <TouchableOpacity
          style={[styles.filterRow, { borderBottomColor: theme.colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: theme.colors.text }]}>Most relevant</Text>
          <Ionicons name="chevron-down" size={15} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Main content: comments list OR mentions list */}
        {showMentionsList ? (
          /* ── Connections / mentions list ── */
          <FlatList
            style={styles.list}
            data={connections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
            ListEmptyComponent={
              loadingConnections ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Loading connections...
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={36} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No connections found
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mentionRow, { borderBottomColor: theme.colors.border }]}
                onPress={() => handleMentionSelect(item)}
                activeOpacity={0.7}
              >
                {item.user.avatar_url ? (
                  <Image source={{ uri: item.user.avatar_url }} style={styles.mentionAvatar} />
                ) : (
                  <View style={[styles.mentionAvatar, styles.mentionAvatarFallback, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.mentionInfo}>
                  <Text style={[styles.mentionName, { color: theme.colors.text }]}>
                    {item.user.display_name}
                  </Text>
                  {item.user.headline ? (
                    <Text style={[styles.mentionHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {item.user.headline}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          /* ── Comments list ── */
          <FlatList
            style={styles.list}
            data={comments.filter((item) => item && item.id && !item.parent_comment_id)}
            keyExtractor={(item, i) => item?.id || `comment-${i}`}
            renderItem={({ item }) => {
              if (!item?.id) return null;
              return (
                <CommentCard
                  comment={item}
                  currentUserId={user?.id}
                  postAuthorId={post.author?.id}
                  onLike={handleLike}
                  onReply={handleReply}
                  onViewReplies={handleViewReplies}
                  onDelete={handleDelete}
                  onPressAuthor={handlePressAuthor}
                  showReplies={expandedReplies.has(item.id)}
                  replies={getRepliesForComment(item.id)}
                  loadingReplies={loadingRepliesSet.has(item.id)}
                  expandedReplies={expandedReplies}
                  repliesMap={repliesMap}
                  loadingRepliesSet={loadingRepliesSet}
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Loading comments...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Couldn't load comments. Pull down to retry.
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={40} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No comments yet. Be the first!
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              hasMore && comments.length > 0 ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loading}>
                  <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                    {loading ? 'Loading...' : 'Load more comments'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        {/* Input section — sits at sheet bottom, above keyboard (sheet already moved) */}
        <View
          style={[
            styles.inputSection,
            {
              borderTopColor: theme.colors.border,
              paddingBottom: keyboardHeight > 0 ? 16 : insets.bottom + 12,
            },
          ]}
        >
          {/* Replying-to banner */}
          {replyingTo && (
            <View style={[styles.replyBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.replyBannerText, { color: theme.colors.textSecondary }]}>
                Replying to{' '}
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>@{replyingToName}</Text>
              </Text>
              <TouchableOpacity onPress={() => { setReplyingTo(null); setReplyingToName(''); }}>
                <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Row 1: Avatar + input bubble (with optional image preview inside) */}
          <View style={styles.inputRow}>
            {userProfile?.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.inputAvatar} />
            ) : (
              <View style={[styles.inputAvatar, styles.inputAvatarFallback, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={[styles.inputBubble, { backgroundColor: theme.colors.card }]}>
              <TextInput
                ref={inputRef}
                style={[styles.textInput, { color: theme.colors.text }]}
                placeholder="Leave your thoughts here..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                maxLength={500}
                multiline
              />
              {/* Image preview inside bubble */}
              {imageAttachment && (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: imageAttachment.uri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.imageRemoveBtn}
                    onPress={() => setImageAttachment(null)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={13} color="#DC2626" />
                  </TouchableOpacity>
                  {isUploadingImage && (
                    <View style={styles.imageUploadOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Row 2: Toolbar */}
          <View style={styles.toolbarRow}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={handlePickImage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                showMentionsList && { backgroundColor: theme.colors.primary + '22' },
              ]}
              onPress={handleAtPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.atSign, { color: showMentionsList ? theme.colors.primary : theme.colors.textSecondary }]}>@</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[
                styles.commentButton,
                canSend
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              {isPosting || isUploadingImage ? (
                <ActivityIndicator size="small" color={canSend ? '#fff' : theme.colors.textSecondary} />
              ) : (
                <Text style={[styles.commentButtonText, { color: canSend ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  Comment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Mentions list
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  mentionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  mentionAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  mentionHeadline: {
    fontSize: 13,
    marginTop: 2,
  },
  // Input section
  inputSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  replyBannerText: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 2,
    overflow: 'hidden',
  },
  inputAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBubble: {
    flex: 1,
    borderRadius: 16,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
    padding: 0,
  },
  imagePreviewWrapper: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    width: 120,
    height: 90,
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.35)',
  },
  imageUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 46,
    gap: 4,
  },
  toolbarBtn: {
    padding: 6,
    borderRadius: 8,
  },
  atSign: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  commentButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
