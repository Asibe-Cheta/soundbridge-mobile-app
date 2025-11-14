import React, { useState, useRef, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/supabase';
import UploadLimitCard from '../components/UploadLimitCard';
import { getUploadQuota, UploadQuota } from '../services/UploadQuotaService';

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
  lyrics: string;
  lyricsLanguage: string;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate: string;
  coverImage: { uri: string; name: string; type: string } | null;
  audioFile: { uri: string; name: string; type: string } | null;
}

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQuota, setUploadQuota] = useState<UploadQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [formData, setFormData] = useState<UploadFormData>({
    contentType: 'music',
    title: '',
    description: '',
    artistName: '',
    genre: '',
    episodeNumber: '',
    podcastCategory: '',
    tags: '',
    lyrics: '',
    lyricsLanguage: 'en',
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
  const supabaseFunctions = db as any;

  useEffect(() => {
    let isMounted = true;

    const fetchQuota = async () => {
      if (!session) {
        if (isMounted) {
          setUploadQuota(null);
          setQuotaLoading(false);
        }
        return;
      }

      setQuotaLoading(true);
      const quota = await getUploadQuota(session);
      if (isMounted) {
        setUploadQuota(quota);
        setQuotaLoading(false);
      }
    };

    fetchQuota();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleUpgradePress = () => {
    navigation.navigate('Upgrade' as never);
  };

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
        // Ensure proper MIME type and file extension
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp'
        }[fileExtension] || 'image/jpeg';
        
        setFormData(prev => ({ 
          ...prev, 
          coverImage: {
            uri: asset.uri,
            name: asset.fileName || `cover_${Date.now()}.${fileExtension}`,
            type: mimeType
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

    if (uploadQuota && !uploadQuota.can_upload) {
      Alert.alert(
        'Upload Limit Reached',
        'You have reached your upload limit for this billing period. Upgrade to Pro to continue uploading.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: handleUpgradePress },
        ],
      );
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🎵 Starting upload process for', formData.contentType, '...');

      // Step 1: Upload audio file (70% of progress)
      setUploadProgress(10);
      const audioUploadResult = await supabaseFunctions.uploadAudioFile(user.id, formData.audioFile!);
      
      if (!audioUploadResult.success) {
        throw new Error('Failed to upload audio file: ' + audioUploadResult.error?.message);
      }
      
      setUploadProgress(50);
      console.log('✅ Audio file uploaded successfully');

      // Step 2: Upload cover image if provided (20% of progress)
      let artworkUrl = null;
      if (formData.coverImage) {
        setUploadProgress(60);
        const imageUploadResult = await supabaseFunctions.uploadImage(user.id, formData.coverImage, 'cover-art');
        
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
      
      // Prepare description with content-specific information
      let enhancedDescription = formData.description.trim();
      if (formData.contentType === 'music' && formData.artistName.trim()) {
        enhancedDescription = enhancedDescription 
          ? `Artist: ${formData.artistName.trim()}\n\n${enhancedDescription}`
          : `Artist: ${formData.artistName.trim()}`;
      } else if (formData.contentType === 'podcast' && formData.episodeNumber.trim()) {
        enhancedDescription = enhancedDescription
          ? `Episode ${formData.episodeNumber.trim()}\n\n${enhancedDescription}`
          : `Episode ${formData.episodeNumber.trim()}`;
      }
      
      const trackData = {
        title: formData.title.trim(),
        description: enhancedDescription || null,
        file_url: audioUploadResult.data!.url,
        cover_art_url: artworkUrl, // Web app field name
        duration: 0, // TODO: Extract duration from audio file
        tags: tagsArray.length > 0 ? tagsArray.join(',') : null,
        is_public: formData.privacy === 'public',
        genre: formData.contentType === 'music' ? formData.genre : formData.podcastCategory,
        lyrics: formData.lyrics.trim() || null,
        lyrics_language: formData.lyricsLanguage,
        has_lyrics: formData.lyrics.trim().length > 0
      };
      
      const trackResult = await supabaseFunctions.createAudioTrack(user.id, trackData);
      
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
        lyrics: '',
        lyricsLanguage: 'en',
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

      setUploadQuota((prev) => {
        if (!prev) {
          return prev;
        }
        const remaining = prev.remaining != null ? Math.max(prev.remaining - 1, 0) : prev.remaining;
        const uploadsThisMonth = (prev.uploads_this_month ?? 0) + 1;
        const canUpload =
          prev.is_unlimited ||
          (prev.upload_limit == null ? prev.can_upload : uploadsThisMonth < prev.upload_limit);
        return {
          ...prev,
          uploads_this_month: uploadsThisMonth,
          remaining,
          can_upload: canUpload,
        };
      });

    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const ContentTypeSelector = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content Type</Text>
      <View style={styles.contentTypeContainer}>
        <TouchableOpacity
          style={[
            styles.contentTypeOption,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            formData.contentType === 'music' && { borderColor: theme.colors.primary, borderWidth: 2 }
          ]}
          onPress={() => handleInputChange('contentType', 'music')}
        >
          <View style={[styles.contentTypeIcon, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="musical-notes" size={24} color="white" />
          </View>
          <View style={styles.contentTypeText}>
            <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>Music Track</Text>
            <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Upload your music, beats, or audio tracks</Text>
          </View>
          {formData.contentType === 'music' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.contentTypeOption,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            formData.contentType === 'podcast' && { borderColor: theme.colors.primary, borderWidth: 2 }
          ]}
          onPress={() => handleInputChange('contentType', 'podcast')}
        >
          <View style={[styles.contentTypeIcon, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="mic" size={24} color="white" />
          </View>
          <View style={styles.contentTypeText}>
            <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>Podcast Episode</Text>
            <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Share your podcast episodes and audio content</Text>
          </View>
          {formData.contentType === 'podcast' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFileUpload = (type: 'coverImage' | 'audioFile', title: string, fileUri?: { uri: string; name: string } | null) => (
    <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {fileUri ? (
        <View style={[styles.filePreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.fileInfo}>
            <Ionicons 
              name={type === 'coverImage' ? 'image' : 'musical-notes'} 
              size={24} 
              color={theme.colors.success} 
            />
            <Text style={[styles.fileName, { color: theme.colors.text }]}>{fileUri.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => setFormData(prev => ({ ...prev, [type]: null }))}
          >
            <Ionicons name="close" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={type === 'coverImage' ? pickCoverImage : pickAudioFile}
        >
          <Ionicons 
            name={type === 'coverImage' ? 'camera' : 'document'} 
            size={32} 
            color={theme.colors.textSecondary} 
          />
          <Text style={[styles.uploadButtonText, { color: theme.colors.text }]}>
            {type === 'coverImage' ? 'Select Cover Image' : 'Select Audio File'}
          </Text>
          <Text style={[styles.uploadButtonSubtext, { color: theme.colors.textSecondary }]}>
            {type === 'coverImage' ? 'JPG, PNG (Max 10MB)' : 'MP3, WAV, M4A, AAC, OGG, FLAC (Max 100MB)'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        <View style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Content</Text>
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
            <Text style={[styles.progressText, { color: theme.colors.text }]}>{uploadProgress}%</Text>
          </View>
        )}

      <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <UploadLimitCard
            quota={uploadQuota}
            loading={quotaLoading}
            onUpgrade={handleUpgradePress}
          />

          {/* Content Type Selection */}
          <ContentTypeSelector />

          {/* File Upload */}
          {renderFileUpload('audioFile', 'Audio File *', formData.audioFile)}
          
          {/* Basic Information */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder={`Enter ${formData.contentType} title`}
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder={`Describe your ${formData.contentType}...`}
                placeholderTextColor={theme.colors.textSecondary}
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
                  <Text style={[styles.label, { color: theme.colors.text }]}>Artist Name *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="Enter artist name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.artistName}
                    onChangeText={(value) => handleInputChange('artistName', value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Genre</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              formData.genre === genre && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            ]}
            onPress={() => handleInputChange('genre', genre)}
          >
            <Text style={[
              styles.genreChipText,
              { color: theme.colors.text },
              formData.genre === genre && { color: '#FFFFFF' }
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
                  <Text style={[styles.label, { color: theme.colors.text }]}>Episode Number *</Text>
            <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., Episode 1"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.episodeNumber}
                    onChangeText={(value) => handleInputChange('episodeNumber', value)}
            />
          </View>

          <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {podcastCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.genreChip,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            formData.podcastCategory === category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          ]}
                          onPress={() => handleInputChange('podcastCategory', category)}
                        >
                          <Text style={[
                            styles.genreChipText,
                            { color: theme.colors.text },
                            formData.podcastCategory === category && { color: '#FFFFFF' }
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
              <Text style={[styles.label, { color: theme.colors.text }]}>Tags</Text>
            <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Enter tags separated by commas"
                placeholderTextColor={theme.colors.textSecondary}
              value={formData.tags}
                onChangeText={(value) => handleInputChange('tags', value)}
            />
          </View>

          {/* Lyrics Section (for music only) */}
          {formData.contentType === 'music' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Lyrics (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, styles.lyricsInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Enter song lyrics..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.lyrics}
                  onChangeText={(value) => handleInputChange('lyrics', value)}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Lyrics Language</Text>
                <View style={styles.genreContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      { value: 'en', label: 'English' },
                      { value: 'yo', label: 'Yoruba' },
                      { value: 'ig', label: 'Igbo' },
                      { value: 'pcm', label: 'Pidgin' }
                    ].map((language) => (
                      <TouchableOpacity
                        key={language.value}
                        style={[
                          styles.genreChip,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          formData.lyricsLanguage === language.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => handleInputChange('lyricsLanguage', language.value)}
                      >
                        <Text style={[
                          styles.genreChipText,
                          { color: theme.colors.text },
                          formData.lyricsLanguage === language.value && { color: '#FFFFFF' }
                        ]}>
                          {language.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Privacy Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Privacy Settings</Text>
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
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    formData.privacy === option.value && { borderColor: theme.colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => handleInputChange('privacy', option.value)}
          >
            <View style={styles.privacyOptionContent}>
                    <Text style={[styles.privacyOptionLabel, { color: theme.colors.text }]}>{option.label}</Text>
                    <Text style={[styles.privacyOptionDescription, { color: theme.colors.textSecondary }]}>{option.description}</Text>
              </View>
                  {formData.privacy === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                )}
          </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cover Art */}
          {renderFileUpload('coverImage', 'Cover Art (Optional)', formData.coverImage)}
      </ScrollView>
        </View>
      </SafeAreaView>
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
  gradient: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  contentTypeContainer: {
    gap: 12,
  },
  contentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  contentTypeDescription: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  lyricsInput: {
    height: 160,
  },
  genreContainer: {
    marginTop: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyContainer: {
    gap: 8,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 14,
  },
  uploadButton: {
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
});