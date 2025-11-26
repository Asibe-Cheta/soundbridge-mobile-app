import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { feedService } from '../services/api/feedService';
import type { PostType, PostVisibility, Post } from '../types/feed.types';

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

export default function CreatePostModal({ visible, onClose, onSubmit, editingPost }: CreatePostModalProps) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('update');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  const characterCount = content.length;
  const maxCharacters = 500;
  const canPublish = content.trim().length >= 10 && content.trim().length <= maxCharacters;

  // Populate form when editing
  useEffect(() => {
    if (editingPost && visible) {
      setContent(editingPost.content);
      setPostType(editingPost.post_type);
      setVisibility(editingPost.visibility);
      setImageUri(editingPost.image_url || null);
      setAudioUri(editingPost.audio_url || null);
    } else if (!editingPost && visible) {
      // Reset form for new post
      setContent('');
      setPostType('update');
      setVisibility('public');
      setImageUri(null);
      setAudioUri(null);
    }
  }, [editingPost, visible]);

  const handleClose = () => {
    if (content.trim().length > 0) {
      // In a real app, show confirmation dialog
      // For now, just clear and close
      setContent('');
      setImageUri(null);
      onClose();
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!canPublish || !onSubmit || uploadingPost) return;

    setUploadingPost(true);
    try {
      let imageUrl: string | undefined;
      let audioUrl: string | undefined;

      // Upload image if selected
      if (imageUri) {
        setUploadingImage(true);
        try {
          imageUrl = await feedService.uploadImage(imageUri);
        } catch (err) {
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
          setUploadingImage(false);
          setUploadingPost(false);
          return;
        }
        setUploadingImage(false);
      }

      // Upload audio if selected
      if (audioUri) {
        setUploadingAudio(true);
        try {
          audioUrl = await feedService.uploadAudio(audioUri);
        } catch (err) {
          Alert.alert('Upload Error', 'Failed to upload audio. Please try again.');
          setUploadingAudio(false);
          setUploadingPost(false);
          return;
        }
        setUploadingAudio(false);
      }

      // Create post via API
      const newPost = await feedService.createPost({
        content: content.trim(),
        post_type: postType,
        visibility,
        image_url: imageUrl,
        audio_url: audioUrl,
      });

      // Call onSubmit callback
      onSubmit({
        content: content.trim(),
        post_type: postType,
        visibility,
        image_url: imageUrl,
        audio_url: audioUrl,
      });

      // Reset form
      setContent('');
      setImageUri(null);
      setAudioUri(null);
      setPostType('update');
      setVisibility('public');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create post. Please try again.');
    } finally {
      setUploadingPost(false);
    }
  };

  const handleImagePress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Validate file size (3MB limit)
        if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Images must be under 3MB');
          return;
        }
        setImageUri(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleAudioPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Validate file size (10MB limit) and duration (60s max)
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Audio files must be under 10MB');
          return;
        }
        // Note: Duration validation would require audio metadata extraction
        // For now, we'll rely on backend validation
        setAudioUri(asset.uri);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const handleEventPress = () => {
    // TODO: Implement event picker in Phase 2
    console.log('Event picker - to be implemented in Phase 2');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
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
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              {editingPost ? 'Edit Post' : 'New Post'}
            </Text>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!canPublish || uploadingPost}
                  style={[
                    styles.publishButton,
                    {
                      backgroundColor: canPublish && !uploadingPost ? theme.colors.primary : theme.colors.surface,
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
          >
            {/* Post Type Selector */}
            <View style={styles.postTypeSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeChipsRow}>
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

                {/* Text Input */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.text }]}
                    placeholder="Share your thoughts, opportunities, or achievements..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={maxCharacters}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Text
                    style={[
                      styles.characterCount,
                      {
                        color:
                          characterCount > 480
                            ? theme.colors.warning
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {characterCount}/{maxCharacters}
                  </Text>
                </View>
              </View>
            </View>

                {/* Image Preview */}
                {imageUri && (
                  <View style={styles.previewSection}>
                    <View style={styles.imagePreviewContainer}>
                      {uploadingImage ? (
                        <View style={[styles.imagePreview, styles.uploadingOverlay]}>
                          <ActivityIndicator size="large" color={theme.colors.primary} />
                          <Text style={[styles.uploadingText, { color: theme.colors.text }]}>
                            Uploading image...
                          </Text>
                        </View>
                      ) : (
                        <>
                          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => setImageUri(null)}
                          >
                            <Ionicons name="close" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}

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
                            Uploading audio...
                          </Text>
                        </View>
                      ) : (
                        <>
                          <Ionicons name="musical-notes" size={24} color="#7C3AED" />
                          <View style={styles.audioInfo}>
                            <Text style={[styles.audioTitle, { color: theme.colors.text }]}>
                              Audio Preview
                            </Text>
                            <Text style={[styles.audioDuration, { color: theme.colors.textSecondary }]}>
                              Ready to upload
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
                Add to your post:
              </Text>
              <View style={styles.attachmentButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.attachmentButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleImagePress}
                >
                  <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.attachmentButtonText, { color: theme.colors.text }]}>
                    Photo
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
                    name={
                      visibility === 'public'
                        ? 'globe'
                        : 'people'
                    }
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: 56,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  publishButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  publishText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  postTypeSection: {
    marginBottom: 20,
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
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
    minHeight: 120,
  },
  inputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden', // Ensure image is clipped to circular shape
  },
  inputAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    fontSize: 15,
    fontWeight: '400',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'right',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 200,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#CCCCCC',
  },
  uploadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 12,
  },
  audioUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  attachmentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
  },
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
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: 15,
    fontWeight: '400',
  },
});

