import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';

const { width } = Dimensions.get('window');

type ContentType = 'music' | 'podcast';

interface UploadFormData {
  contentType: ContentType;
  title: string;
  description: string;
  // Music-specific fields
  artistName: string;
  genre: string;
  // Podcast-specific fields
  episodeNumber: string;
  podcastCategory: string;
  // Common fields
  tags: string;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate: string;
  coverImage: { uri: string; name: string; type: string } | null;
  audioFile: { uri: string; name: string; type: string } | null;
}

export default function UploadScreen() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState<UploadFormData>({
    contentType: 'music',
    title: '',
    description: '',
    artistName: '',
    genre: '',
    episodeNumber: '',
    podcastCategory: '',
    tags: '',
    privacy: 'public',
    publishOption: 'now',
    scheduleDate: '',
    coverImage: null,
    audioFile: null,
  });

  const genres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical', 
    'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Alternative', 'Other'
  ];

  const podcastCategories = [
    'Technology', 'Business', 'Education', 'Entertainment', 'News', 
    'Sports', 'Health', 'Science', 'Arts', 'Comedy', 'True Crime', 'History', 'Other'
  ];

  // Supported audio file types (matching web app)
  const supportedAudioTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 
    'audio/aac', 'audio/ogg', 'audio/flac'
  ];

  const maxFileSize = 100 * 1024 * 1024; // 100MB limit

  const handleInputChange = (field: keyof UploadFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateAudioFile = (file: { name: string; size?: number; mimeType?: string }) => {
    const errors = [];
    
    // Check file size (maximum)
    if (file.size && file.size > maxFileSize) {
      errors.push(`File size must be less than ${maxFileSize / (1024 * 1024)}MB`);
    }
    
    // Check file size (minimum 1MB)
    if (file.size && file.size < 1024 * 1024) {
      errors.push('File size is too small (minimum 1MB required)');
    }
    
    // Check file type
    if (file.mimeType && !supportedAudioTypes.includes(file.mimeType)) {
      errors.push('Unsupported file type. Please use MP3, WAV, M4A, AAC, OGG, or FLAC');
    }
    
    // Check file extension if MIME type is not available
    if (!file.mimeType) {
      const ext = file.name.toLowerCase().split('.').pop();
      const supportedExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];
      if (!ext || !supportedExts.includes(ext)) {
        errors.push('Unsupported file type. Please use MP3, WAV, M4A, AAC, OGG, or FLAC');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  // Comprehensive form validation (mirroring web app logic)
  const validateUploadForm = () => {
    const errors = [];
    
    // Audio file validation
    if (!formData.audioFile) {
      errors.push('Please select an audio file to upload');
      return { isValid: false, errors };
    }
    
    const audioValidation = validateAudioFile(formData.audioFile);
    if (!audioValidation.isValid) {
      errors.push(...audioValidation.errors);
    }
    
    // Basic metadata validation
    if (!formData.title.trim()) {
      errors.push('Track title is required');
    } else if (formData.title.trim().length < 2) {
      errors.push('Track title must be at least 2 characters long');
    } else if (formData.title.trim().length > 100) {
      errors.push('Track title must be less than 100 characters');
    }
    
    // Content-specific validation
    if (formData.contentType === 'music') {
      if (!formData.artistName.trim()) {
        errors.push('Artist name is required for music tracks');
      } else if (formData.artistName.trim().length < 2) {
        errors.push('Artist name must be at least 2 characters long');
      }
      
      if (!formData.genre) {
        errors.push('Genre is required for music tracks');
      }
    } else if (formData.contentType === 'podcast') {
      if (!formData.episodeNumber) {
        errors.push('Episode number is required for podcasts');
      } else if (parseInt(formData.episodeNumber) < 1) {
        errors.push('Episode number must be a positive number');
      }
      
      if (!formData.podcastCategory) {
        errors.push('Podcast category is required');
      }
    }
    
    // Description validation
    if (formData.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }
    
    // Tags validation
    if (formData.tags.trim()) {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
      }
      
      for (const tag of tags) {
        if (tag.length < 2) {
          errors.push('Each tag must be at least 2 characters long');
        }
        if (tag.length > 30) {
          errors.push('Each tag must be less than 30 characters');
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const pickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select a cover image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFormData(prev => ({ 
          ...prev, 
          coverImage: {
            uri: asset.uri,
            name: asset.fileName || `cover_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg'
          }
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate the file
        const validation = validateAudioFile({
          name: asset.name || 'audio_file',
          size: asset.size,
          mimeType: asset.mimeType
        });
        
        if (!validation.isValid) {
          Alert.alert('Invalid File', validation.errors.join('\n'));
          return;
        }
        
        // Auto-fill title from filename if empty
        const fileName = (asset.name || 'audio_file').replace(/\.[^/.]+$/, '');
        
        setFormData(prev => ({ 
          ...prev, 
          audioFile: {
            uri: asset.uri,
            name: asset.name || `audio_${Date.now()}.${asset.mimeType?.split('/')[1] || 'mp3'}`,
            type: asset.mimeType || 'audio/mpeg'
          },
          title: prev.title || fileName // Only set if title is empty
        }));
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };


  const handleUpload = async () => {
    // Comprehensive validation (mirroring web app logic)
    const validation = validateUploadForm();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload content.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🎵 Starting upload process for', formData.contentType, '...');

      // Step 1: Upload audio file (70% of progress)
      setUploadProgress(10);
      const audioUploadResult = await db.uploadAudioFile(user.id, formData.audioFile!);
      
      if (!audioUploadResult.success) {
        throw new Error('Failed to upload audio file: ' + audioUploadResult.error?.message);
      }
      
      setUploadProgress(50);
      console.log('✅ Audio file uploaded successfully');

      // Step 2: Upload cover image if provided (20% of progress)
      let artworkUrl = null;
      if (formData.coverImage) {
        setUploadProgress(60);
        const imageUploadResult = await db.uploadImage(user.id, formData.coverImage, 'cover-art');
        
        if (imageUploadResult.success) {
          artworkUrl = imageUploadResult.data?.url;
          console.log('✅ Artwork uploaded successfully');
        } else {
          console.warn('Failed to upload artwork:', imageUploadResult.error);
        }
      }
      
      setUploadProgress(80);

      // Step 3: Create track record in database (10% of progress)
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const trackData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        file_url: audioUploadResult.data!.url,
        cover_art_url: artworkUrl,
        duration: 0, // TODO: Extract duration from audio file
        tags: tagsArray.length > 0 ? tagsArray.join(',') : null,
        is_public: formData.privacy === 'public',
        // Content-specific fields
        ...(formData.contentType === 'music' ? {
          artist_name: formData.artistName.trim(),
          genre: formData.genre || null,
        } : {
          episode_number: formData.episodeNumber.trim(),
          podcast_category: formData.podcastCategory || null,
        })
      };
      
      const trackResult = await db.createAudioTrack(user.id, trackData);
      
      if (!trackResult.success) {
        throw new Error('Failed to create track record: ' + trackResult.error?.message);
      }
      
      setUploadProgress(100);
      console.log('✅ Track created successfully');

      // Reset form
      setFormData({
        contentType: 'music',
        title: '',
        description: '',
        artistName: '',
        genre: '',
        episodeNumber: '',
        podcastCategory: '',
        tags: '',
        privacy: 'public',
        publishOption: 'now',
        scheduleDate: '',
        coverImage: null,
        audioFile: null,
      });

      Alert.alert(
        'Upload Successful!',
        `Your ${formData.contentType} has been uploaded successfully.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const ContentTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Content Type</Text>
      <View style={styles.contentTypeContainer}>
        <TouchableOpacity
          style={[
            styles.contentTypeOption,
            formData.contentType === 'music' && styles.contentTypeSelected
          ]}
          onPress={() => handleInputChange('contentType', 'music')}
        >
          <View style={[styles.contentTypeIcon, { backgroundColor: '#DC2626' }]}>
            <Ionicons name="musical-notes" size={24} color="white" />
          </View>
          <View style={styles.contentTypeText}>
            <Text style={styles.contentTypeLabel}>Music Track</Text>
            <Text style={styles.contentTypeDescription}>Upload your music, beats, or audio tracks</Text>
          </View>
          {formData.contentType === 'music' && (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.contentTypeOption,
            formData.contentType === 'podcast' && styles.contentTypeSelected
          ]}
          onPress={() => handleInputChange('contentType', 'podcast')}
        >
          <View style={[styles.contentTypeIcon, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="mic" size={24} color="white" />
          </View>
          <View style={styles.contentTypeText}>
            <Text style={styles.contentTypeLabel}>Podcast Episode</Text>
            <Text style={styles.contentTypeDescription}>Share your podcast episodes and audio content</Text>
          </View>
          {formData.contentType === 'podcast' && (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFileUpload = (type: 'coverImage' | 'audioFile', title: string, fileUri?: { uri: string; name: string } | null) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {fileUri ? (
        <View style={styles.filePreview}>
          <View style={styles.fileInfo}>
            <Ionicons 
              name={type === 'coverImage' ? 'image' : 'musical-notes'} 
              size={24} 
              color="#10B981" 
            />
            <Text style={styles.fileName}>{fileUri.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => setFormData(prev => ({ ...prev, [type]: null }))}
          >
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={type === 'coverImage' ? pickCoverImage : pickAudioFile}
        >
          <Ionicons 
            name={type === 'coverImage' ? 'camera' : 'document'} 
            size={32} 
            color="rgba(255, 255, 255, 0.6)" 
          />
          <Text style={styles.uploadButtonText}>
            {type === 'coverImage' ? 'Select Cover Image' : 'Select Audio File'}
          </Text>
          <Text style={styles.uploadButtonSubtext}>
            {type === 'coverImage' ? 'JPG, PNG (Max 10MB)' : 'MP3, WAV, M4A, AAC, OGG, FLAC (Max 100MB)'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.1)" translucent />
      
      <LinearGradient
        colors={['#1a1a1a', '#0f0f0f']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload Content</Text>
          <TouchableOpacity
            style={[styles.publishButton, isUploading && styles.publishButtonDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            <LinearGradient
              colors={isUploading ? ['#666', '#666'] : ['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publishButtonGradient}
            >
              <Text style={styles.publishButtonText}>
                {isUploading ? 'Uploading...' : `Publish ${formData.contentType === 'music' ? 'Track' : 'Episode'}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Content Type Selection */}
          <ContentTypeSelector />

          {/* File Upload */}
          {renderFileUpload('audioFile', 'Audio File *', formData.audioFile)}
          
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Enter ${formData.contentType} title`}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={`Describe your ${formData.contentType}...`}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Content-specific fields */}
            {formData.contentType === 'music' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Artist Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter artist name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.artistName}
                    onChangeText={(value) => handleInputChange('artistName', value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Genre</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {genres.map((genre) => (
                        <TouchableOpacity
                          key={genre}
                          style={[
                            styles.genreChip,
                            formData.genre === genre && styles.genreChipSelected
                          ]}
                          onPress={() => handleInputChange('genre', genre)}
                        >
                          <Text style={[
                            styles.genreChipText,
                            formData.genre === genre && styles.genreChipTextSelected
                          ]}>
                            {genre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Episode Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Episode 1"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.episodeNumber}
                    onChangeText={(value) => handleInputChange('episodeNumber', value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {podcastCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.genreChip,
                            formData.podcastCategory === category && styles.genreChipSelected
                          ]}
                          onPress={() => handleInputChange('podcastCategory', category)}
                        >
                          <Text style={[
                            styles.genreChipText,
                            formData.podcastCategory === category && styles.genreChipTextSelected
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter tags separated by commas"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={formData.tags}
                onChangeText={(value) => handleInputChange('tags', value)}
              />
            </View>
          </View>

          {/* Privacy Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Settings</Text>
            <View style={styles.privacyContainer}>
              {[
                { value: 'public', label: 'Public', description: 'Anyone can view' },
                { value: 'followers', label: 'Followers Only', description: 'Only your followers can view' },
                { value: 'private', label: 'Private', description: 'Only you can view' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.privacyOption,
                    formData.privacy === option.value && styles.privacyOptionSelected
                  ]}
                  onPress={() => handleInputChange('privacy', option.value)}
                >
                  <View style={styles.privacyOptionContent}>
                    <Text style={styles.privacyOptionLabel}>{option.label}</Text>
                    <Text style={styles.privacyOptionDescription}>{option.description}</Text>
                  </View>
                  {formData.privacy === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cover Art */}
          {renderFileUpload('coverImage', 'Cover Art (Optional)', formData.coverImage)}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  publishButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  publishButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  contentTypeContainer: {
    gap: 12,
  },
  contentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contentTypeSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  contentTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentTypeText: {
    flex: 1,
  },
  contentTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  contentTypeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  genreContainer: {
    marginTop: 8,
  },
  genreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genreChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  genreChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  genreChipTextSelected: {
    color: 'white',
  },
  privacyContainer: {
    gap: 8,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  uploadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
});