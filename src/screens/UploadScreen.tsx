import React, { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  Dimensions,
  Image,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, dbHelpers } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';
import { config } from '../config/environment';
import PricingControls from '../components/PricingControls';
import { getUploadQuota, UploadQuota, invalidateQuotaCache } from '../services/UploadQuotaService';
import { uploadAudioFile, uploadImage, createAudioTrack } from '../services/UploadService';
import subscriptionService from '../services/SubscriptionService';
import { walkthroughable } from 'react-native-copilot';
import { useServiceProviderPrompt } from '../hooks/useServiceProviderPrompt';
import ServiceProviderPromptModal from '../components/ServiceProviderPromptModal';
import { useCreatorAgreement } from '../hooks/useCreatorAgreement';
import CreatorAgreementModal from '../components/CreatorAgreementModal';
import { collectDeviceInfo } from '../utils/deviceInfo';
// Temporarily disabled for Expo Go compatibility
// import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

type ContentType = 'music' | 'podcast' | 'mixtape' | 'audio_book';
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
  // Mixtape-specific fields
  djName: string;
  tracklist: string;
  // Audio book-specific fields
  narrator: string;
  chapterNumber: string;
  bookGenre: string;
  // Common fields
  tags: string;
  lyrics: string;
  lyricsLanguage: string;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate: string;
  coverImage: { uri: string; name: string; type: string } | null;
  audioFile: { uri: string; name: string; type: string; size?: number } | null;
  // Paid content fields
  isPaid: boolean;
  price: string;
  currency: 'USD' | 'GBP' | 'EUR';
  liveInterestEnabled: boolean;
  moodTags: string[];
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
const WalkthroughableTouchable = walkthroughable(TouchableOpacity) as React.ComponentType<any>;
const WalkthroughableView = walkthroughable(View);

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const { requestAgreement, agreementVisible, agreementSubmitting, onAgreed, onDismiss } = useCreatorAgreement();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQuota, setUploadQuota] = useState<UploadQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const storageAlertActiveRef = useRef(false);
  const lastStorageAlertRef = useRef<string | null>(null);
  const lastStorageAlertAtRef = useRef<number | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storagePromptKind, setStoragePromptKind] = useState<'near' | 'full'>('near');
  const [storagePromptPercent, setStoragePromptPercent] = useState(0);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [agreedToCopyright, setAgreedToCopyright] = useState(false);
  const [agreedToMixtapeTerms, setAgreedToMixtapeTerms] = useState(false);

  // Audio duration (seconds) extracted from the picked file before upload
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Cover song ISRC verification state
  const [isCover, setIsCover] = useState(false);
  const [originalArtistName, setOriginalArtistName] = useState('');
  const [originalSongTitle, setOriginalSongTitle] = useState('');
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
    djName: '',
    tracklist: '',
    episodeNumber: '',
    podcastCategory: '',
    narrator: '',
    chapterNumber: '',
    bookGenre: '',
    tags: '',
    lyrics: '',
    lyricsLanguage: 'en',
    privacy: 'public',
    publishOption: 'now',
    scheduleDate: '',
    coverImage: null,
    audioFile: null,
    isPaid: false,
    price: '',
    currency: 'USD',
    liveInterestEnabled: false,
    moodTags: [],
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

  const MOOD_OPTIONS = [
    'Worshipful', 'Energetic', 'Reflective', 'Celebratory', 'Raw and honest',
    'Uplifting', 'Melancholic', 'Peaceful', 'Intense', 'Romantic',
    'Nostalgic', 'Motivational',
  ];

  const podcastCategories = [
    'Technology', 'Business', 'Education', 'Entertainment', 'News',
    'Sports', 'Health', 'Science', 'Arts', 'Comedy', 'True Crime', 'History', 'Other'
  ];

  const bookGenres = [
    'Fiction', 'Non-Fiction', 'Self-Help', 'Romance', 'Thriller',
    'Science Fiction', 'Fantasy', 'Biography', 'History', 'Business',
    "Children's", 'Mystery', 'Spirituality', 'Poetry', 'Other'
  ];

  // Supported audio file types — must stay in sync with UploadService.ts ALLOWED_AUDIO_TYPES.
  // iOS document picker returns 'audio/x-m4a' for M4A and 'audio/x-wav' for WAV; omitting
  // these caused "Unsupported file type" for the most common iPhone export formats.
  // Android can return 'audio/wave' or 'audio/vnd.wave' for WAV files depending on device/OS.
  const supportedAudioTypes = [
    'audio/mpeg', 'audio/mp3',
    'audio/wav',  'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
    'audio/m4a',  'audio/x-m4a',
    'audio/aac',  'audio/ogg',
    'audio/webm', 'audio/flac',
  ];

  const maxFileSize = formData.contentType === 'mixtape'
    ? 200 * 1024 * 1024  // 200MB for DJ mixtapes
    : 100 * 1024 * 1024; // 100MB for tracks and podcasts
  const maxImageSize = 5 * 1024 * 1024; // 5MB limit for images

  const loadUploadQuota = async (forceRefresh = false) => {
    if (!session) {
      setUploadQuota(null);
      setQuotaLoading(false);
      return null;
    }

    setQuotaLoading(true);
    const quota = await getUploadQuota(session, forceRefresh);
    setUploadQuota(quota);
    setQuotaLoading(false);
    return quota;
  };

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

  // Refresh quota when screen gains focus to ensure tier and storage are up-to-date
  // This fixes discrepancies between screens (Upload vs Upgrade, Upload vs Storage Management)
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const refreshQuota = async () => {
        if (!session) return;

        // Invalidate cache first to ensure fresh data
        invalidateQuotaCache();

        // Force refresh to get latest subscription tier and storage usage
        const refreshedQuota = await loadUploadQuota(true);

        if (isMounted && refreshedQuota) {
          console.log('✅ Quota refreshed on focus:', {
            tier: refreshedQuota.tier,
            storageUsed: refreshedQuota.storage?.storage_used_formatted,
            storageLimit: refreshedQuota.storage?.storage_limit_formatted,
          });
        }
      };

      refreshQuota();

      return () => {
        isMounted = false;
      };
    }, [session])
  );

  const handleUpgradePress = () => {
    navigation.navigate('Upgrade' as never);
  };

  const handleOpenStorage = () => {
    navigation.navigate('StorageManagement' as never);
  };

  useEffect(() => {
    const storage = uploadQuota?.storage;
    if (!storage || storage.is_unlimited_tier) {
      return;
    }

    const percentUsed = Number(storage.storage_percent_used);
    if (!Number.isFinite(percentUsed)) {
      return;
    }

    if (percentUsed < 80) {
      lastStorageAlertRef.current = null;
      return;
    }

    const storageAvailable = Number(storage.storage_available ?? 0);
    const isStorageEmpty = Number.isFinite(storageAvailable) && storageAvailable <= 0;
    const alertKind = isStorageEmpty || percentUsed >= 95 ? 'full' : percentUsed >= 85 ? 'near' : null;
    if (!alertKind) {
      return;
    }

    const now = Date.now();
    if (lastStorageAlertAtRef.current && now - lastStorageAlertAtRef.current < 5 * 60 * 1000) {
      return;
    }

    const alertKey = `${alertKind}-${Math.floor(percentUsed)}`;
    if (storageAlertActiveRef.current || lastStorageAlertRef.current === alertKey) {
      return;
    }

    storageAlertActiveRef.current = true;
    lastStorageAlertRef.current = alertKey;
    lastStorageAlertAtRef.current = now;

    setStoragePromptKind(alertKind);
    setStoragePromptPercent(Math.round(percentUsed));
    setShowStorageModal(true);
  }, [uploadQuota]);

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
    if (!isrc || typeof isrc !== 'string' || isrc.trim() === '') {
      return { valid: false, error: 'Please enter an ISRC code to verify, or leave the field blank.' };
    }

    // Remove hyphens and spaces, convert to uppercase
    const normalized = isrc.replace(/[-\s]/g, '').toUpperCase();

    // Must be exactly 12 characters (user_provided ISRCs are standard canonical 12-char)
    if (normalized.length !== 12) {
      return {
        valid: false,
        error: 'Invalid ISRC — must be 12 characters, e.g. USRC12345678'
      };
    }

    // Must be alphanumeric (last 5 must be digits)
    if (!/^[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}[0-9]{5}$/.test(normalized)) {
      return {
        valid: false,
        error: 'Invalid ISRC format. Expected XX-XXX-YY-NNNNN, e.g. US-RC1-23-45678'
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
      const formatCheck = validateISRCFormat(isrc);
      if (!formatCheck.valid) {
        // Don't show an error while user is still typing
        const normalized = isrc.trim().replace(/[-\s]/g, '').toUpperCase();
        if (normalized.length < 12) {
          setIsrcVerificationStatus('idle');
          return;
        }
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(formatCheck.error || 'Invalid ISRC format');
        setIsrcVerificationData(null);
        return;
      }

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

      // For original songs (non-cover), just accept the ISRC — format is already validated above.
      // ISRCs for original/unreleased music won't be in MusicBrainz, so don't check there.
      if (!isCover) {
        console.log('✅ ISRC accepted for original song (format valid, no MusicBrainz check needed)');
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData({ title: 'ISRC format valid' });
        return;
      }

      // For cover songs with no ACRCloud match, verify ISRC via MusicBrainz API
      // to confirm the ISRC matches the original recording being covered.
      const response = await fetch(`${config.apiUrl}/api/upload/verify-isrc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isrc: isrc.trim() }),
      });

      const contentType = response.headers.get('content-type');
      let data: any = null;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { error: text || 'ISRC verification failed' };
        }
      } catch (parseError) {
        data = { error: 'Invalid response from ISRC verification service' };
      }

      if (!response.ok) {
        // If MusicBrainz can't find it, don't hard-block — just warn
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(data?.error || 'ISRC not found — make sure the original recording is released and distributed.');
        setIsrcVerificationData(null);
        return;
      }

      if (data?.success && data?.verified) {
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData(data.recording);
      } else {
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(data?.error || 'ISRC not found — make sure the original recording is released and distributed.');
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
    // Skip fingerprinting for files over 15MB — ACRCloud's API rejects large files
    // (it only needs a short sample to identify a track). Large files are likely
    // high-quality WAVs or long recordings; treat them as original/no-match.
    const FINGERPRINT_MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size && file.size > FINGERPRINT_MAX_SIZE) {
      console.log(`⏭️ Skipping ACRCloud — file is ${(file.size / 1024 / 1024).toFixed(1)}MB (>${FINGERPRINT_MAX_SIZE / 1024 / 1024}MB threshold)`);
      setAcrcloudStatus('no_match');
      setAcrcloudData({ success: true, matchFound: false } as any);
      return;
    }

    setAcrcloudStatus('checking');
    setAcrcloudError(null);
    setAcrcloudData(null);
    setIsOriginalConfirmed(false);
    let cleanupPath: string | null = null;

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
      cleanupPath = uploadData.path;

      const { data: urlData } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(uploadData.path);

      const storageUrl = urlData.publicUrl;
      console.log('✅ File uploaded to storage:', storageUrl);

      // Step 2: Send URL to fingerprint API (small JSON payload - no size limit)
      console.log('📤 Sending URL to fingerprint API...');

      const response = await fetch(`${config.apiUrl}/api/upload/fingerprint`, {
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
        return;
      }

      if (data.matchFound) {
        // Match found - require ISRC
        handleMatchFound(data);
      } else {
        // No match - original music
        handleNoMatch(data);
      }

    } catch (error: any) {
      console.error('❌ ACRCloud error:', error);
      handleAcrcloudError({ error: error.message, errorCode: 'API_ERROR' });
    } finally {
      if (cleanupPath) {
        await cleanupTempFile(cleanupPath);
      }
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

    // Auto-populate original artist/title from ACRCloud — user can edit if needed
    if (data.detectedArtist) setOriginalArtistName(data.detectedArtist);
    if (data.detectedTitle) setOriginalSongTitle(data.detectedTitle);
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
    const msg: string = error.error || '';
    // If ACRCloud rejects because the file is too large, treat as no_match (original music).
    // ACRCloud only needs a short sample — large files hitting their limit are not a copyright concern.
    if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('exceed')) {
      console.log('⏭️ ACRCloud file-too-large — treating as no match');
      setAcrcloudStatus('no_match');
      setAcrcloudData({ success: true, matchFound: false } as any);
      return;
    }
    console.log('⚠️ ACRCloud error:', msg || 'Fingerprinting failed');
    setAcrcloudStatus('error');
    setAcrcloudError(msg || 'Fingerprinting failed');

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
        // ACRCloud detected a released track — require original artist/title for the cover record
        if (!originalArtistName.trim()) {
          errors.push('Please enter the original artist name for this track.');
        }
        if (!originalSongTitle.trim()) {
          errors.push('Please enter the original song title for this track.');
        }
        // ISRC for match: ACRCloud detected one — user-entered ISRC is optional extra verification
        if (isrcCode.trim() && isrcVerificationStatus !== 'success') {
          errors.push('The ISRC code you entered could not be verified. Please check it or leave the field blank.');
        }
      }

      if (acrcloudStatus === 'no_match') {
        if (!isCover && !isOriginalConfirmed) {
          errors.push('Please confirm this is your original/unreleased music');
        }
        // Cover fields required when user declares it's a cover
        if (isCover) {
          if (!originalArtistName.trim()) {
            errors.push('Please enter the original artist name for this cover.');
          }
          if (!originalSongTitle.trim()) {
            errors.push('Please enter the original song title for this cover.');
          }
        }
        // ISRC is optional — SoundBridge auto-assigns one if not provided.
        // Only block if verification is still running (not on error — ISRC errors are non-blocking)
        if (isrcCode.trim() && isrcVerificationStatus === 'loading') {
          errors.push('Please wait for ISRC verification to complete');
        }
      }

      // ISRC is optional — only block if still loading
      if (isCover && !acrcloudStatus && isrcCode.trim() && isrcVerificationStatus === 'loading') {
        errors.push('Please wait for ISRC verification to complete');
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
    } else if (formData.contentType === 'mixtape') {
      if (!formData.djName.trim()) {
        errors.push('DJ / Artist name is required');
      }
      if (!formData.tracklist.trim()) {
        errors.push('Tracklist is required — list the tracks included in your mix');
      }
      if (!formData.genre) {
        errors.push('Genre is required for mixtapes');
      }
    } else if (formData.contentType === 'audio_book') {
      if (!formData.bookGenre) {
        errors.push('Book genre is required');
      }
    }

    // Cover art validation
    if (!formData.coverImage) {
      errors.push('Cover art is required');
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
    
    // No tier restrictions on albums — only storage quota applies
    
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

  const extractAudioDuration = async (uri: string): Promise<number> => {
    try {
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      const durationMs = (status as any).durationMillis ?? 0;
      await sound.unloadAsync();
      return Math.floor(durationMs / 1000);
    } catch {
      return 0;
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

        // Reset verification state for new audio selection
        setIsCover(false);
        setOriginalArtistName('');
        setOriginalSongTitle('');
        setIsrcCode('');
        setIsrcVerificationStatus('idle');
        setIsrcVerificationError(null);
        setIsrcVerificationData(null);
        setAcrcloudStatus('idle');
        setAcrcloudData(null);
        setAcrcloudError(null);
        setIsOriginalConfirmed(false);
        if (isrcVerificationTimeoutRef.current) {
          clearTimeout(isrcVerificationTimeoutRef.current);
        }

        setFormData(prev => ({
          ...prev,
          audioFile: audioFileData,
          title: prev.title || fileName // Only set if title is empty
        }));

        // Extract duration in background — doesn't block fingerprinting
        extractAudioDuration(audioFileData.uri).then(setAudioDuration);

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
    // Creator agreement gate — first creative action only
    const agreed = await requestAgreement();
    if (!agreed) return;

    // Comprehensive validation (mirroring web app logic)
    const validation = validateUploadForm();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Copyright attestation validation
    const termsAgreed = formData.contentType === 'mixtape' ? agreedToMixtapeTerms : agreedToCopyright;
    if (!termsAgreed) {
      Alert.alert(
        'Terms Confirmation Required',
        formData.contentType === 'mixtape'
          ? 'You must agree to the mixtape terms to upload your mix.'
          : 'You must agree to the copyright terms to upload content.'
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
        message = 'You\'ve reached your 250MB storage limit. Upgrade to Premium for 2GB or Unlimited for 10GB of storage.';
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

    // Check storage limits before upload using the quota state (source of truth from RevenueCat)
    // This ensures consistency between what's displayed and what's checked
    if (formData.audioFile?.size && uploadQuota?.storage) {
      const fileSize = formData.audioFile.size;
      const storageAvailable = uploadQuota.storage.storage_available;
      const isUnlimited = uploadQuota.storage.is_unlimited_tier;

      console.log('📊 Checking storage limits...');
      console.log(`📊 File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`📊 Storage available: ${uploadQuota.storage.storage_available_formatted}`);
      console.log(`📊 Tier: ${uploadQuota.tier}`);

      // Check if upload would exceed storage limit
      if (!isUnlimited && fileSize > storageAvailable) {
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        const remainingMB = uploadQuota.storage.storage_available_formatted;

        Alert.alert(
          'Storage Limit Exceeded',
          `This file (${fileSizeMB} MB) exceeds your remaining storage (${remainingMB}). Upgrade to Premium or Unlimited for more storage.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: handleUpgradePress },
          ],
        );
        return;
      }

      console.log('✅ Storage check passed');
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🎵 Starting upload process for', formData.contentType, '...');

      // Step 1: Upload audio file (70% of progress)
      setUploadProgress(10);
      const audioUploadResult = await uploadAudioFile(user.id, formData.audioFile!, { isMixtape: formData.contentType === 'mixtape' });
      
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
      } else if (formData.contentType === 'mixtape') {
        const parts: string[] = [];
        if (formData.djName.trim()) parts.push(`Mixed by: ${formData.djName.trim()}`);
        if (enhancedDescription) parts.push(enhancedDescription);
        if (formData.tracklist.trim()) parts.push(`TRACKLIST:\n${formData.tracklist.trim()}`);
        enhancedDescription = parts.join('\n\n');
      } else if (formData.contentType === 'audio_book') {
        const parts: string[] = [];
        if (formData.narrator.trim()) parts.push(`Narrated by: ${formData.narrator.trim()}`);
        if (formData.chapterNumber.trim()) parts.push(`Chapter: ${formData.chapterNumber.trim()}`);
        if (enhancedDescription) parts.push(enhancedDescription);
        enhancedDescription = parts.join('\n\n');
      }

      const trackData = {
        title: formData.title.trim(),
        description: enhancedDescription || null,
        file_url: audioUploadResult.data!.url,
        cover_art_url: artworkUrl, // Web app field name
        duration: audioDuration,
        file_size: formData.audioFile?.size || 0, // Store file size for storage tracking
        tags: tagsArray.length > 0 ? tagsArray.join(',') : null,
        is_public: formData.privacy === 'public',
        visibility: formData.privacy === 'public' ? 'public' : formData.privacy === 'followers' ? 'followers_only' : 'private',
        genre: formData.contentType === 'music' ? formData.genre
          : formData.contentType === 'mixtape' ? formData.genre
          : formData.contentType === 'audio_book' ? formData.bookGenre
          : formData.podcastCategory,
        lyrics: formData.lyrics.trim() || null,
        lyrics_language: formData.lyricsLanguage,
        has_lyrics: formData.lyrics.trim().length > 0,
        // Cover song fields
        is_cover: formData.contentType === 'music' ? (isCover || acrcloudStatus === 'match') : false,
        original_artist_name: formData.contentType === 'music' && (isCover || acrcloudStatus === 'match') ? originalArtistName.trim() || null : null,
        original_song_title: formData.contentType === 'music' && (isCover || acrcloudStatus === 'match') ? originalSongTitle.trim() || null : null,
        // ISRC — user-provided takes priority; null tells backend to auto-assign via PPL
        isrc_code: (formData.contentType === 'music' && isrcCode.trim().length > 0) ? isrcCode.trim() : null,
        // ISRC source hint for backend
        isrc_source: formData.contentType === 'music' ? (
          (acrcloudData as any)?.detectedISRC ? 'acrcloud_detected' :
          isrcCode.trim() ? 'user_provided' :
          'soundbridge_generated'
        ) : null,
        // Flag for manual review: ACRCloud matched an existing recording but user claims original
        suspected_duplicate: formData.contentType === 'music' && acrcloudStatus === 'match' && !isCover,
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
        // Mixtape flag — used by Discover screen to list under Mixtapes tab
        content_type: formData.contentType,
        is_mixtape: formData.contentType === 'mixtape',
        // Paid content fields
        is_paid: formData.isPaid,
        price: formData.isPaid && formData.price ? parseFloat(formData.price) : null,
        currency: formData.isPaid ? formData.currency : null,
        // Live interest prompt (music only)
        live_interest_enabled: formData.contentType === 'music', // always on for music; creator can opt out in track settings
        // Mood tags (music only)
        mood_tags: formData.contentType === 'music' && formData.moodTags.length > 0 ? formData.moodTags : null,
      };

      const trackResult = await createAudioTrack(user.id, trackData);
      
      if (!trackResult.success) {
        throw new Error('Failed to create track record: ' + trackResult.error?.message);
      }
      
      setUploadProgress(100);
      console.log('✅ Track created successfully');

      // Queue push notifications to genre-matched listeners (fire-and-forget)
      if (trackResult.data?.id && session) {
        fetch(`${config.apiUrl}/api/tracks/${trackResult.data.id}/queue-notifications`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch((err) => console.warn('⚠️ Failed to queue track notifications:', err));
      }

      // Reset form
      setFormData({
        contentType: 'music',
        title: '',
        description: '',
        artistName: '',
        genre: '',
        djName: '',
        tracklist: '',
        episodeNumber: '',
        podcastCategory: '',
        narrator: '',
        chapterNumber: '',
        bookGenre: '',
        tags: '',
        lyrics: '',
        lyricsLanguage: 'en',
        privacy: 'public',
        publishOption: 'now',
        scheduleDate: '',
        coverImage: null,
        audioFile: null,
        isPaid: false,
        price: '',
        currency: 'USD',
        liveInterestEnabled: false,
        moodTags: [],
      });
      setAgreedToCopyright(false);
      setAgreedToMixtapeTerms(false);
      setAudioDuration(0);

      // Reset cover song / ISRC state
      setIsCover(false);
      setOriginalArtistName('');
      setOriginalSongTitle('');
      setIsrcCode('');
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);

      // Reset ACRCloud state
      setAcrcloudStatus('idle');
      setAcrcloudData(null);
      setAcrcloudError(null);
      setIsOriginalConfirmed(false);

      const moodLine = formData.moodTags.length > 0
        ? ` and ${formData.moodTags.slice(0, 2).join(', ').toLowerCase()} mood`
        : '';
      const guidanceMessage = formData.contentType === 'music'
        ? `Your track is live. Here is how SoundBridge will find your audience:\n\nYour music will be served to listeners who have opted in for ${formData.genre || 'your genre'}${moodLine} in your location.\n\nAs listeners engage we build a clearer picture of who loves your sound. Check your Audience Intelligence dashboard to see this data grow.\n\nThe more genuine the engagement, the further your music travels.`
        : `Your ${formData.contentType} has been uploaded successfully.`;

      Alert.alert('Track is Live', guidanceMessage, [{ text: 'Got it' }]);

      // Trigger service provider prompt after first upload
      const currentUploadCount = uploadQuota?.uploads_this_month ?? 0;
      if (currentUploadCount === 0) {
        // This was their first upload - trigger prompt after short delay
        setTimeout(() => {
          triggerAfterFirstUpload();
        }, 2000);
      }

      await loadUploadQuota(true);

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
          title: track.title,
          description: '',
          genre: albumFormData.albumGenre,
          file_url: audioUploadResult.data?.url || '',
          duration: track.duration || 0,
          file_size: track.audioFile?.size || 0,
          lyrics: track.lyrics || null,
          lyrics_language: track.lyricsLanguage || 'en',
          is_public: albumFormData.status === 'published',
          content_type: 'music' as const,
          tags: '',
        };
        
        const trackResult = await createAudioTrack(user.id, trackData);
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


  const GradientOption: React.FC<{
    selected: boolean;
    radius: number;
    backgroundColor: string;
    children: React.ReactNode;
  }> = ({ selected, radius, backgroundColor, children }) => (
    <View style={[styles.optionBorderWrap, { borderRadius: radius }]}>
      {selected && (
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.optionBorderGradient, { borderRadius: radius }]}
        />
      )}
      <View
        style={[
          styles.optionBorderInner,
          {
            borderRadius: radius - 2,
            backgroundColor,
            margin: selected ? 2 : 0,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );

  const optionSurface = theme.isDark ? '#2A1745' : theme.colors.surface;

  const ContentTypeSelector = () => (
    <GlassSection>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content Type</Text>
      <View style={styles.contentTypeContainer}>
        <GradientOption
          selected={formData.contentType === 'music'}
          radius={18}
          backgroundColor={optionSurface}
        >
          <TouchableOpacity
            style={styles.contentTypeOption}
            onPress={() => handleInputChange('contentType', 'music')}
            activeOpacity={0.9}
          >
            <View style={[styles.contentTypeIcon, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="musical-notes" size={24} color="white" />
            </View>
            <View style={styles.contentTypeText}>
              <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>Music Track</Text>
              <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Upload your music, beats, or audio tracks</Text>
            </View>
          </TouchableOpacity>
        </GradientOption>

        <GradientOption
          selected={formData.contentType === 'podcast'}
          radius={18}
          backgroundColor={optionSurface}
        >
          <TouchableOpacity
            style={styles.contentTypeOption}
            onPress={() => handleInputChange('contentType', 'podcast')}
            activeOpacity={0.9}
          >
            <View style={[styles.contentTypeIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="mic" size={24} color="white" />
            </View>
            <View style={styles.contentTypeText}>
              <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>Podcast Episode</Text>
              <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Share your podcast episodes and audio content</Text>
            </View>
          </TouchableOpacity>
        </GradientOption>

        <GradientOption
          selected={formData.contentType === 'mixtape'}
          radius={18}
          backgroundColor={optionSurface}
        >
          <TouchableOpacity
            style={styles.contentTypeOption}
            onPress={() => handleInputChange('contentType', 'mixtape')}
            activeOpacity={0.9}
          >
            <View style={[styles.contentTypeIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="disc" size={24} color="white" />
            </View>
            <View style={styles.contentTypeText}>
              <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>DJ Mixtape</Text>
              <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Upload DJ mixes and continuous sets</Text>
            </View>
          </TouchableOpacity>
        </GradientOption>

        <GradientOption
          selected={formData.contentType === 'audio_book'}
          radius={18}
          backgroundColor={optionSurface}
        >
          <TouchableOpacity
            style={styles.contentTypeOption}
            onPress={() => handleInputChange('contentType', 'audio_book')}
            activeOpacity={0.9}
          >
            <View style={[styles.contentTypeIcon, { backgroundColor: '#0EA5E9' }]}>
              <Ionicons name="book" size={24} color="white" />
            </View>
            <View style={styles.contentTypeText}>
              <Text style={[styles.contentTypeLabel, { color: theme.colors.text }]}>Audio Book</Text>
              <Text style={[styles.contentTypeDescription, { color: theme.colors.textSecondary }]}>Share chapters, stories, or spoken word</Text>
            </View>
          </TouchableOpacity>
        </GradientOption>
      </View>
    </GlassSection>
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
      <GlassSection>
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
              {type === 'coverImage' ? 'JPG, PNG (Max 5MB)' : `MP3, WAV, M4A, AAC, OGG, FLAC (Max ${formData.contentType === 'mixtape' ? '200MB' : '100MB'})`}
            </Text>
          </UploadButton>
        )}
      </GlassSection>
    );
  };

  // Upload Mode Selector Component
  const UploadModeSelector = () => (
    <GlassSection>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upload Mode</Text>
      <View style={styles.modeSelector}>
        <GradientOption selected={uploadMode === 'single'} radius={18} backgroundColor={optionSurface}>
          <TouchableOpacity
            style={styles.modeOption}
            onPress={() => {
              setUploadMode('single');
              setAlbumStep(1);
            }}
            activeOpacity={0.9}
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
          </TouchableOpacity>
        </GradientOption>
        
        <GradientOption selected={uploadMode === 'album'} radius={18} backgroundColor={optionSurface}>
          <TouchableOpacity
            style={styles.modeOption}
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
            activeOpacity={0.9}
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
            {(uploadQuota?.tier === 'free' || !uploadQuota?.tier) && (
              <View style={[styles.upgradeBadge, { backgroundColor: theme.colors.warning }]}>
                <Text style={styles.upgradeBadgeText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        </GradientOption>
      </View>
    </GlassSection>
  );

  // Album Form - Step 1: Metadata
  const AlbumMetadataForm = () => (
    <View>
      {/* Album Title */}
      <GlassSection>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Album Title *</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Enter album title"
          placeholderTextColor={theme.colors.textSecondary}
          value={albumFormData.albumTitle}
          onChangeText={(text) => setAlbumFormData(prev => ({ ...prev, albumTitle: text }))}
          textContentType="none"
          autoComplete="off"
        />
      </GlassSection>

      {/* Album Description */}
      <GlassSection>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Tell us about this album..."
          placeholderTextColor={theme.colors.textSecondary}
          value={albumFormData.albumDescription}
          onChangeText={(text) => setAlbumFormData(prev => ({ ...prev, albumDescription: text }))}
          multiline
          numberOfLines={4}
          textContentType="none"
          autoComplete="off"
        />
      </GlassSection>

      {/* Album Genre */}
      <GlassSection>
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
      </GlassSection>

      {/* Album Cover */}
      <GlassSection>
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
      </GlassSection>

      {/* Release Status */}
      <GlassSection>
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
      </GlassSection>

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
        <GlassSection>
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
                      textContentType="none"
                      autoComplete="off"
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
        </GlassSection>

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
      <GlassSection>
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
      </GlassSection>

      {/* Track List Summary */}
      <GlassSection>
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
      </GlassSection>

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

  const handleDismissStorageModal = () => {
    storageAlertActiveRef.current = false;
    setShowStorageModal(false);
  };

  const handleManageStorage = () => {
    storageAlertActiveRef.current = false;
    setShowStorageModal(false);
    handleOpenStorage();
  };

  const handleUpgradeStorage = () => {
    storageAlertActiveRef.current = false;
    setShowStorageModal(false);
    handleUpgradePress();
  };

  return (
    <View style={styles.container}>
      {/* Main Background - dark uses spline, light uses gradient */}
      {theme.isDark ? (
        <View style={styles.mainGradient}>
          <WebView
            source={{ uri: 'https://my.spline.design/glowingplanetparticles-nhVHji30IRoa5HBGe8yeDiTs' }}
            style={styles.splineWebView}
            scrollEnabled={false}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(19, 7, 34, 0.65)', 'rgba(36, 12, 62, 0.5)', 'rgba(46, 16, 101, 0.6)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.splineOverlay}
          />
        </View>
      ) : (
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
      )}
      
      <SafeAreaView style={styles.safeArea} edges={[]}>

        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        <View style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Text
            style={[styles.headerTitle, { color: theme.colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Create Track
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Upload your track or episode
          </Text>
          {uploadQuota?.storage && (
            <TouchableOpacity
              style={[styles.headerStatusPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleOpenStorage}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.headerStatusText, { color: theme.colors.textSecondary }]}>
                {Math.round(uploadQuota.storage.storage_percent_used || 0)}% used
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#DC2626', '#EC4899', 'rgba(255,255,255,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.text }]}>{uploadProgress}%</Text>
          </View>
        )}

      <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
          <GlassSection>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder={`Enter ${formData.contentType} title`}
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                textContentType="none"
                autoComplete="off"
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
                textContentType="none"
                autoComplete="off"
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
                    textContentType="none"
                    autoComplete="off"
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

                {/* Mood Tags — music only, up to 3 */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>What mood does this track create?</Text>
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                    Choose up to 3 moods (optional)
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {MOOD_OPTIONS.map((mood) => {
                      const selected = formData.moodTags.includes(mood);
                      const atLimit = formData.moodTags.length >= 3 && !selected;
                      return (
                        <TouchableOpacity
                          key={mood}
                          style={[
                            styles.genreChip,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            selected && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                            atLimit && { opacity: 0.4 },
                          ]}
                          onPress={() => {
                            if (atLimit) return;
                            const next = selected
                              ? formData.moodTags.filter((m) => m !== mood)
                              : [...formData.moodTags, mood];
                            handleInputChange('moodTags', next);
                          }}
                        >
                          <Text style={[
                            styles.genreChipText,
                            { color: theme.colors.text },
                            selected && { color: '#FFFFFF' },
                          ]}>
                            {mood}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

              </>
            ) : formData.contentType === 'audio_book' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Narrator (optional)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., John Smith"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.narrator}
                    onChangeText={(value) => handleInputChange('narrator', value)}
                    textContentType="none"
                    autoComplete="off"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Chapter / Part (optional)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., Chapter 1, Part 2"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.chapterNumber}
                    onChangeText={(value) => handleInputChange('chapterNumber', value)}
                    textContentType="none"
                    autoComplete="off"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Book Genre *</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {bookGenres.map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[
                            styles.genreChip,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            formData.bookGenre === g && { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' }
                          ]}
                          onPress={() => handleInputChange('bookGenre', g)}
                        >
                          <Text style={[styles.genreChipText, { color: theme.colors.text }, formData.bookGenre === g && { color: '#FFFFFF' }]}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </>
            ) : formData.contentType === 'podcast' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Episode Number *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., 1"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.episodeNumber}
                    onChangeText={(value) => handleInputChange('episodeNumber', value)}
                    keyboardType="number-pad"
                    autoComplete="off"
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
            ) : (
              <>
                {/* Mixtape info banner */}
                <View style={[styles.inputGroup, { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: 12, marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Ionicons name="information-circle-outline" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 }}>
                      DJ Mixes are shared for promotional use. You are responsible for the content you upload. SoundBridge complies with all valid DMCA takedown requests.
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>DJ / Artist Name *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., DJ Justice"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.djName}
                    onChangeText={(value) => handleInputChange('djName', value)}
                    textContentType="none"
                    autoComplete="off"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Genre *</Text>
                  <View style={styles.genreContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {genres.map((genre) => (
                        <TouchableOpacity
                          key={genre}
                          style={[
                            styles.genreChip,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            formData.genre === genre && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
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

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Tracklist *</Text>
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
                    List each track on a new line, e.g. "Artist - Song Title"
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, minHeight: 120 }]}
                    placeholder={"1. Artist - Track Title\n2. Artist - Track Title\n3. Artist - Track Title"}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.tracklist}
                    onChangeText={(value) => handleInputChange('tracklist', value)}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    textContentType="none"
                    autoComplete="off"
                  />
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
                textContentType="none"
                autoComplete="off"
            />
          </View>

          {/* Lyrics Section (for music only, not podcast or mixtape) */}
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
                  textContentType="none"
                  autoComplete="off"
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
        </GlassSection>

        {/* ACRCloud Audio Fingerprinting (for music only) */}
        {formData.contentType === 'music' && formData.audioFile && (
          <GlassSection>
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
                    This recording matches a known release. Fill in the original artist and title below, then upload as a cover. If you own this recording, your upload will be queued for manual review.
                  </Text>

                  {/* Suspected duplicate notice */}
                  <View style={{ backgroundColor: '#FFF8E1', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 8 }}>
                    <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 17 }}>
                      ⚠️ Uploads that match existing recordings are flagged for manual review before going public. Confirm the original artist/title details below.
                    </Text>
                  </View>

                  {/* Artist Mismatch Warning */}
                  {acrcloudData.artistMatch && !acrcloudData.artistMatch.match && (
                    <View style={[styles.artistMismatchWarning, { backgroundColor: '#FFEBEE', borderColor: '#DC2626' }]}>
                      <Ionicons name="warning" size={18} color="#DC2626" />
                      <Text style={[styles.artistMismatchText, { color: '#DC2626' }]}>
                        Artist name mismatch: detected as "{acrcloudData.detectedArtist}". Correct the original artist name below if needed.
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
          </GlassSection>
        )}

        {/* ISRC Verification Section */}
        {formData.contentType === 'music' && (
          <GlassSection>
            {/* Show different titles based on ACRCloud status */}
            {acrcloudStatus === 'match' ? (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>ISRC Verification (optional)</Text>
                <Text style={[styles.hintText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                  This track was detected as a released song. If you have an ISRC, enter it to verify ownership. If you don't have one, leave it blank.
                </Text>
              </View>
            ) : acrcloudStatus === 'no_match' ? (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {isCover ? 'Cover Song Details' : 'ISRC Verification (optional)'}
                </Text>
                {!isCover && (
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                    No ISRC? SoundBridge will automatically assign one to your recording once PPL registration is complete. If you already have a distributor ISRC, enter it below.
                  </Text>
                )}
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

            {/* Original Artist / Song Title — required for covers and ACRCloud matches */}
            {(acrcloudStatus === 'match' || isCover) && (
              <View style={{ marginTop: 12 }}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Original Artist Name <Text style={{ color: '#EF4444', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: !originalArtistName.trim() && (acrcloudStatus === 'match' || isCover) ? theme.colors.border : theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., The Beatles"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={originalArtistName}
                    onChangeText={setOriginalArtistName}
                    textContentType="none"
                    autoComplete="off"
                  />
                  {acrcloudStatus === 'match' && (
                    <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                      Auto-filled from audio fingerprint — edit if incorrect.
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Original Song Title <Text style={{ color: '#EF4444', fontWeight: '700' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="e.g., Let It Be"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={originalSongTitle}
                    onChangeText={setOriginalSongTitle}
                    textContentType="none"
                    autoComplete="off"
                  />
                  {acrcloudStatus === 'match' && (
                    <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                      Auto-filled from audio fingerprint — edit if incorrect.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ISRC Input - Show if ACRCloud match, original (no_match), or user checked "cover song" */}
            {(acrcloudStatus === 'match' || acrcloudStatus === 'no_match' || isCover) && (
              <View style={styles.isrcContainer}>
                {/* Context banner for match (optional) */}
                {acrcloudStatus === 'match' && (
                  <View style={{ backgroundColor: '#FFF3E0', borderColor: '#FF9800', marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark" size={20} color="#FF9800" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.label, { color: '#E65100', fontWeight: '600', fontSize: 14, marginBottom: 4 }]}>
                          Ownership Verification (optional)
                        </Text>
                        <Text style={[Typography.label, { color: '#EF6C00', fontSize: 13, lineHeight: 18 }]}>
                          If you have an ISRC from your distributor (DistroKid, TuneCore, CD Baby, etc.), enter it to verify ownership. No ISRC? Leave blank — SoundBridge will assign your recording one.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Auto-assign info for originals */}
                {acrcloudStatus === 'no_match' && !isCover && (
                  <View style={{ backgroundColor: '#F0FDF4', borderColor: '#10B981', marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.label, { color: '#065F46', fontWeight: '600', fontSize: 14, marginBottom: 4 }]}>
                          ISRC Auto-Assignment
                        </Text>
                        <Text style={[Typography.label, { color: '#047857', fontSize: 13, lineHeight: 18 }]}>
                          SoundBridge will assign an ISRC (GB-SBR-26-XXXXX) to this recording automatically. If you already have a distributor ISRC, enter it below to use yours instead.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    ISRC Code{' '}
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
                      isrcVerificationStatus === 'error' && { borderColor: '#F59E0B' },
                      isrcVerificationStatus === 'success' && { borderColor: theme.colors.success },
                    ]}
                    placeholder={"e.g., GBUM71502800 — leave blank to auto-assign"}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={isrcCode}
                    onChangeText={handleISRCChange}
                    maxLength={14}
                    autoCapitalize="characters"
                    textContentType="none"
                    autoComplete="off"
                  />
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                    Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional).{isCover ? " No ISRC? That's fine — leave it blank. SoundBridge will assign your recording an ISRC once we complete our PPL registration." : ''}
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
                  <View style={[styles.verificationError, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="information-circle" size={20} color="#F59E0B" />
                    <View style={styles.verificationContent}>
                      <Text style={[styles.verificationTitle, { color: '#92400E' }]}>ISRC not verified</Text>
                      <Text style={[styles.verificationDetails, { color: '#78350F' }]}>
                        {isrcVerificationError}
                      </Text>
                      <Text style={[styles.verificationDetails, { color: '#92400E', marginTop: 4 }]}>
                        You can still proceed — leave ISRC blank and SoundBridge will assign one.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </GlassSection>
        )}

        {/* Live interest is enabled automatically for all music tracks — no toggle here */}

        {/* Privacy Settings */}
        <GlassSection>
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
          </GlassSection>

          {/* Pricing Controls */}
          <PricingControls
            isPaid={formData.isPaid}
            price={formData.price}
            currency={formData.currency}
            onIsPaidChange={(value) => {
              handleInputChange('isPaid', value);
              // Reset mixtape terms acceptance when toggling paid — terms text changes
              if (formData.contentType === 'mixtape') setAgreedToMixtapeTerms(false);
            }}
            onPriceChange={(value) => handleInputChange('price', value)}
            onCurrencyChange={(value) => handleInputChange('currency', value)}
            userSubscription={uploadQuota?.tier?.toLowerCase()}
          />

          {/* Copyright / Terms Verification */}
          <GlassSection>
            {formData.contentType === 'mixtape' ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mixtape Terms *</Text>
                <View style={[styles.copyrightContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#F59E0B" style={styles.copyrightIcon} />
                  <View style={styles.copyrightTextContainer}>
                    <Text style={[styles.copyrightText, { color: theme.colors.text }]}>
                      {formData.isPaid
                        ? 'I confirm that I have obtained the necessary licenses or permissions to sell this mix commercially. I understand that rights holders may request removal and that SoundBridge complies with all valid DMCA takedown requests. Selling content that infringes copyright may result in removal or account suspension.'
                        : 'I confirm this mix is shared for promotional, non-commercial purposes. I understand I do not own the underlying recordings and that rights holders may request removal. SoundBridge complies with all valid DMCA takedown requests. Uploading content that infringes copyright may result in removal or account suspension.'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      navigation.navigate('CopyrightPolicy' as never);
                    }}>
                      <Text style={[styles.copyrightLearnMore, { color: '#F59E0B' }]}>
                        Learn more about our copyright policy
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.copyrightCheckbox, { borderColor: theme.colors.border }]}
                  onPress={() => setAgreedToMixtapeTerms(!agreedToMixtapeTerms)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: theme.colors.border },
                    agreedToMixtapeTerms && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
                  ]}>
                    {agreedToMixtapeTerms && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                    {formData.isPaid ? 'I confirm I have the rights to sell this mix commercially' : 'I agree to the mixtape terms above'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
              </>
            )}
          </GlassSection>

          {/* Cover Art */}
          {renderFileUpload('coverImage', 'Cover Art *', formData.coverImage)}
            </>
          )}

          {/* Album Mode */}
          {uploadMode === 'album' && (
            <>
              {/* Album Step Indicator */}
              <GlassSection>
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
              </GlassSection>

              {/* Album Forms — inlined to prevent inner-component remount on each keystroke */}
              {albumStep === 1 && AlbumMetadataForm()}
              {albumStep === 2 && AlbumTracksForm()}
              {albumStep === 3 && AlbumReviewForm()}
            </>
          )}

          {uploadMode !== 'album' && (
            <WalkthroughableTouchable
              order={15}
              name="ready_to_earn"
              text="Tap Publish when ready! Your music goes LIVE instantly. Followers see it FIRST in their feed. You earn from: Tips (95% yours), Event tickets (95%), Paid collaborations, Services marketplace. You're ready to EARN. Welcome to SoundBridge! 🎉"
              style={[styles.publishButton, isUploading && styles.publishButtonDisabled, { alignSelf: 'stretch' }]}
              onPress={handleUpload}
              disabled={isUploading}
            >
              <LinearGradient
                colors={isUploading ? ['#666', '#666'] : ['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.publishButtonGradient}
                pointerEvents="none"
              >
                <Text style={styles.publishButtonText} numberOfLines={1}>
                  {isUploading ? 'Uploading...' : 'Publish'}
                </Text>
              </LinearGradient>
            </WalkthroughableTouchable>
          )}
      </ScrollView>
        </View>
      </SafeAreaView>

      <Modal transparent visible={showStorageModal} animationType="fade">
        <View style={styles.storageModalOverlay}>
          <View style={styles.storageModalBackdrop} />
          <BlurView intensity={40} tint="dark" style={styles.storageModalCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.storageModalGlow}
            />
            <Text style={[styles.storageModalTitle, { color: theme.colors.text }]}>
              {storagePromptKind === 'full' ? 'Storage Full' : 'Storage Almost Full'}
            </Text>
            <Text style={[styles.storageModalBody, { color: theme.colors.textSecondary }]}>
              {storagePromptKind === 'full'
                ? 'You have run out of storage. Upgrade to continue uploading or free up space.'
                : `You are close to your storage limit (${storagePromptPercent}% used). Upgrade now or manage your files to avoid upload issues.`}
            </Text>

            <TouchableOpacity
              style={styles.storageModalButton}
              onPress={handleManageStorage}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.storagePrimaryButton}
              >
                <Text style={styles.storagePrimaryText}>Manage Storage</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.storageModalButton, styles.storageSecondaryButton]}
              onPress={handleUpgradeStorage}
              activeOpacity={0.9}
            >
              <Text style={styles.storageSecondaryText}>Upgrade</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.storageModalButton, styles.storageTertiaryButton]}
              onPress={handleDismissStorageModal}
              activeOpacity={0.9}
            >
              <Text style={styles.storageTertiaryText}>Not now</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      {/* Service Provider Prompt Modal */}
      <ServiceProviderPromptModal
        visible={showServiceProviderPrompt}
        onSetupProfile={handleSetupProfile}
        onRemindLater={handleRemindLater}
        onDontShowAgain={handleDontShowAgain}
      />

      {/* Creator Agreement — shown once before first upload */}
      <CreatorAgreementModal
        visible={agreementVisible}
        onAgreed={onAgreed}
        onDismiss={onDismiss}
        submitting={agreementSubmitting}
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
  splineWebView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  splineOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.headerLarge,
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    marginBottom: 6,
  },
  headerSubtitle: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerStatusText: {
    ...Typography.label,
  },
  publishButton: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: 'white',
    ...Typography.button,
    textAlign: 'center',
  },
  storageModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  storageModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  storageModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(24, 8, 52, 0.04)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 6,
  },
  storageModalGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  storageModalTitle: {
    ...Typography.headerMedium,
    marginBottom: 8,
  },
  storageModalBody: {
    ...Typography.body,
    marginBottom: 18,
  },
  storageModalButton: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  storagePrimaryButton: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storagePrimaryText: {
    color: '#FFFFFF',
    ...Typography.button,
  },
  storageSecondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageSecondaryText: {
    color: '#FFFFFF',
    ...Typography.button,
  },
  storageTertiaryButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTertiaryText: {
    color: 'rgba(255,255,255,0.8)',
    ...Typography.button,
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
    borderRadius: 2,
  },
  progressText: {
    ...Typography.label,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  section: {
    marginBottom: 22,
  },
  glassCard: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  glassInner: {
    padding: 18,
    borderRadius: 22,
  },
  optionBorderWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  optionBorderGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  optionBorderInner: {
    borderRadius: 16,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  contentTypeContainer: {
    gap: 12,
  },
  contentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 18,
    borderWidth: 0,
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
    ...Typography.body,
    marginBottom: 4,
  },
  contentTypeDescription: {
    ...Typography.label,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    ...Typography.label,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 14,
    padding: 16,
    ...Typography.body,
    borderWidth: 0,
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
    ...Typography.label,
  },
  privacyContainer: {
    gap: 8,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0,
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionLabel: {
    ...Typography.body,
    marginBottom: 2,
  },
  privacyOptionDescription: {
    ...Typography.label,
  },
  uploadButton: {
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    ...Typography.button,
    marginTop: 8,
  },
  uploadButtonSubtext: {
    ...Typography.label,
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
    ...Typography.body,
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
    borderRadius: 18,
    borderWidth: 0,
    padding: 18,
    alignItems: 'center',
    position: 'relative',
  },
  modeLabel: {
    ...Typography.body,
    marginTop: 8,
  },
  modeDescription: {
    ...Typography.label,
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
    ...Typography.label,
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
    ...Typography.body,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#ccc',
  },
  stepLabel: {
    textAlign: 'center',
    ...Typography.label,
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
    ...Typography.label,
  },
  // Track List Styles
  emptyTracksContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTracksText: {
    ...Typography.body,
    marginTop: 16,
  },
  emptyTracksSubtext: {
    ...Typography.label,
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
    ...Typography.label,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitleInput: {
    ...Typography.body,
    marginBottom: 4,
  },
  trackFileName: {
    ...Typography.label,
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
    ...Typography.body,
    marginLeft: 8,
  },
  limitInfo: {
    ...Typography.label,
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
    ...Typography.button,
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
    ...Typography.button,
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
    ...Typography.headerMedium,
    marginBottom: 4,
  },
  reviewDetail: {
    ...Typography.label,
    marginBottom: 2,
  },
  reviewDescription: {
    ...Typography.body,
  },
  reviewTrack: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  reviewTrackNumber: {
    width: 30,
    ...Typography.label,
  },
  reviewTrackTitle: {
    flex: 1,
    ...Typography.label,
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
    ...Typography.body,
    marginBottom: 8,
  },
  copyrightLearnMore: {
    ...Typography.label,
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
    ...Typography.body,
    flex: 1,
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
    ...Typography.body,
    marginBottom: 4,
  },
  acrcloudDetails: {
    ...Typography.label,
  },
  acrcloudMessage: {
    ...Typography.body,
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
    ...Typography.label,
    marginLeft: 8,
    flex: 1,
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
    ...Typography.label,
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
    ...Typography.label,
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
    ...Typography.label,
    marginBottom: 4,
  },
  verificationDetails: {
    ...Typography.label,
  },
});

// Extracted outside UploadScreen to prevent re-mounting on every render
// (inline component definitions cause React to treat them as new types each render,
//  which drops TextInput focus and dismisses the keyboard on every keystroke)
const GlassSection: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  const { theme } = useTheme();

  // BlurView renders as a yellowish solid rectangle on Android — use a plain View instead
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.section,
          styles.glassCard,
          style,
          {
            backgroundColor: theme.isDark ? 'rgba(24, 8, 52, 0.95)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(88,36,145,0.15)',
          },
        ]}
      >
        <View style={[styles.glassInner]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <BlurView
      intensity={theme.isDark ? 40 : 30}
      tint={theme.isDark ? 'dark' : 'light'}
      style={[styles.section, styles.glassCard, style]}
    >
      <View
        style={[
          styles.glassInner,
          {
            backgroundColor: theme.isDark ? 'rgba(24, 8, 52, 0.04)' : 'rgba(88, 36, 145, 0.08)',
            borderColor: theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(88, 36, 145, 0.2)',
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
            'rgba(255,255,255,0.0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glassHighlight}
        />
        {children}
      </View>
    </BlurView>
  );
};