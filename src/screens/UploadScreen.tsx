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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, dbHelpers } from '../lib/supabase';
import UploadLimitCard from '../components/UploadLimitCard';
import StorageIndicator from '../components/StorageIndicator';
import { getUploadQuota, UploadQuota } from '../services/UploadQuotaService';
import { uploadAudioFile, uploadImage, createAudioTrack } from '../services/UploadService';
import subscriptionService from '../services/SubscriptionService';
import { walkthroughable } from 'react-native-copilot';
import { useServiceProviderPrompt } from '../hooks/useServiceProviderPrompt';
import ServiceProviderPromptModal from '../components/ServiceProviderPromptModal';
import { collectDeviceInfo } from '../utils/deviceInfo';
// Temporarily disabled for Expo Go compatibility
// import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

type ContentType = 'music' | 'podcast';
type UploadMode = 'single' | 'album';

// ACRCloud TypeScript Interfaces
interface AcrcloudMatchResult {
  success: boolean;
  matchFound: true;
  requiresISRC: true;
  detectedArtist: string;
  detectedTitle: string;
  detectedAlbum?: string;
  detectedLabel?: string;
  detectedISRC?: string;
  artistMatch: {
    match: boolean;
    confidence: number;
  };
  artistMatchConfidence: number;
  detectedISRCVerified?: boolean;
  detectedISRCRecording?: any;
}

interface AcrcloudNoMatchResult {
  success: boolean;
  matchFound: false;
  requiresISRC: false;
  isUnreleased: true;
}

interface AcrcloudErrorResult {
  success: false;
  matchFound: false;
  error: string;
  errorCode: 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'API_ERROR' | 'INVALID_FILE';
  requiresManualReview: true;
}

type AcrcloudResult = AcrcloudMatchResult | AcrcloudNoMatchResult | AcrcloudErrorResult;
type AcrcloudStatus = 'idle' | 'checking' | 'match' | 'no_match' | 'error';

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

interface AlbumTrack {
  id: string; // temp ID for UI
  trackNumber: number;
  title: string;
  audioFile: { uri: string; name: string; type: string; size?: number } | null;
  duration?: number;
  lyrics?: string;
  lyricsLanguage?: string;
}

interface AlbumFormData {
  albumTitle: string;
  albumDescription: string;
  albumGenre: string;
  albumCover: { uri: string; name: string; type: string } | null;
  releaseDate: Date | null;
  status: 'draft' | 'scheduled' | 'published';
  tracks: AlbumTrack[];
}

// Create walkthroughable components for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);
const WalkthroughableView = walkthroughable(View);

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQuota, setUploadQuota] = useState<UploadQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [agreedToCopyright, setAgreedToCopyright] = useState(false);

  // Cover song ISRC verification state
  const [isCover, setIsCover] = useState(false);
  const [isrcCode, setIsrcCode] = useState('');
  const [isrcVerificationStatus, setIsrcVerificationStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [isrcVerificationError, setIsrcVerificationError] = useState<string | null>(null);
  const [isrcVerificationData, setIsrcVerificationData] = useState<any>(null);
  const isrcVerificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ACRCloud fingerprinting state
  const [acrcloudStatus, setAcrcloudStatus] = useState<AcrcloudStatus>('idle');
  const [acrcloudData, setAcrcloudData] = useState<AcrcloudResult | null>(null);
  const [acrcloudError, setAcrcloudError] = useState<string | null>(null);
  const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);

  // Service Provider Prompt Modal
  const {
    shouldShow: showServiceProviderPrompt,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
    triggerAfterFirstUpload,
  } = useServiceProviderPrompt();
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
  
  // Album-specific state
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>({
    albumTitle: '',
    albumDescription: '',
    albumGenre: '',
    albumCover: null,
    releaseDate: null,
    status: 'draft',
    tracks: [],
  });
  const [albumStep, setAlbumStep] = useState<1 | 2 | 3>(1);

  const genres = [
    'Gospel', 'Afrobeats', 'UK Drill', 'Hip Hop', 'R&B', 'Pop',
    'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Reggae',
    'Folk', 'Blues', 'Funk', 'Soul', 'Alternative', 'Indie', 'Other'
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

  const maxFileSize = 100 * 1024 * 1024; // 100MB limit for audio
  const maxImageSize = 5 * 1024 * 1024; // 5MB limit for images

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

      if (isMounted) {
        setQuotaLoading(true);
      }

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

  // ISRC Format Validation (Client-Side)
  const validateISRCFormat = (isrc: string): { valid: boolean; normalized?: string; error?: string } => {
    if (!isrc || typeof isrc !== 'string') {
      return { valid: false, error: 'ISRC code is required' };
    }

    // Remove hyphens and spaces, convert to uppercase
    const normalized = isrc.replace(/[-\s]/g, '').toUpperCase();

    // Must be exactly 12 characters
    if (normalized.length !== 12) {
      return {
        valid: false,
        error: 'Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)'
      };
    }

    // Must be alphanumeric (last 5 must be digits)
    if (!/^[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}[0-9]{5}$/.test(normalized)) {
      return {
        valid: false,
        error: 'Invalid ISRC format. Should be XX-XXX-YY-NNNNN (alphanumeric, last 5 digits)'
      };
    }

    return { valid: true, normalized };
  };

  // Verify ISRC Code via API
  const verifyISRCCode = async (isrc: string) => {
    if (!isrc || !isrc.trim()) {
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);
      return;
    }

    setIsrcVerificationStatus('loading');
    setIsrcVerificationError(null);

    try {
      // Normalize ISRC (remove hyphens, uppercase)
      const normalizedInput = isrc.trim().replace(/-/g, '').toUpperCase();

      // If ACRCloud detected a match, verify the typed ISRC matches the detected one
      if (acrcloudStatus === 'match' && acrcloudData && 'detectedISRC' in acrcloudData && acrcloudData.detectedISRC) {
        const normalizedDetected = acrcloudData.detectedISRC.replace(/-/g, '').toUpperCase();

        if (normalizedInput !== normalizedDetected) {
          setIsrcVerificationStatus('error');
          setIsrcVerificationError('ISRC code does not match the detected track. Please enter the correct ISRC for this song.');
          setIsrcVerificationData(null);
          return;
        }

        // ISRC matches ACRCloud detection - verification complete!
        // No need to check MusicBrainz since ACRCloud already confirmed it's valid
        console.log('✅ ISRC verified via ACRCloud match');
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData({
          title: acrcloudData.detectedTitle || 'Verified Track',
          'artist-credit': acrcloudData.detectedArtist
            ? [{ name: acrcloudData.detectedArtist }]
            : []
        });
        return;
      }

      // For manual cover songs (no ACRCloud match), verify ISRC via MusicBrainz API
      const response = await fetch('https://www.soundbridge.live/api/upload/verify-isrc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isrc: isrc.trim() }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData(data.recording);
      } else {
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(data.error || 'ISRC verification failed');
        setIsrcVerificationData(null);
      }
    } catch (error: any) {
      setIsrcVerificationStatus('error');
      setIsrcVerificationError(error.message || 'Failed to verify ISRC. Please try again.');
      setIsrcVerificationData(null);
    }
  };

  // Debounced ISRC Input Handler
  const handleISRCChange = (value: string) => {
    setIsrcCode(value);
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);

    // Clear existing timeout
    if (isrcVerificationTimeoutRef.current) {
      clearTimeout(isrcVerificationTimeoutRef.current);
    }

    // Debounce verification (500ms delay)
    if (value.trim()) {
      isrcVerificationTimeoutRef.current = setTimeout(() => {
        verifyISRCCode(value);
      }, 500);
    }
  };

  // Reset ISRC When Cover Toggle is Off
  useEffect(() => {
    if (!isCover) {
      setIsrcCode('');
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);
      if (isrcVerificationTimeoutRef.current) {
        clearTimeout(isrcVerificationTimeoutRef.current);
      }
    }
  }, [isCover]);

  // ACRCloud: Fingerprint Audio File (Storage-first approach to bypass Vercel 4.5MB limit)
  const fingerprintAudio = async (file: { uri: string; name: string; type: string; size?: number }) => {
    setAcrcloudStatus('checking');
    setAcrcloudError(null);

    try {
      console.log('🎵 Starting ACRCloud fingerprinting...');
      console.log('📁 File details:', {
        name: file.name,
        type: file.type,
        size: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'unknown'
      });

      // Step 1: Upload file to Supabase Storage (bypasses Vercel 4.5MB payload limit)
      console.log('📤 Uploading to Supabase Storage for fingerprinting...');

      const fileExtension = file.name.split('.').pop() || 'mp3';
      const fileName = `fingerprint_${user.id}_${Date.now()}.${fileExtension}`;

      // React Native: Read file as ArrayBuffer (blob() doesn't exist in RN)
      const fileResponse = await fetch(file.uri);
      const arrayBuffer = await fileResponse.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-tracks')
        .upload(`temp/${fileName}`, fileBuffer, {
          contentType: file.type || 'audio/mpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        throw new Error(`Failed to upload file for fingerprinting: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(uploadData.path);

      const storageUrl = urlData.publicUrl;
      console.log('✅ File uploaded to storage:', storageUrl);

      // Step 2: Send URL to fingerprint API (small JSON payload - no size limit)
      console.log('📤 Sending URL to fingerprint API...');

      const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          audioFileUrl: storageUrl, // Send URL instead of file
          artistName: formData.artistName || undefined,
        }),
      });

      // Debug response before parsing
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      console.log('🔍 Content-Type:', response.headers.get('Content-Type'));

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API returned error status:', response.status);
        console.error('❌ Error response:', errorText.substring(0, 500));
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      // Try to read as text first to see what we're getting
      const responseText = await response.text();
      console.log('🔍 Raw response (first 200 chars):', responseText.substring(0, 200));

      // Then parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🎵 ACRCloud response:', data);
      } catch (parseError: any) {
        console.error('❌ JSON parse failed. Full response:', responseText);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!data.success) {
        // Handle error
        handleAcrcloudError(data);

        // Cleanup temp file from storage
        if (uploadData?.path) {
          await cleanupTempFile(uploadData.path);
        }
        return;
      }

      if (data.matchFound) {
        // Match found - require ISRC
        handleMatchFound(data);
      } else {
        // No match - original music
        handleNoMatch(data);
      }

      // Cleanup temp file from storage (fingerprinting complete)
      if (uploadData?.path) {
        await cleanupTempFile(uploadData.path);
      }

    } catch (error: any) {
      console.error('❌ ACRCloud error:', error);
      handleAcrcloudError({ error: error.message, errorCode: 'API_ERROR' });
    }
  };

  // Cleanup temporary file from storage after fingerprinting
  const cleanupTempFile = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('audio-tracks')
        .remove([filePath]);

      if (error) {
        console.warn('⚠️ Failed to cleanup temp file:', error.message);
      } else {
        console.log('🗑️ Temp file cleaned up:', filePath);
      }
    } catch (error: any) {
      console.warn('⚠️ Cleanup error:', error.message);
    }
  };

  // Handle Match Found
  const handleMatchFound = (data: AcrcloudMatchResult) => {
    console.log('✅ ACRCloud match found:', data.detectedTitle, 'by', data.detectedArtist);
    setAcrcloudStatus('match');
    setAcrcloudData(data);

    // DO NOT auto-fill ISRC - user must manually input it to prove ownership
    // DO NOT auto-check "cover song" - user must consciously decide
    // The detected ISRC will be shown as a hint/reference in the UI
  };

  // Handle No Match
  const handleNoMatch = (data: AcrcloudNoMatchResult) => {
    console.log('✅ ACRCloud no match - appears to be original music');
    setAcrcloudStatus('no_match');
    setAcrcloudData(data);
    setIsOriginalConfirmed(false);
  };

  // Handle ACRCloud Errors
  const handleAcrcloudError = (error: any) => {
    console.log('⚠️ ACRCloud error:', error.error || 'Fingerprinting failed');
    setAcrcloudStatus('error');
    setAcrcloudError(error.error || 'Fingerprinting failed');

    // Allow upload to proceed but flag for review
    setAcrcloudData({
      success: false,
      matchFound: false,
      error: error.error || 'Fingerprinting failed',
      errorCode: error.errorCode || 'API_ERROR',
      requiresManualReview: true,
    });
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

      // ACRCloud validation (for music tracks)
      if (acrcloudStatus === 'checking') {
        errors.push('Please wait for audio verification to complete');
      }

      if (acrcloudStatus === 'match') {
        // Match found - require ISRC verification
        if (!isrcCode || isrcCode.trim() === '') {
          errors.push('ISRC code is required. This track appears to be a released song.');
        }

        if (isrcVerificationStatus !== 'success') {
          errors.push('ISRC code must be verified before uploading');
        }

        // Check artist name match
        if (acrcloudData?.matchFound &&
            'artistMatch' in acrcloudData &&
            acrcloudData.artistMatch &&
            !acrcloudData.artistMatch.match) {
          errors.push(`This track belongs to "${acrcloudData.detectedArtist}". If this is you, ensure your profile name matches.`);
        }
      }

      if (acrcloudStatus === 'no_match' && !isOriginalConfirmed) {
        errors.push('Please confirm this is your original/unreleased music');
      }

      // Cover song validation (manual cover song marking)
      if (isCover && !isrcCode.trim()) {
        errors.push('ISRC code is required for cover songs');
      }
      if (isCover && isrcVerificationStatus !== 'success') {
        errors.push('ISRC code must be verified before uploading a cover song');
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

  // Album validation
  const validateAlbumForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Album metadata validation
    if (!albumFormData.albumTitle.trim()) {
      errors.push('Album title is required');
    }
    
    if (albumFormData.albumTitle.length > 200) {
      errors.push('Album title must be less than 200 characters');
    }
    
    if (!albumFormData.albumGenre) {
      errors.push('Album genre is required');
    }
    
    if (!albumFormData.albumCover) {
      errors.push('Album cover image is required');
    }
    
    // Tracks validation
    if (albumFormData.tracks.length === 0) {
      errors.push('Please add at least one track to the album');
    }
    
    // Check tier limits
    if (uploadQuota) {
      const tier = uploadQuota.tier?.toLowerCase() || 'free';
      
      if (tier === 'free') {
        errors.push('Albums are only available for Premium and Unlimited users');
      } else if (tier === 'premium' && albumFormData.tracks.length > 7) {
        errors.push(`Premium users can add up to 7 tracks per album. You have ${albumFormData.tracks.length} tracks.`);
      }
    }
    
    // Validate each track
    albumFormData.tracks.forEach((track, index) => {
      if (!track.title.trim()) {
        errors.push(`Track ${index + 1}: Title is required`);
      }
      if (!track.audioFile) {
        errors.push(`Track ${index + 1}: Audio file is required`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Album helper functions
  const pickAlbumCover = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select an album cover.');
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
        
        // Validate image size (2MB limit for album covers)
        const albumCoverMaxSize = 2 * 1024 * 1024; // 2MB
        if (asset.fileSize && asset.fileSize > albumCoverMaxSize) {
          Alert.alert(
            'File Too Large',
            'Album cover must be less than 2MB. Please select a smaller image.'
          );
          return;
        }
        
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
        }[fileExtension] || 'image/jpeg';
        
        setAlbumFormData(prev => ({ 
          ...prev, 
          albumCover: {
            uri: asset.uri,
            name: asset.fileName || `album_cover_${Date.now()}.${fileExtension}`,
            type: mimeType
          }
        }));
      }
    } catch (error) {
      console.error('Error picking album cover:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const addTrackToAlbum = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate audio file
        const validation = validateAudioFile({
          name: asset.name || 'audio_file',
          size: asset.size,
          mimeType: asset.mimeType
        });
        
        if (!validation.isValid) {
          Alert.alert('Invalid File', validation.errors.join('\n'));
          return;
        }
        
        // Check track limit for premium users
        const tier = uploadQuota?.tier?.toLowerCase() || 'free';
        if (tier === 'premium' && albumFormData.tracks.length >= 7) {
          Alert.alert(
            'Track Limit Reached',
            'Premium users can add up to 7 tracks per album. Upgrade to Unlimited for unlimited tracks!'
          );
          return;
        }
        
        const newTrack: AlbumTrack = {
          id: Date.now().toString(),
          trackNumber: albumFormData.tracks.length + 1,
          title: asset.name.replace(/\.[^/.]+$/, '') || `Track ${albumFormData.tracks.length + 1}`,
          audioFile: {
            uri: asset.uri,
            name: asset.name || `track_${Date.now()}.mp3`,
            type: asset.mimeType || 'audio/mpeg',
            size: asset.size,
          },
        };
        
        setAlbumFormData(prev => ({
          ...prev,
          tracks: [...prev.tracks, newTrack],
        }));
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const removeTrackFromAlbum = (trackId: string) => {
    setAlbumFormData(prev => ({
      ...prev,
      tracks: prev.tracks
        .filter(t => t.id !== trackId)
        .map((t, index) => ({ ...t, trackNumber: index + 1 })),
    }));
  };

  const updateTrackTitle = (trackId: string, title: string) => {
    setAlbumFormData(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => 
        t.id === trackId ? { ...t, title } : t
      ),
    }));
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
        
        // Validate image size (5MB limit as per web team response)
        if (asset.fileSize && asset.fileSize > maxImageSize) {
          Alert.alert(
            'File Too Large',
            `Cover image must be less than ${maxImageSize / (1024 * 1024)}MB. Please select a smaller image.`
          );
          return;
        }
        
        // Ensure proper MIME type and file extension
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'avif': 'image/avif'
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

        const audioFileData = {
          uri: asset.uri,
          name: asset.name || `audio_${Date.now()}.${asset.mimeType?.split('/')[1] || 'mp3'}`,
          type: asset.mimeType || 'audio/mpeg',
          size: asset.size // Include file size for ACRCloud validation
        };

        setFormData(prev => ({
          ...prev,
          audioFile: audioFileData,
          title: prev.title || fileName // Only set if title is empty
        }));

        // Automatically trigger ACRCloud fingerprinting for music tracks
        if (formData.contentType === 'music') {
          console.log('🎵 Auto-triggering ACRCloud fingerprinting for music track');
          await fingerprintAudio(audioFileData);
        }
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

    // Copyright attestation validation
    if (!agreedToCopyright) {
      Alert.alert(
        'Copyright Confirmation Required',
        'You must agree to the copyright terms to upload content.'
      );
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload content.');
      return;
    }

    if (uploadQuota && !uploadQuota.can_upload) {
      const tier = uploadQuota.tier?.toLowerCase() || 'free';
      let message = '';
      if (tier === 'free') {
        message = 'You\'ve uploaded your 3 free tracks. Upgrade to Premium for 7 tracks/month or Unlimited for unlimited uploads.';
      } else if (tier === 'premium') {
        message = 'You\'ve uploaded 7 tracks this month. Your limit resets on your renewal date. Upgrade to Unlimited for unlimited uploads anytime.';
      } else {
        message = 'You have reached your upload limit. Please upgrade to continue uploading.';
      }
      
      Alert.alert(
        'Upload Limit Reached',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: tier === 'free' ? 'View Plans' : 'Upgrade to Unlimited', onPress: handleUpgradePress },
        ],
      );
      return;
    }

    // Check storage limits before upload
    if (session && formData.audioFile?.size) {
      try {
        console.log('📊 Checking storage limits...');
        const limits = await subscriptionService.getUsageLimits(session);
        const fileSize = formData.audioFile.size;

        // Check if upload would exceed storage limit
        if (!limits.storage.is_unlimited && fileSize > limits.storage.remaining) {
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
          const remainingMB = (limits.storage.remaining / (1024 * 1024)).toFixed(2);

          Alert.alert(
            'Storage Limit Exceeded',
            `This file (${fileSizeMB} MB) exceeds your remaining storage (${remainingMB} MB). Upgrade to Premium or Unlimited for more storage.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'View Plans', onPress: handleUpgradePress },
            ],
          );
          return;
        }

        console.log('✅ Storage check passed');
      } catch (error) {
        console.error('Error checking storage limits:', error);
        // On error, allow upload (fail open)
      }
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🎵 Starting upload process for', formData.contentType, '...');

      // Step 1: Upload audio file (70% of progress)
      setUploadProgress(10);
      const audioUploadResult = await uploadAudioFile(user.id, formData.audioFile!);
      
      if (!audioUploadResult.success) {
        throw new Error('Failed to upload audio file: ' + audioUploadResult.error?.message);
      }
      
      setUploadProgress(50);
      console.log('✅ Audio file uploaded successfully');

      // Step 2: Upload cover image if provided (20% of progress)
      let artworkUrl = null;
      if (formData.coverImage) {
        setUploadProgress(60);
        const imageUploadResult = await uploadImage(user.id, formData.coverImage, 'cover-art');
        
        if (imageUploadResult.success) {
          artworkUrl = imageUploadResult.data?.url;
          console.log('✅ Artwork uploaded successfully');
        } else {
          console.warn('Failed to upload artwork:', imageUploadResult.error);
        }
      }
      
      setUploadProgress(80);

      // Step 3: Collect device info and create track record in database (10% of progress)
      const deviceInfo = collectDeviceInfo();
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
        has_lyrics: formData.lyrics.trim().length > 0,
        // Cover song ISRC fields
        is_cover: formData.contentType === 'music' ? (isCover || acrcloudStatus === 'match') : false,
        isrc_code: (formData.contentType === 'music' && (isCover || acrcloudStatus === 'match')) ? isrcCode.trim() : null,
        // ACRCloud fingerprinting data
        acrcloudData: formData.contentType === 'music' ? acrcloudData : null,
        // Copyright attestation data
        copyright_attested: agreedToCopyright,
        attestation_timestamp: deviceInfo.agreedAt,
        attestation_user_agent: deviceInfo.userAgent,
        attestation_device_info: {
          platform: deviceInfo.devicePlatform,
          os: deviceInfo.deviceOS,
          appVersion: deviceInfo.appVersion,
          model: deviceInfo.deviceModel,
        },
        terms_version: deviceInfo.termsVersion,
      };

      const trackResult = await createAudioTrack(user.id, trackData);
      
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
      setAgreedToCopyright(false);

      // Reset cover song ISRC state
      setIsCover(false);
      setIsrcCode('');
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);

      // Reset ACRCloud state
      setAcrcloudStatus('idle');
      setAcrcloudData(null);
      setAcrcloudError(null);
      setIsOriginalConfirmed(false);

      Alert.alert(
        'Upload Successful!',
        `Your ${formData.contentType} has been uploaded successfully.`,
        [{ text: 'OK' }]
      );

      // Trigger service provider prompt after first upload
      const currentUploadCount = uploadQuota?.uploads_this_month ?? 0;
      if (currentUploadCount === 0) {
        // This was their first upload - trigger prompt after short delay
        setTimeout(() => {
          triggerAfterFirstUpload();
        }, 2000);
      }

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

  // Album upload handler
  const handleAlbumUpload = async () => {
    // Validate
    const validation = validateAlbumForm();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }
    
    if (!user || !session) {
      Alert.alert('Error', 'You must be logged in to upload albums.');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🎵 Starting album upload...');
      
      // Check album limit
      const { data: limitCheck, error: limitError } = await dbHelpers.checkAlbumLimit(user.id);
      if (limitError || !limitCheck) {
        throw new Error('Failed to check album limit');
      }
      
      if (!limitCheck.canCreate) {
        const tier = limitCheck.tier || 'free';
        let message = '';
        if (tier === 'free') {
          message = 'Albums are only available for Premium and Unlimited users. Upgrade now to create albums!';
        } else if (tier === 'premium') {
          message = `You've reached your album limit (${limitCheck.limit} albums). Upgrade to Unlimited for unlimited albums!`;
        }
        
        Alert.alert(
          'Album Limit Reached',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: handleUpgradePress },
          ],
        );
        setIsUploading(false);
        return;
      }
      
      // Step 1: Upload album cover (10% progress)
      setUploadProgress(10);
      let albumCoverUrl = null;
      if (albumFormData.albumCover) {
        const imageUploadResult = await uploadImage(
          user.id, 
          albumFormData.albumCover, 
          'album-covers'
        );
        
        if (imageUploadResult.success) {
          albumCoverUrl = imageUploadResult.data?.url;
          console.log('✅ Album cover uploaded');
        } else {
          console.warn('Failed to upload album cover:', imageUploadResult.error);
        }
      }
      
      setUploadProgress(20);
      
      // Step 2: Create album in database
      const { data: album, error: albumError } = await dbHelpers.createAlbum({
        creator_id: user.id,
        title: albumFormData.albumTitle,
        description: albumFormData.albumDescription,
        genre: albumFormData.albumGenre,
        cover_image_url: albumCoverUrl,
        release_date: albumFormData.releaseDate?.toISOString().split('T')[0],
        status: albumFormData.status,
        is_public: true,
      });
      
      if (albumError || !album) {
        throw new Error('Failed to create album: ' + albumError?.message);
      }
      
      console.log('✅ Album created:', album.id);
      setUploadProgress(30);
      
      // Step 3: Upload tracks (60% progress split among tracks)
      const totalTracks = albumFormData.tracks.length;
      const progressPerTrack = 60 / totalTracks;
      
      for (let i = 0; i < albumFormData.tracks.length; i++) {
        const track = albumFormData.tracks[i];
        console.log(`🎵 Uploading track ${i + 1}/${totalTracks}...`);
        
        // Upload audio file
        const audioUploadResult = await uploadAudioFile(user.id, track.audioFile!);
        if (!audioUploadResult.success) {
          throw new Error(`Failed to upload track ${i + 1}: ${audioUploadResult.error?.message}`);
        }
        
        // Create track record
        const trackData = {
          creator_id: user.id,
          title: track.title,
          description: '',
          genre: albumFormData.albumGenre,
          audio_file_url: audioUploadResult.data?.url || '',
          duration: track.duration || 0,
          lyrics: track.lyrics || null,
          lyrics_language: track.lyricsLanguage || 'en',
          is_public: albumFormData.status === 'published',
          content_type: 'music' as const,
          tags: [],
        };
        
        const trackResult = await createAudioTrack(trackData);
        if (!trackResult.success || !trackResult.data) {
          throw new Error(`Failed to create track ${i + 1}: ${trackResult.error?.message}`);
        }
        
        // Add track to album
        const { error: addTrackError } = await dbHelpers.addTrackToAlbum(
          album.id,
          trackResult.data.id,
          track.trackNumber
        );
        
        if (addTrackError) {
          throw new Error(`Failed to add track ${i + 1} to album: ${addTrackError.message}`);
        }
        
        console.log(`✅ Track ${i + 1} uploaded and added to album`);
        setUploadProgress(30 + (i + 1) * progressPerTrack);
      }
      
      setUploadProgress(100);
      
      Alert.alert(
        'Success!',
        `Album "${albumFormData.albumTitle}" ${albumFormData.status === 'published' ? 'published' : 'saved as draft'} successfully!`,
        [
          {
            text: 'View Album',
            onPress: () => navigation.navigate('AlbumDetails', { albumId: album.id }),
          },
          { text: 'OK' },
        ]
      );
      
      // Reset form
      setAlbumFormData({
        albumTitle: '',
        albumDescription: '',
        albumGenre: '',
        albumCover: null,
        releaseDate: null,
        status: 'draft',
        tracks: [],
      });
      setAlbumStep(1);
      
      // Refresh quota
      loadUploadQuota();
      
    } catch (error) {
      console.error('Album upload failed:', error);
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

  const renderFileUpload = (type: 'coverImage' | 'audioFile', title: string, fileUri?: { uri: string; name: string } | null) => {
    // Add Step 14 tour to audio file upload
    const UploadButton = type === 'audioFile' ? WalkthroughableTouchable : TouchableOpacity;
    const tourProps = type === 'audioFile' ? {
      order: 14,
      name: 'upload_reach_audience',
      text: 'Select your audio file here to begin uploading. Your track reaches YOUR followers FIRST (targeted, not random like Spotify). Free: 3 tracks, Premium: 10, Unlimited: ∞. Start distributing FREE and earning 95% from tips now!',
    } : {};

    return (
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
          <UploadButton
            {...tourProps}
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
          </UploadButton>
        )}
      </View>
    );
  };

  // Upload Mode Selector Component
  const UploadModeSelector = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upload Mode</Text>
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeOption,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            uploadMode === 'single' && { 
              borderColor: theme.colors.primary, 
              borderWidth: 2,
              backgroundColor: theme.colors.primary + '10',
            }
          ]}
          onPress={() => {
            setUploadMode('single');
            setAlbumStep(1);
          }}
        >
          <Ionicons 
            name="musical-note" 
            size={32} 
            color={uploadMode === 'single' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.modeLabel, 
            { color: uploadMode === 'single' ? theme.colors.primary : theme.colors.text }
          ]}>
            Single Track
          </Text>
          <Text style={[styles.modeDescription, { color: theme.colors.textSecondary }]}>
            Upload one track
          </Text>
          {uploadMode === 'single' && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.modeCheckmark} 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeOption,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            uploadMode === 'album' && { 
              borderColor: theme.colors.primary, 
              borderWidth: 2,
              backgroundColor: theme.colors.primary + '10',
            }
          ]}
          onPress={() => {
            const tier = uploadQuota?.tier?.toLowerCase() || 'free';
            if (tier === 'free') {
              Alert.alert(
                'Upgrade Required',
                'Albums are only available for Premium and Unlimited users. Upgrade now to create albums!',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'View Plans', onPress: handleUpgradePress },
                ]
              );
              return;
            }
            setUploadMode('album');
            setAlbumStep(1);
          }}
        >
          <Ionicons 
            name="albums" 
            size={32} 
            color={uploadMode === 'album' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.modeLabel, 
            { color: uploadMode === 'album' ? theme.colors.primary : theme.colors.text }
          ]}>
            Album
          </Text>
          <Text style={[styles.modeDescription, { color: theme.colors.textSecondary }]}>
            Multiple tracks
          </Text>
          {uploadMode === 'album' && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.modeCheckmark} 
            />
          )}
          {(uploadQuota?.tier === 'free' || !uploadQuota?.tier) && (
            <View style={[styles.upgradeBadge, { backgroundColor: theme.colors.warning }]}>
              <Text style={styles.upgradeBadgeText}>PRO</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Album Form - Step 1: Metadata
  const AlbumMetadataForm = () => (
    <View>
      {/* Album Title */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Album Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Enter album title"
          placeholderTextColor={theme.colors.textSecondary}
          value={albumFormData.albumTitle}
          onChangeText={(text) => setAlbumFormData(prev => ({ ...prev, albumTitle: text }))}
        />
      </View>

      {/* Album Description */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Tell us about this album..."
          placeholderTextColor={theme.colors.textSecondary}
          value={albumFormData.albumDescription}
          onChangeText={(text) => setAlbumFormData(prev => ({ ...prev, albumDescription: text }))}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Album Genre */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Genre *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                albumFormData.albumGenre === genre && { 
                  backgroundColor: theme.colors.primary, 
                  borderColor: theme.colors.primary 
                }
              ]}
              onPress={() => setAlbumFormData(prev => ({ ...prev, albumGenre: genre }))}
            >
              <Text style={[
                styles.genreChipText,
                { color: albumFormData.albumGenre === genre ? '#fff' : theme.colors.text }
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Album Cover */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Album Cover *</Text>
        {albumFormData.albumCover ? (
          <View style={[styles.filePreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Image source={{ uri: albumFormData.albumCover.uri }} style={styles.albumCoverPreview} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setAlbumFormData(prev => ({ ...prev, albumCover: null }))}
            >
              <Ionicons name="close" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={pickAlbumCover}
          >
            <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.uploadButtonText, { color: theme.colors.text }]}>Select Album Cover</Text>
            <Text style={[styles.uploadButtonSubtext, { color: theme.colors.textSecondary }]}>
              JPG, PNG (Max 2MB)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Release Status */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Release Status</Text>
        <View style={styles.statusContainer}>
          {(['draft', 'published'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                albumFormData.status === status && { 
                  borderColor: theme.colors.primary, 
                  borderWidth: 2,
                  backgroundColor: theme.colors.primary + '10',
                }
              ]}
              onPress={() => setAlbumFormData(prev => ({ ...prev, status }))}
            >
              <Text style={[
                styles.statusLabel,
                { color: albumFormData.status === status ? theme.colors.primary : theme.colors.text }
              ]}>
                {status === 'draft' ? 'Save as Draft' : 'Publish Now'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          if (!albumFormData.albumTitle.trim()) {
            Alert.alert('Required', 'Please enter an album title');
            return;
          }
          if (!albumFormData.albumGenre) {
            Alert.alert('Required', 'Please select a genre');
            return;
          }
          if (!albumFormData.albumCover) {
            Alert.alert('Required', 'Please select an album cover');
            return;
          }
          setAlbumStep(2);
        }}
      >
        <Text style={styles.primaryButtonText}>Next: Add Tracks</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Album Form - Step 2: Add Tracks
  const AlbumTracksForm = () => (
    <View style={{ flex: 1 }}>
      <View>
        {/* Track List */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tracks ({albumFormData.tracks.length})
          </Text>
          
          {albumFormData.tracks.length === 0 ? (
            <View style={styles.emptyTracksContainer}>
              <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTracksText, { color: theme.colors.textSecondary }]}>
                No tracks added yet
              </Text>
              <Text style={[styles.emptyTracksSubtext, { color: theme.colors.textSecondary }]}>
                Tap the button below to add tracks to your album
              </Text>
            </View>
          ) : (
            <View>
              {albumFormData.tracks.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.trackItem,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                  ]}
                >
                  {/* Reorder Buttons */}
                  <View style={styles.trackReorderButtons}>
                    <TouchableOpacity
                      onPress={() => {
                        if (index > 0) {
                          const newTracks = [...albumFormData.tracks];
                          [newTracks[index], newTracks[index - 1]] = [newTracks[index - 1], newTracks[index]];
                          setAlbumFormData(prev => ({
                            ...prev,
                            tracks: newTracks.map((track, idx) => ({ ...track, trackNumber: idx + 1 })),
                          }));
                        }
                      }}
                      disabled={index === 0}
                      style={{ opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-up" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (index < albumFormData.tracks.length - 1) {
                          const newTracks = [...albumFormData.tracks];
                          [newTracks[index], newTracks[index + 1]] = [newTracks[index + 1], newTracks[index]];
                          setAlbumFormData(prev => ({
                            ...prev,
                            tracks: newTracks.map((track, idx) => ({ ...track, trackNumber: idx + 1 })),
                          }));
                        }
                      }}
                      disabled={index === albumFormData.tracks.length - 1}
                      style={{ opacity: index === albumFormData.tracks.length - 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.trackNumber}>
                    <Text style={[styles.trackNumberText, { color: theme.colors.text }]}>
                      {item.trackNumber}
                    </Text>
                  </View>
                  <View style={styles.trackInfo}>
                    <TextInput
                      style={[styles.trackTitleInput, { color: theme.colors.text }]}
                      value={item.title}
                      onChangeText={(text) => updateTrackTitle(item.id, text)}
                      placeholder="Track title"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                    <Text style={[styles.trackFileName, { color: theme.colors.textSecondary }]}>
                      {item.audioFile?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trackRemoveButton}
                    onPress={() => removeTrackFromAlbum(item.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Track Button */}
          <TouchableOpacity
            style={[styles.addTrackButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={addTrackToAlbum}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.addTrackButtonText, { color: theme.colors.primary }]}>
              Add Track
            </Text>
          </TouchableOpacity>

          {/* Tier Limit Info */}
          {uploadQuota?.tier === 'premium' && (
            <Text style={[styles.limitInfo, { color: theme.colors.textSecondary }]}>
              Premium: {albumFormData.tracks.length}/7 tracks
            </Text>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setAlbumStep(1)}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
            onPress={() => {
              if (albumFormData.tracks.length === 0) {
                Alert.alert('Required', 'Please add at least one track');
                return;
              }
              setAlbumStep(3);
            }}
          >
            <Text style={styles.primaryButtonText}>Next: Review</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Album Form - Step 3: Review & Upload
  const AlbumReviewForm = () => (
    <View>
      {/* Album Summary */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Album Summary</Text>
        
        <View style={styles.reviewRow}>
          {albumFormData.albumCover && (
            <Image source={{ uri: albumFormData.albumCover.uri }} style={styles.reviewAlbumCover} />
          )}
          <View style={styles.reviewInfo}>
            <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>
              {albumFormData.albumTitle}
            </Text>
            <Text style={[styles.reviewDetail, { color: theme.colors.textSecondary }]}>
              {albumFormData.albumGenre} • {albumFormData.tracks.length} tracks
            </Text>
            <Text style={[styles.reviewDetail, { color: theme.colors.textSecondary }]}>
              Status: {albumFormData.status === 'draft' ? 'Draft' : 'Published'}
            </Text>
          </View>
        </View>

        {albumFormData.albumDescription && (
          <Text style={[styles.reviewDescription, { color: theme.colors.textSecondary }]}>
            {albumFormData.albumDescription}
          </Text>
        )}
      </View>

      {/* Track List Summary */}
      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Track List</Text>
        {albumFormData.tracks.map((track) => (
          <View key={track.id} style={styles.reviewTrack}>
            <Text style={[styles.reviewTrackNumber, { color: theme.colors.textSecondary }]}>
              {track.trackNumber}.
            </Text>
            <Text style={[styles.reviewTrackTitle, { color: theme.colors.text }]}>
              {track.title}
            </Text>
          </View>
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setAlbumStep(2)}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.primaryButton, 
            { backgroundColor: theme.colors.primary, flex: 1 },
            isUploading && { opacity: 0.6 }
          ]}
          onPress={handleAlbumUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.primaryButtonText}>Uploading... {uploadProgress}%</Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {albumFormData.status === 'draft' ? 'Save Draft' : 'Publish Album'}
              </Text>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
      
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        <View style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Content</Text>
          {/* Step 15: You're Ready to EARN (Final Step) */}
          <WalkthroughableTouchable
            order={15}
            name="ready_to_earn"
            text="Tap Publish when ready! Your music goes LIVE instantly. Followers see it FIRST in their feed. You earn from: Tips (95% yours), Event tickets (95%), Paid collaborations, Services marketplace. You're ready to EARN. Welcome to SoundBridge! 🎉"
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
          </WalkthroughableTouchable>
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

          {/* Storage Indicator - NEW */}
          {uploadQuota?.storage && (
            <StorageIndicator storageQuota={uploadQuota.storage} />
          )}

          {/* Upload Mode Selector */}
          <UploadModeSelector />

          {/* Single Track Mode */}
          {uploadMode === 'single' && (
            <>
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

        {/* ACRCloud Audio Fingerprinting (for music only) */}
        {formData.contentType === 'music' && formData.audioFile && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Audio Verification</Text>

            {/* Loading State */}
            {acrcloudStatus === 'checking' && (
              <View style={[styles.acrcloudStatus, styles.acrcloudChecking, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <View style={styles.acrcloudContent}>
                  <Text style={[styles.acrcloudTitle, { color: theme.colors.primary }]}>Verifying audio content...</Text>
                  <Text style={[styles.acrcloudDetails, { color: theme.colors.textSecondary }]}>
                    Checking if this track exists on streaming platforms
                  </Text>
                </View>
              </View>
            )}

            {/* Match Found State */}
            {acrcloudStatus === 'match' && acrcloudData && 'detectedTitle' in acrcloudData && (
              <View style={[styles.acrcloudStatus, styles.acrcloudMatch, { borderColor: '#FFA500', backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="alert-circle" size={24} color="#FFA500" />
                <View style={styles.acrcloudContent}>
                  <Text style={[styles.acrcloudTitle, { color: '#1a1a1a' }]}>This song appears to be a released track</Text>
                  <Text style={[styles.acrcloudDetails, { color: '#4a4a4a', marginTop: 8 }]}>
                    <Text style={{ fontWeight: '600' }}>Title:</Text> {acrcloudData.detectedTitle}
                  </Text>
                  <Text style={[styles.acrcloudDetails, { color: '#4a4a4a' }]}>
                    <Text style={{ fontWeight: '600' }}>Artist:</Text> {acrcloudData.detectedArtist}
                  </Text>
                  {acrcloudData.detectedAlbum && (
                    <Text style={[styles.acrcloudDetails, { color: '#4a4a4a' }]}>
                      <Text style={{ fontWeight: '600' }}>Album:</Text> {acrcloudData.detectedAlbum}
                    </Text>
                  )}
                  <Text style={[styles.acrcloudMessage, { color: '#666666', marginTop: 8 }]}>
                    To upload this track, please provide a valid ISRC code for verification.
                  </Text>

                  {/* Artist Mismatch Warning */}
                  {acrcloudData.artistMatch && !acrcloudData.artistMatch.match && (
                    <View style={[styles.artistMismatchWarning, { backgroundColor: '#FFEBEE', borderColor: '#DC2626' }]}>
                      <Ionicons name="warning" size={18} color="#DC2626" />
                      <Text style={[styles.artistMismatchText, { color: '#DC2626' }]}>
                        Artist name mismatch. This track belongs to "{acrcloudData.detectedArtist}". Please verify ownership with ISRC.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* No Match State */}
            {acrcloudStatus === 'no_match' && (
              <View style={[styles.acrcloudStatus, styles.acrcloudNoMatch, { borderColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <View style={styles.acrcloudContent}>
                  <Text style={[styles.acrcloudTitle, { color: theme.colors.text }]}>This appears to be original/unreleased music</Text>
                  <Text style={[styles.acrcloudDetails, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    No match found in music databases. You can proceed with upload.
                  </Text>

                  <TouchableOpacity
                    onPress={() => setIsOriginalConfirmed(!isOriginalConfirmed)}
                    style={[styles.originalMusicCheckbox, { borderColor: theme.colors.border, marginTop: 12 }]}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.colors.border },
                      isOriginalConfirmed && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}>
                      {isOriginalConfirmed && <Ionicons name="checkmark" size={18} color="#fff" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                      I confirm this is my original/unreleased music and I own all rights to it
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Error State */}
            {acrcloudStatus === 'error' && (
              <View style={[styles.acrcloudStatus, styles.acrcloudError, { borderColor: '#FFA500', backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="information-circle" size={24} color="#FFA500" />
                <View style={styles.acrcloudContent}>
                  <Text style={[styles.acrcloudTitle, { color: '#1a1a1a' }]}>Audio verification unavailable</Text>
                  <Text style={[styles.acrcloudDetails, { color: '#4a4a4a', marginTop: 4 }]}>
                    {acrcloudError}
                  </Text>
                  <Text style={[styles.acrcloudMessage, { color: '#666666', marginTop: 8 }]}>
                    Fingerprinting failed. You can still proceed with upload. Your track will be flagged for manual review.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ISRC Verification Section */}
        {formData.contentType === 'music' && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Show different titles based on ACRCloud status */}
            {acrcloudStatus === 'match' ? (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>ISRC Verification Required *</Text>
                <Text style={[styles.hintText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                  This track was detected as a released song. Please provide the ISRC code to verify ownership.
                </Text>
              </View>
            ) : (
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cover Song Verification</Text>
            )}

            {/* Cover Song Toggle - Only show if ACRCloud didn't detect a match */}
            {acrcloudStatus !== 'match' && (
              <TouchableOpacity
                onPress={() => setIsCover(!isCover)}
                style={[styles.coverSongCheckbox, { borderColor: theme.colors.border }]}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.colors.border },
                  isCover && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}>
                  {isCover && <Ionicons name="checkmark" size={18} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                  This is a cover song
                </Text>
              </TouchableOpacity>
            )}

            {/* ISRC Input - Show if ACRCloud match OR user checked "cover song" */}
            {(acrcloudStatus === 'match' || isCover) && (
              <View style={styles.isrcContainer}>
                {/* Warning for detected matches - DO NOT show the ISRC */}
                {acrcloudStatus === 'match' && (
                  <View style={[styles.detectedIsrcHint, { backgroundColor: '#FFF3E0', borderColor: '#FF9800', marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark" size={20} color="#FF9800" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E65100', fontWeight: '600', fontSize: 14, marginBottom: 4 }}>
                          Ownership Verification Required
                        </Text>
                        <Text style={{ color: '#EF6C00', fontSize: 13, lineHeight: 18 }}>
                          To upload this track, please enter the ISRC code from your music distributor (DistroKid, TuneCore, CD Baby, etc.). The ISRC must match the detected track.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    ISRC Code *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
                      isrcVerificationStatus === 'error' && { borderColor: theme.colors.error },
                      isrcVerificationStatus === 'success' && { borderColor: theme.colors.success },
                    ]}
                    placeholder="Type the ISRC code (e.g., GBUM71502800)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={isrcCode}
                    onChangeText={handleISRCChange}
                    maxLength={14}
                    autoCapitalize="characters"
                  />
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                    Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional)
                  </Text>
                </View>

                {/* Verification Status Display */}
                {isrcVerificationStatus === 'loading' && (
                  <View style={[styles.verificationStatus, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.verificationText, { color: theme.colors.primary }]}>
                      Verifying ISRC code...
                    </Text>
                  </View>
                )}

                {isrcVerificationStatus === 'success' && isrcVerificationData && (
                  <View style={[styles.verificationSuccess, { borderColor: '#10B981', backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View style={styles.verificationContent}>
                      <Text style={[styles.verificationTitle, { color: '#065F46' }]}>Verified</Text>
                      <Text style={[styles.verificationDetails, { color: '#047857' }]}>
                        {isrcVerificationData.title}
                        {isrcVerificationData['artist-credit']?.length > 0 &&
                          ` by ${isrcVerificationData['artist-credit'].map((a: any) => a.name || a.artist?.name).join(', ')}`
                        }
                      </Text>
                    </View>
                  </View>
                )}

                {isrcVerificationStatus === 'error' && isrcVerificationError && (
                  <View style={[styles.verificationError, { borderColor: theme.colors.error, backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                    <View style={styles.verificationContent}>
                      <Text style={[styles.verificationTitle, { color: '#DC2626' }]}>Verification Failed</Text>
                      <Text style={[styles.verificationDetails, { color: '#991B1B' }]}>
                        {isrcVerificationError}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

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

          {/* Copyright Verification */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Copyright Confirmation *</Text>
            <View style={[styles.copyrightContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} style={styles.copyrightIcon} />
              <View style={styles.copyrightTextContainer}>
                <Text style={[styles.copyrightText, { color: theme.colors.text }]}>
                  I confirm that I own all rights to this music and it does not infringe any third-party copyrights. I understand that uploading copyrighted content without permission may result in account suspension or termination.
                </Text>
                <TouchableOpacity onPress={() => {
                  navigation.navigate('CopyrightPolicy' as never);
                }}>
                  <Text style={[styles.copyrightLearnMore, { color: theme.colors.primary }]}>
                    Learn more about our copyright policy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.copyrightCheckbox, { borderColor: theme.colors.border }]}
              onPress={() => setAgreedToCopyright(!agreedToCopyright)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.colors.border },
                agreedToCopyright && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}>
                {agreedToCopyright && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                I agree to the copyright terms above
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cover Art */}
          {renderFileUpload('coverImage', 'Cover Art (Optional)', formData.coverImage)}
            </>
          )}

          {/* Album Mode */}
          {uploadMode === 'album' && (
            <>
              {/* Album Step Indicator */}
              <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.stepIndicator}>
                  <View style={[styles.step, albumStep >= 1 && { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.stepNumber, { color: albumStep >= 1 ? '#fff' : theme.colors.text }]}>1</Text>
                  </View>
                  <View style={[styles.stepLine, albumStep >= 2 && { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.step, albumStep >= 2 && { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.stepNumber, { color: albumStep >= 2 ? '#fff' : theme.colors.text }]}>2</Text>
                  </View>
                  <View style={[styles.stepLine, albumStep >= 3 && { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.step, albumStep >= 3 && { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.stepNumber, { color: albumStep >= 3 ? '#fff' : theme.colors.text }]}>3</Text>
                  </View>
                </View>
                <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>
                  Step {albumStep}: {albumStep === 1 ? 'Album Info' : albumStep === 2 ? 'Add Tracks' : 'Review'}
                </Text>
              </View>

              {/* Album Forms */}
              {albumStep === 1 && <AlbumMetadataForm />}
              {albumStep === 2 && <AlbumTracksForm />}
              {albumStep === 3 && <AlbumReviewForm />}
            </>
          )}
      </ScrollView>
        </View>
      </SafeAreaView>

      {/* Service Provider Prompt Modal */}
      <ServiceProviderPromptModal
        visible={showServiceProviderPrompt}
        onSetupProfile={handleSetupProfile}
        onRemindLater={handleRemindLater}
        onDontShowAgain={handleDontShowAgain}
      />
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
    paddingTop: 8,
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
  // Album Mode Styles
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  modeDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  modeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  upgradeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#ccc',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  // Album Form Styles
  genreScroll: {
    marginTop: 8,
  },
  albumCoverPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statusOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Track List Styles
  emptyTracksContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTracksText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyTracksSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  trackReorderButtons: {
    flexDirection: 'column',
    marginRight: 12,
    gap: 4,
  },
  trackNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitleInput: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackFileName: {
    fontSize: 12,
  },
  trackRemoveButton: {
    padding: 8,
  },
  addTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    marginTop: 12,
  },
  addTrackButtonText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  limitInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Review Styles
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reviewAlbumCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  reviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  reviewDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewTrack: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  reviewTrackNumber: {
    width: 30,
    fontSize: 14,
  },
  reviewTrackTitle: {
    flex: 1,
    fontSize: 14,
  },
  // Copyright Verification Styles
  copyrightContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  copyrightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  copyrightTextContainer: {
    flex: 1,
  },
  copyrightText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  copyrightLearnMore: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  copyrightCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  // ACRCloud Audio Fingerprinting Styles
  acrcloudStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  acrcloudChecking: {
    alignItems: 'center',
  },
  acrcloudMatch: {
    backgroundColor: '#FFF8E1',
  },
  acrcloudNoMatch: {
    backgroundColor: '#E8F5E9',
  },
  acrcloudError: {
    // backgroundColor defined inline
  },
  acrcloudContent: {
    flex: 1,
    marginLeft: 12,
  },
  acrcloudTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  acrcloudDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  acrcloudMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  artistMismatchWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  artistMismatchText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  originalMusicCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  // Cover Song ISRC Verification Styles
  coverSongCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  isrcContainer: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  verificationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  verificationSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
  },
  verificationError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
  },
  verificationContent: {
    flex: 1,
    marginLeft: 8,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  verificationDetails: {
    fontSize: 12,
  },
});