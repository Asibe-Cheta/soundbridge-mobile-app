import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MentionTextInput } from './MentionTextInput';
import { MentionSuggestions } from './MentionSuggestions';
import { useMentions } from '../hooks/useMentions';
import type { Mention, MentionUser } from '../hooks/useMentions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { feedService } from '../services/api/feedService';
import type { PostType, PostVisibility, Post } from '../types/feed.types';
import { SystemTypography as Typography } from '../constants/Typography';
import AudioTrimmerModal from './AudioTrimmerModal';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    content: string;
    post_type: PostType;
    visibility: PostVisibility;
    image_url?: string;
    audio_url?: string;
    event_id?: string;
    /** Confirmed @mention references — passed to backend for notification dispatch. */
    mentions?: Mention[];
  }) => void;
  editingPost?: Post | null;
}

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'update', label: 'Update' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'event', label: 'Event' },
];

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'connections', label: 'Connections Only', icon: 'people' },
];

// LinkedIn uses 3000 characters; we match that limit
const MAX_CHARACTERS = 3000;
// LinkedIn allows up to 20 images per post
const MAX_IMAGES = 20;

export default function CreatePostModal({ visible, onClose, onSubmit, editingPost }: CreatePostModalProps) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const navigation = useNavigation();

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('update');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioClipDuration, setAudioClipDuration] = useState<number | null>(null);
  const [compressingImages, setCompressingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  // Audio attachment options
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [pendingTrimUri, setPendingTrimUri] = useState<string | null>(null);
  const [pendingTrimFileName, setPendingTrimFileName] = useState('');

  const isPremiumOrUnlimited =
    userProfile?.subscription_tier === 'premium' ||
    userProfile?.subscription_tier === 'unlimited';

  // ── @mention refs ─────────────────────────────────────────
  const textInputRef = useRef<TextInput>(null);
  // Set to true when Enter is intercepted for mention selection; cleared in handleContentChange
  const enterInterceptedRef = useRef(false);
  // Holds the pre-computed content to apply when an intercepted Enter fires onChangeText
  const pendingContentRef = useRef<string | null>(null);

  const {
    suggestions: mentionSuggestions,
    loading: mentionLoading,
    selectedIndex: mentionSelectedIndex,
    confirmedMentions,
    isDropdownVisible,
    handleSelectionChange: mentionOnSelectionChange,
    handleTextChange: mentionOnTextChange,
    selectMention,
    dismissSuggestions,
    moveSelectionUp,
    moveSelectionDown,
  } = useMentions();

  const characterCount = content.length;
  const nearLimit = characterCount >= MAX_CHARACTERS * 0.8; // show counter at 80 %
  const canPublish = content.trim().length >= 10 && characterCount <= MAX_CHARACTERS;

  // Populate form when editing
  useEffect(() => {
    if (editingPost && visible) {
      setContent(editingPost.content);
      setPostType(editingPost.post_type);
      setVisibility(editingPost.visibility);
      // Use the full image array if available, fall back to single image_url
      setImageUris(
        editingPost.image_urls && editingPost.image_urls.length > 0
          ? editingPost.image_urls
          : editingPost.image_url
          ? [editingPost.image_url]
          : []
      );
      setAudioUri(editingPost.audio_url || null);
      setAudioClipDuration(null);
    } else if (!editingPost && visible) {
      setContent('');
      setPostType('update');
      setVisibility('public');
      setImageUris([]);
      setAudioUri(null);
      setAudioClipDuration(null);
    }
  }, [editingPost, visible]);

  // ── Mention-aware content change handler ─────────────────
  const handleContentChange = (text: string) => {
    if (enterInterceptedRef.current) {
      // An Enter keypress was intercepted to select a mention.
      // The native TextInput still fires onChangeText with the newline appended,
      // so we discard it and apply the pre-computed mention content instead.
      enterInterceptedRef.current = false;
      const resolved = pendingContentRef.current ?? text.replace(/\n$/, '');
      pendingContentRef.current = null;
      setContent(resolved);
      mentionOnTextChange(resolved);
      return;
    }
    setContent(text);
    mentionOnTextChange(text);
  };

  const handleInputSelectionChange = ({ nativeEvent: { selection } }: any) => {
    mentionOnSelectionChange(selection, content);
  };

  // Hardware-keyboard navigation (arrow keys, Enter, Escape) for the mention dropdown
  const handleKeyPress = ({ nativeEvent: { key } }: any) => {
    if (!isDropdownVisible) return;
    if (key === '\n' && mentionSuggestions.length > 0) {
      enterInterceptedRef.current = true;
      pendingContentRef.current = selectMention(mentionSuggestions[mentionSelectedIndex], content);
      return;
    }
    if (key === 'Escape') { dismissSuggestions(); return; }
    if (key === 'ArrowUp') { moveSelectionUp(); return; }
    if (key === 'ArrowDown') { moveSelectionDown(mentionSuggestions.length); return; }
  };

  const handleMentionSelect = (user: MentionUser) => {
    const newContent = selectMention(user, content);
    setContent(newContent);
    // Re-focus the input after selection so typing continues seamlessly
    textInputRef.current?.focus();
  };

  const handleClose = () => {
    if (content.trim().length > 0) {
      setContent('');
      setImageUris([]);
      onClose();
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!canPublish || !onSubmit || uploadingPost) return;

    setUploadingPost(true);
    try {
      if (editingPost) {
        // ── EDIT MODE: update text fields only, then upload any new local images ──
        await feedService.updatePost(editingPost.id, {
          content: content.trim(),
          post_type: postType,
          visibility,
        });

        // Only upload images that are new local files (not already-remote URLs)
        const newLocalImages = imageUris.filter((uri) => !uri.startsWith('http'));
        if (newLocalImages.length > 0) {
          setUploadingImage(true);
          for (const uri of newLocalImages) {
            try {
              await feedService.uploadImage(uri, editingPost.id);
            } catch (err: any) {
              console.error('Image upload error:', err);
              Alert.alert('Upload Error', err.message || 'Failed to upload an image. Please try again.');
              setUploadingImage(false);
              setUploadingPost(false);
              return;
            }
          }
          setUploadingImage(false);
        }
      } else {
        // ── CREATE MODE: create new post then upload attachments ──
        const newPost = await feedService.createPost({
          content: content.trim(),
          post_type: postType,
          visibility,
        });

        if (imageUris.length > 0) {
          setUploadingImage(true);
          for (const uri of imageUris) {
            try {
              await feedService.uploadImage(uri, newPost.id);
            } catch (err: any) {
              console.error('Image upload error:', err);
              Alert.alert('Upload Error', err.message || 'Failed to upload an image. Please try again.');
              setUploadingImage(false);
              setUploadingPost(false);
              return;
            }
          }
          setUploadingImage(false);
        }

        if (audioUri && audioUri.trim() !== '') {
          setUploadingAudio(true);
          try {
            await feedService.uploadAudio(audioUri, newPost.id);
          } catch (err: any) {
            console.error('Audio upload error:', err);
            Alert.alert('Upload Error', err.message || 'Failed to upload audio. Please try again.');
            setUploadingAudio(false);
            setUploadingPost(false);
            return;
          }
          setUploadingAudio(false);
        }
      }

      onSubmit({
        content: content.trim(),
        post_type: postType,
        visibility,
        mentions: confirmedMentions,
      });

      setContent('');
      setImageUris([]);
      setAudioUri(null);
      setAudioClipDuration(null);
      setPostType('update');
      setVisibility('public');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || `Failed to ${editingPost ? 'update' : 'create'} drop. Please try again.`);
    } finally {
      setUploadingPost(false);
    }
  };

  const handleImagePress = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert('Maximum Photos', `You can add up to ${MAX_IMAGES} photos per drop.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select photos.');
        return;
      }

      const remaining = MAX_IMAGES - imageUris.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1, // pick full quality — compression happens below
      });

      if (!result.canceled && result.assets.length > 0) {
        // Guard against extremely large raw files (e.g. 50 MB+ RAW shoots)
        const wayTooLarge = result.assets.filter(a => a.fileSize && a.fileSize > 50 * 1024 * 1024);
        if (wayTooLarge.length > 0) {
          Alert.alert('File Too Large', `${wayTooLarge.length} photo(s) are too large to process and were skipped.`);
        }
        const picked = result.assets
          .filter(a => !a.fileSize || a.fileSize <= 50 * 1024 * 1024)
          .map(a => a.uri);

        if (picked.length === 0) return;

        // Compress all images in parallel: resize to 1200px wide, convert to JPEG at 80% quality
        // Typical output: 200–600 KB regardless of input size (native code, fast)
        setCompressingImages(true);
        try {
          const compressed = await Promise.all(
            picked.map(uri =>
              ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
              ).then(r => r.uri)
            )
          );
          setImageUris(prev => [...prev, ...compressed].slice(0, MAX_IMAGES));
        } finally {
          setCompressingImages(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setCompressingImages(false);
      Alert.alert('Error', 'Failed to pick photos. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleAudioPress = () => {
    if (audioUri) {
      Alert.alert('Replace Audio', 'This will replace the current audio attachment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: () => setShowAudioOptions(true) },
      ]);
    } else {
      setShowAudioOptions(true);
    }
  };

  // Direct upload (existing behaviour — no trimmer)
  const handleUploadClip = async () => {
    setShowAudioOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Audio files must be under 10 MB');
          return;
        }
        setAudioUri(asset.uri);
        setAudioClipDuration(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  // Trim from track — Premium/Unlimited only
  const handleTrimOption = async () => {
    if (!isPremiumOrUnlimited) {
      setShowAudioOptions(false);
      Alert.alert(
        'Premium Feature',
        'The audio trimmer is available on Premium and Unlimited plans.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'View plans',
            onPress: () => {
              onClose();
              navigation.navigate('Upgrade' as never);
            },
          },
        ]
      );
      return;
    }
    setShowAudioOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingTrimUri(result.assets[0].uri);
        setPendingTrimFileName(result.assets[0].name || 'Audio file');
        setShowTrimmer(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const handleTrimConfirm = (trimmedUri: string, durationSeconds: number) => {
    setShowTrimmer(false);
    setPendingTrimUri(null);
    setAudioUri(trimmedUri);
    setAudioClipDuration(durationSeconds);
  };

  const handleTrimCancel = () => {
    setShowTrimmer(false);
    setPendingTrimUri(null);
  };

  const handleEventPress = () => {
    console.log('Event picker - to be implemented in Phase 2');
  };

  // Render the multi-image grid (mirrors LinkedIn's 1/2/3/4+ layouts)
  const renderImageGrid = () => {
    if (imageUris.length === 0) return null;

    const count = imageUris.length;

    return (
      <View style={styles.previewSection}>
        {(compressingImages || uploadingImage) && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.uploadingText, { color: theme.colors.text }]}>
              {compressingImages ? 'Optimising photos…' : 'Uploading photos…'}
            </Text>
          </View>
        )}

        {/* Grid layout */}
        <View style={styles.imageGrid}>
          {count === 1 && (
            <View style={styles.gridSingle}>
              <Image source={{ uri: imageUris[0] }} style={styles.gridSingleImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(0)}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {count === 2 && (
            <View style={styles.gridRow}>
              {imageUris.map((uri, i) => (
                <View key={i} style={styles.gridHalf}>
                  <Image source={{ uri }} style={styles.gridHalfImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {count === 3 && (
            <View style={styles.gridRow}>
              {/* Large left image */}
              <View style={styles.gridThirdLeft}>
                <Image source={{ uri: imageUris[0] }} style={styles.gridThirdLeftImage} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(0)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {/* Two small stacked on the right */}
              <View style={styles.gridThirdRight}>
                {imageUris.slice(1).map((uri, i) => (
                  <View key={i} style={styles.gridThirdRightItem}>
                    <Image source={{ uri }} style={styles.gridThirdRightImage} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(i + 1)}>
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {count >= 4 && (
            <View style={styles.gridWrap}>
              {imageUris.map((uri, i) => (
                <View key={i} style={styles.gridQuarter}>
                  <Image source={{ uri }} style={styles.gridQuarterImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Add more photos tap target */}
        {count < MAX_IMAGES && (
          <TouchableOpacity
            style={[styles.addMorePhotosBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, opacity: compressingImages ? 0.5 : 1 }]}
            onPress={handleImagePress}
            disabled={compressingImages}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.addMorePhotosText, { color: theme.colors.primary }]}>
              Add more photos ({count}/{MAX_IMAGES})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.backgroundGradient.end }]}
        edges={['top']}
      >
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.gradientBackground}
        >
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: 'transparent',
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                {editingPost ? 'Edit Drop' : 'New Drop'}
              </Text>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canPublish || uploadingPost || compressingImages}
                style={[
                  styles.publishButton,
                  {
                    backgroundColor: canPublish && !uploadingPost && !compressingImages ? theme.colors.primary : theme.colors.surface,
                  },
                ]}
              >
                {uploadingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.publishText,
                      {
                        color: canPublish ? '#FFFFFF' : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Publish
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={dismissSuggestions}
            >
              {/* Post Type Selector */}
              <View style={styles.postTypeSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeChipsRow}
                  contentContainerStyle={styles.typeChipsContent}
                >
                  {POST_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor:
                            postType === type.value ? theme.colors.primary : theme.colors.surface,
                          borderColor:
                            postType === type.value ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setPostType(type.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: postType === type.value ? '#FFFFFF' : theme.colors.text,
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Input Area */}
              <View style={styles.inputSection}>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {/* Avatar */}
                  <View
                    style={[
                      styles.inputAvatar,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    {userProfile?.avatar_url ? (
                      <Image
                        source={{ uri: userProfile.avatar_url }}
                        style={styles.inputAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                    )}
                  </View>

                  {/* Text Input — grows with content, no hard cap visible to user */}
                  <View style={styles.inputWrapper}>
                    <MentionTextInput
                      ref={textInputRef}
                      style={styles.textInput}
                      sharedTextStyle={{ color: theme.colors.text }}
                      placeholder="Share your thoughts, opportunities, or achievements…"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={content}
                      onChangeText={handleContentChange}
                      onSelectionChange={handleInputSelectionChange}
                      onKeyPress={handleKeyPress}
                      onBlur={dismissSuggestions}
                      multiline
                      maxLength={MAX_CHARACTERS}
                      textAlignVertical="top"
                      autoFocus
                      scrollEnabled={false}
                      mentionUsernames={confirmedMentions.map(m => m.username)}
                      mentionColor={theme.colors.primary}
                    />

                    {/* @mention suggestions dropdown */}
                    {isDropdownVisible && (
                      <MentionSuggestions
                        suggestions={mentionSuggestions}
                        loading={mentionLoading}
                        selectedIndex={mentionSelectedIndex}
                        onSelect={handleMentionSelect}
                        onDismiss={dismissSuggestions}
                      />
                    )}

                    {/* Only show counter when approaching the limit */}
                    {nearLimit && (
                      <Text
                        style={[
                          styles.characterCount,
                          {
                            color:
                              characterCount > MAX_CHARACTERS * 0.97
                                ? theme.colors.error ?? '#EF4444'
                                : theme.colors.warning ?? '#F59E0B',
                          },
                        ]}
                      >
                        {MAX_CHARACTERS - characterCount} left
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Multi-image grid */}
              {renderImageGrid()}

              {/* Audio Preview */}
              {audioUri && (
                <View style={styles.previewSection}>
                  <View
                    style={[
                      styles.audioPreview,
                      {
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        borderColor: 'rgba(124, 58, 237, 0.2)',
                      },
                    ]}
                  >
                    {uploadingAudio ? (
                      <View style={styles.audioUploading}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.uploadingText, { color: theme.colors.text }]}>
                          Uploading audio…
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="musical-notes" size={24} color="#7C3AED" />
                        <View style={styles.audioInfo}>
                          <Text style={[styles.audioTitle, { color: theme.colors.text }]}>
                            {audioClipDuration !== null ? 'Trimmed Clip' : 'Audio Preview'}
                          </Text>
                          <Text style={[styles.audioDuration, { color: theme.colors.textSecondary }]}>
                            {audioClipDuration !== null
                              ? `${audioClipDuration}s · Ready to upload`
                              : 'Ready to upload'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => setAudioUri(null)}>
                          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Attachment Options */}
              <View style={styles.attachmentSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Add to your drop:
                </Text>
                <View style={styles.attachmentButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.attachmentButton,
                      {
                        backgroundColor: imageUris.length > 0 ? 'rgba(124,58,237,0.1)' : theme.colors.surface,
                        borderColor: imageUris.length > 0 ? theme.colors.primary : theme.colors.border,
                        opacity: compressingImages ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleImagePress}
                    disabled={compressingImages}
                  >
                    <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.attachmentButtonText, { color: theme.colors.text }]}>
                      {imageUris.length > 0 ? `Photos (${imageUris.length})` : 'Photo'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.attachmentButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleAudioPress}
                  >
                    <Ionicons name="musical-notes-outline" size={20} color="#7C3AED" />
                    <Text style={[styles.attachmentButtonText, { color: theme.colors.text }]}>
                      Audio
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.attachmentButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleEventPress}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.accentBlue} />
                    <Text style={[styles.attachmentButtonText, { color: theme.colors.text }]}>
                      Event
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Visibility Selector */}
              <View style={styles.visibilitySection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Visible to:</Text>
                <TouchableOpacity
                  style={[
                    styles.visibilityDropdown,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowVisibilityPicker(!showVisibilityPicker)}
                >
                  <View style={styles.visibilityDropdownLeft}>
                    <Ionicons
                      name={visibility === 'public' ? 'globe' : 'people'}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.visibilityText, { color: theme.colors.text }]}>
                      {VISIBILITY_OPTIONS.find((opt) => opt.value === visibility)?.label || 'Public'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {showVisibilityPicker && (
                  <View
                    style={[
                      styles.visibilityPicker,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.visibilityOption}
                        onPress={() => {
                          setVisibility(option.value);
                          setShowVisibilityPicker(false);
                        }}
                      >
                        <Ionicons name={option.icon as any} size={20} color={theme.colors.primary} />
                        <Text style={[styles.visibilityOptionText, { color: theme.colors.text }]}>
                          {option.label}
                        </Text>
                        {visibility === option.value && (
                          <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Bottom breathing room so content clears the keyboard */}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>

      {/* Audio options bottom sheet */}
      <Modal
        visible={showAudioOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAudioOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAudioOptions(false)}>
          <View style={styles.audioOptionsOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.audioOptionsSheet, {
                backgroundColor: theme.isDark ? '#1a1a2e' : '#fff',
                borderColor: theme.colors.border,
              }]}>
                <Text style={[styles.audioOptionsTitle, { color: theme.colors.text }]}>Add Audio</Text>

                {/* Upload a clip */}
                <TouchableOpacity style={styles.audioOption} onPress={handleUploadClip} activeOpacity={0.7}>
                  <View style={[styles.audioOptionIcon, { backgroundColor: 'rgba(124,58,237,0.1)' }]}>
                    <Ionicons name="document-attach-outline" size={22} color="#7c3aed" />
                  </View>
                  <View style={styles.audioOptionInfo}>
                    <Text style={[styles.audioOptionLabel, { color: theme.colors.text }]}>Upload a clip</Text>
                    <Text style={[styles.audioOptionDesc, { color: theme.colors.textSecondary }]}>
                      Choose a pre-trimmed audio file (max 10 MB)
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Trim from track */}
                <TouchableOpacity style={styles.audioOption} onPress={handleTrimOption} activeOpacity={0.7}>
                  <View style={[styles.audioOptionIcon, {
                    backgroundColor: isPremiumOrUnlimited
                      ? 'rgba(124,58,237,0.1)'
                      : 'rgba(156,163,175,0.1)',
                  }]}>
                    <Ionicons
                      name={isPremiumOrUnlimited ? 'cut-outline' : 'lock-closed-outline'}
                      size={22}
                      color={isPremiumOrUnlimited ? '#7c3aed' : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.audioOptionInfo}>
                    <View style={styles.audioOptionLabelRow}>
                      <Text style={[styles.audioOptionLabel, {
                        color: isPremiumOrUnlimited ? theme.colors.text : theme.colors.textSecondary,
                      }]}>
                        Trim from track
                      </Text>
                      {!isPremiumOrUnlimited && (
                        <View style={styles.premiumTag}>
                          <Text style={styles.premiumTagText}>Premium</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.audioOptionDesc, { color: theme.colors.textSecondary }]}>
                      {isPremiumOrUnlimited
                        ? 'Select exactly which 60 seconds to use'
                        : 'Available on Premium and Unlimited plans'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Modal>

    {/* Audio trimmer — rendered outside the main Modal so it can present full screen */}
    {showTrimmer && pendingTrimUri ? (
      <AudioTrimmerModal
        visible={showTrimmer}
        audioUri={pendingTrimUri}
        fileName={pendingTrimFileName}
        onConfirm={handleTrimConfirm}
        onCancel={handleTrimCancel}
      />
    ) : null}
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  closeButton: {
    padding: 8,
    marginRight: 4,
    minWidth: 40,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
    textAlign: 'center',
    zIndex: -1,
  },
  publishButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  publishText: {
    ...Typography.button,
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  postTypeSection: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  typeChipsRow: {
    flexGrow: 0,
  },
  typeChipsContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.button,
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  inputAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    ...Typography.body,
    fontSize: 15,
    minHeight: 120,
  },
  characterCount: {
    ...Typography.label,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },

  // ── Multi-image grid ──────────────────────────────────────
  previewSection: {
    marginBottom: 20,
  },
  uploadOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  uploadingText: {
    marginTop: 8,
    ...Typography.label,
    fontSize: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 4,
  },
  imageGrid: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  // 1 image — full width 16:9
  gridSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  gridSingleImage: {
    width: '100%',
    height: '100%',
  },
  // 2 images — side by side
  gridRow: {
    flexDirection: 'row',
    gap: 2,
  },
  gridHalf: {
    flex: 1,
    aspectRatio: 1,
  },
  gridHalfImage: {
    width: '100%',
    height: '100%',
  },
  // 3 images — 1 large left, 2 stacked right
  gridThirdLeft: {
    flex: 1,
    aspectRatio: 0.75,
  },
  gridThirdLeftImage: {
    width: '100%',
    height: '100%',
  },
  gridThirdRight: {
    flex: 1,
    gap: 2,
  },
  gridThirdRightItem: {
    flex: 1,
  },
  gridThirdRightImage: {
    width: '100%',
    height: '100%',
  },
  // 4+ images — 2-column grid
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridQuarter: {
    width: '49%',
    aspectRatio: 1,
  },
  gridQuarterImage: {
    width: '100%',
    height: '100%',
  },
  // Add more photos row
  addMorePhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  addMorePhotosText: {
    ...Typography.button,
    fontSize: 13,
  },

  // ── Audio preview ────────────────────────────────────────
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    ...Typography.button,
    fontSize: 14,
    marginBottom: 4,
  },
  audioDuration: {
    ...Typography.label,
    fontSize: 12,
  },
  audioUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  // ── Attachments row ───────────────────────────────────────
  attachmentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...Typography.button,
    fontSize: 15,
    marginBottom: 12,
  },
  attachmentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentButtonText: {
    ...Typography.button,
    fontSize: 14,
  },

  // ── Visibility picker ─────────────────────────────────────
  visibilitySection: {
    marginBottom: 20,
  },
  visibilityDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  visibilityText: {
    ...Typography.button,
    fontSize: 15,
  },
  visibilityPicker: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  visibilityOptionText: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
  },

  bottomSpacer: {
    height: 80,
  },

  // ── Audio options modal ───────────────────────────────────
  audioOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  audioOptionsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 44,
  },
  audioOptionsTitle: {
    ...Typography.button,
    fontSize: 17,
    marginBottom: 16,
  },
  audioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  audioOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioOptionInfo: {
    flex: 1,
  },
  audioOptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  audioOptionLabel: {
    ...Typography.button,
    fontSize: 16,
  },
  audioOptionDesc: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  premiumTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
  },
  premiumTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});
