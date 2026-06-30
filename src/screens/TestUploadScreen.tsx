/**
 * TestUploadScreen — production upload UI (velvet redesign).
 * Full single-track upload pipeline via singleTrackUploadPipeline.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  Dimensions,
  Image,
  Platform,
  ActivityIndicator,
  Animated,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getUploadQuota, invalidateQuotaCache, UploadQuota } from '../services/UploadQuotaService';
import { useCreatorAgreement } from '../hooks/useCreatorAgreement';
import CreatorAgreementModal from '../components/CreatorAgreementModal';
import {
  AcrcloudStatus,
  buildQuotaBlockMessage,
  executeSingleTrackUpload,
  extractAudioDuration,
  fingerprintAudioTrack,
  IsrcVerificationStatus,
  verifyISRCCode,
  validateAudioFile,
  validateSingleTrackForm,
} from '../services/singleTrackUploadPipeline';

const { width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Constants — identical to UploadScreen
// ─────────────────────────────────────────────────────────────
type ContentType = 'music' | 'podcast' | 'mixtape' | 'audio_book';
type UploadMode  = 'single' | 'album';
type Privacy     = 'public' | 'followers' | 'private';

const GENRES = [
  'Gospel', 'Afrobeats', 'UK Drill', 'Hip Hop', 'R&B', 'Pop',
  'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Reggae',
  'Folk', 'Blues', 'Funk', 'Soul', 'Alternative', 'Indie', 'Other',
];

const MOOD_OPTIONS = [
  'Worshipful', 'Energetic', 'Reflective', 'Celebratory', 'Raw and honest',
  'Uplifting', 'Melancholic', 'Peaceful', 'Intense', 'Romantic',
  'Nostalgic', 'Motivational',
];

const PODCAST_CATEGORIES = [
  'Technology', 'Business', 'Education', 'Entertainment', 'News',
  'Sports', 'Health', 'Science', 'Arts', 'Comedy', 'True Crime', 'History', 'Other',
];

const BOOK_GENRES = [
  'Fiction', 'Non-Fiction', 'Self-Help', 'Romance', 'Thriller',
  'Science Fiction', 'Fantasy', 'Biography', 'History', 'Business',
  "Children's", 'Mystery', 'Spirituality', 'Poetry', 'Other',
];

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; color: string }[] = [
  { value: 'music',      label: 'Music Track', icon: 'musical-notes', color: '#DC2626' },
  { value: 'podcast',    label: 'Podcast',      icon: 'mic',           color: '#8B5CF6' },
  { value: 'mixtape',    label: 'DJ Mixtape',   icon: 'disc',          color: '#F59E0B' },
  { value: 'audio_book', label: 'Audio Book',   icon: 'book',          color: '#0EA5E9' },
];

const LYRICS_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ig', label: 'Igbo' },
  { value: 'pcm', label: 'Pidgin' },
];

// ─────────────────────────────────────────────────────────────
// Animated pulse icon — Screen 01
// ─────────────────────────────────────────────────────────────
function PulseIcon() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="musical-notes-outline" size={22} color="rgba(255,255,255,0.8)" />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Small re-usable sub-components
// ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionLine} />
      <Text style={s.sectionLabelText}>{text}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <View style={s.uploadSectionHeader}>
      <View style={s.uploadTagline} />
      <View>
        <Text style={s.uploadSectionTitle}>{text}</Text>
        {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
  color = '#DC2626',
  multi,
  maxSelect,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (val: string) => void;
  color?: string;
  multi?: boolean;
  maxSelect?: number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
        {options.map(opt => {
          const isSelected = Array.isArray(selected) ? selected.includes(opt) : selected === opt;
          const atLimit = multi && maxSelect && Array.isArray(selected) && selected.length >= maxSelect && !isSelected;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => !atLimit && onSelect(opt)}
              style={[s.chip, isSelected && { backgroundColor: color, borderColor: color }, atLimit && { opacity: 0.35 }]}
            >
              <Text style={[s.chipText, isSelected && { color: '#fff' }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StyledInput({
  value, onChangeText, placeholder, multiline, numberOfLines, keyboardType, autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <TextInput
      style={[s.textInput, multiline && { minHeight: (numberOfLines || 4) * 22, textAlignVertical: 'top' }]}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.2)"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      selectionColor="#DC2626"
      autoComplete="off"
      textContentType="none"
    />
  );
}

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={s.checkboxRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.checkboxBox, checked && { backgroundColor: '#DC2626', borderColor: '#DC2626' }]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={s.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function TestUploadScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const insets = useSafeAreaInsets();
  const { requestAgreement, agreementVisible, agreementSubmitting, onAgreed, onDismiss } = useCreatorAgreement();

  // Mode / type
  const [uploadMode,   setUploadMode]   = useState<UploadMode>('single');
  const [contentType,  setContentType]  = useState<ContentType>('music');

  // Files
  const [audioFile,   setAudioFile]   = useState<{ uri: string; name: string; type?: string; size?: number } | null>(null);
  const [coverImage,  setCoverImage]  = useState<{ uri: string; name: string; type?: string } | null>(null);

  // Basic info (all types)
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');

  // Music-specific
  const [artistName,   setArtistName]   = useState('');
  const [genre,        setGenre]        = useState('');
  const [moodTags,     setMoodTags]     = useState<string[]>([]);
  const [tags,         setTags]         = useState('');
  const [lyrics,       setLyrics]       = useState('');
  const [lyricsLang,   setLyricsLang]   = useState('en');

  // Podcast
  const [episodeNumber,    setEpisodeNumber]    = useState('');
  const [podcastCategory,  setPodcastCategory]  = useState('');

  // Mixtape
  const [djName,    setDjName]    = useState('');
  const [tracklist, setTracklist] = useState('');

  // Audio book
  const [narrator,      setNarrator]      = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [bookGenre,     setBookGenre]     = useState('');

  // Cover song / ISRC
  const [isCover,         setIsCover]         = useState(false);
  const [originalArtist,  setOriginalArtist]  = useState('');
  const [originalTitle,   setOriginalTitle]   = useState('');
  const [isrcCode,        setIsrcCode]        = useState('');

  // Privacy
  const [privacy,   setPrivacy]   = useState<Privacy>('public');

  // Pricing
  const [isPaid,    setIsPaid]    = useState(false);
  const [price,     setPrice]     = useState('');
  const [currency,  setCurrency]  = useState('USD');

  // Copyright / Mixtape terms
  const [agreedToCopyright,    setAgreedToCopyright]    = useState(false);
  const [agreedToMixtapeTerms, setAgreedToMixtapeTerms] = useState(false);

  // Quota / upload
  const [uploadQuota, setUploadQuota] = useState<UploadQuota | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [acrcloudStatus, setAcrcloudStatus] = useState<AcrcloudStatus>('idle');
  const [acrcloudData, setAcrcloudData] = useState<any>(null);
  const [acrcloudError, setAcrcloudError] = useState<string | null>(null);
  const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);
  const [isrcVerificationStatus, setIsrcVerificationStatus] = useState<IsrcVerificationStatus>('idle');
  const [showDistributionNudge, setShowDistributionNudge] = useState(false);
  const [uploadedTrackId, setUploadedTrackId] = useState<string | null>(null);
  const [isrcVerificationError, setIsrcVerificationError] = useState<string | null>(null);
  const [isrcVerificationData, setIsrcVerificationData] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const isrcVerificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationCheckBypassed = useRef(false);

  const resetAcrAndIsrcState = () => {
    setAcrcloudStatus('idle');
    setAcrcloudData(null);
    setAcrcloudError(null);
    setIsOriginalConfirmed(false);
    setFingerprinting(false);
    setIsrcCode('');
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);
    if (isrcVerificationTimeoutRef.current) {
      clearTimeout(isrcVerificationTimeoutRef.current);
    }
  };

  const loadQuota = React.useCallback(async () => {
    if (!session) return;
    invalidateQuotaCache();
    const q = await getUploadQuota(session, true);
    if (q) setUploadQuota(q);
  }, [session]);

  useFocusEffect(React.useCallback(() => {
    loadQuota();
  }, [loadQuota]));

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

  const runVerifyISRC = async (isrc: string) => {
    if (!isrc?.trim()) {
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);
      return;
    }
    setIsrcVerificationStatus('loading');
    setIsrcVerificationError(null);
    const result = await verifyISRCCode({
      isrc,
      isCover,
      acrcloudStatus,
      acrcloudData,
    });
    setIsrcVerificationStatus(result.status);
    setIsrcVerificationError(result.error);
    setIsrcVerificationData(result.data);
  };

  const handleISRCChange = (value: string) => {
    setIsrcCode(value);
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);
    if (isrcVerificationTimeoutRef.current) {
      clearTimeout(isrcVerificationTimeoutRef.current);
    }
    if (value.trim()) {
      isrcVerificationTimeoutRef.current = setTimeout(() => {
        runVerifyISRC(value);
      }, 500);
    }
  };

  // ── Handlers ─────────────────────────────────────────────
  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const validation = validateAudioFile({
          name: asset.name || 'audio_file',
          size: asset.size,
          mimeType: asset.mimeType,
        }, contentType);
        if (!validation.isValid) {
          Alert.alert('Invalid File', validation.errors.join('\n'));
          return;
        }

        const audioFileData = {
          uri: asset.uri,
          name: asset.name || `audio_${Date.now()}.${asset.mimeType?.split('/')[1] || 'mp3'}`,
          type: asset.mimeType || 'audio/mpeg',
          size: asset.size,
        };

        setIsCover(false);
        setOriginalArtist('');
        setOriginalTitle('');
        resetAcrAndIsrcState();
        setAudioFile(audioFileData);

        const fileName = (asset.name || 'audio_file').replace(/\.[^/.]+$/, '');
        if (!title.trim()) setTitle(fileName);

        extractAudioDuration(audioFileData.uri).then(setAudioDuration);

        if (contentType === 'music' && user?.id) {
          setFingerprinting(true);
          setAcrcloudStatus('checking');
          setAcrcloudError(null);
          setIsOriginalConfirmed(false);
          const fp = await fingerprintAudioTrack(audioFileData, user.id, session, artistName);
          setAcrcloudStatus(fp.status);
          setAcrcloudData(fp.data);
          if (fp.status === 'error') {
            setAcrcloudError(fp.errorMessage || fp.data?.error || 'Audio verification failed');
          } else {
            setAcrcloudError(null);
          }
          if (fp.status === 'match' && fp.data?.detectedArtist) setOriginalArtist(fp.data.detectedArtist);
          if (fp.status === 'match' && fp.data?.detectedTitle) setOriginalTitle(fp.data.detectedTitle);
          if (fp.status === 'no_match') setIsOriginalConfirmed(false);
          setFingerprinting(false);
        }
      }
    } catch {
      setFingerprinting(false);
      Alert.alert('Error', 'Failed to pick audio file.');
    }
  };

  const pickCover = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Camera roll permission needed.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        setCoverImage({
          uri: asset.uri,
          name: asset.fileName || `cover_${Date.now()}.${ext}`,
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
        });
      }
    } catch { Alert.alert('Error', 'Failed to pick image.'); }
  };

  const toggleMood = (mood: string) => {
    if (moodTags.includes(mood)) setMoodTags(p => p.filter(m => m !== mood));
    else if (moodTags.length < 3) setMoodTags(p => [...p, mood]);
  };

  const resetForm = () => {
    setUploadMode('single');
    setContentType('music');
    setAudioFile(null);
    setCoverImage(null);
    setTitle('');
    setDescription('');
    setArtistName('');
    setGenre('');
    setMoodTags([]);
    setTags('');
    setLyrics('');
    setLyricsLang('en');
    setEpisodeNumber('');
    setPodcastCategory('');
    setDjName('');
    setTracklist('');
    setNarrator('');
    setChapterNumber('');
    setBookGenre('');
    setIsCover(false);
    setOriginalArtist('');
    setOriginalTitle('');
    setIsrcCode('');
    setPrivacy('public');
    setIsPaid(false);
    setPrice('');
    setCurrency('USD');
    setAgreedToCopyright(false);
    setAgreedToMixtapeTerms(false);
    setAudioDuration(0);
    resetAcrAndIsrcState();
    setUploadProgress(0);
    durationCheckBypassed.current = false;
  };

  const handleUpgradePress = () => navigation.navigate('Upgrade' as never);

  const handleUpload = async () => {
    if (uploadMode === 'album') {
      Alert.alert('Album Upload', 'Album uploads are not available on this screen yet. Please select Single Track.');
      return;
    }

    const agreed = await requestAgreement();
    if (!agreed) return;

    if (!user?.id || !session) {
      Alert.alert('Error', 'You must be logged in to upload content.');
      return;
    }

    const termsAgreed = contentType === 'mixtape' ? agreedToMixtapeTerms : agreedToCopyright;
    if (!termsAgreed) {
      Alert.alert(
        'Terms Confirmation Required',
        contentType === 'mixtape'
          ? 'You must agree to the mixtape terms to upload your mix.'
          : 'You must agree to the copyright terms to upload content.',
      );
      return;
    }

    if (uploadQuota && !uploadQuota.can_upload) {
      Alert.alert('Upload Limit Reached', buildQuotaBlockMessage(uploadQuota), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: handleUpgradePress },
      ]);
      return;
    }

    if (audioFile?.size && uploadQuota?.storage && !uploadQuota.storage.is_unlimited_tier) {
      if (audioFile.size > uploadQuota.storage.storage_available) {
        Alert.alert(
          'Storage Limit Exceeded',
          `This file exceeds your remaining storage (${uploadQuota.storage.storage_available_formatted}). Upgrade for more space.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: handleUpgradePress },
          ],
        );
        return;
      }
    }

    if (!durationCheckBypassed.current) {
      if (contentType === 'podcast' && audioDuration > 0 && audioDuration < 480) {
        Alert.alert(
          'Short podcast?',
          'This is shorter than most podcasts on SoundBridge, which are typically 8 minutes or more. Are you sure this is a podcast?',
          [
            {
              text: 'Yes, this is a podcast',
              onPress: () => { durationCheckBypassed.current = true; handleUpload(); },
            },
            {
              text: 'No, change to Music',
              style: 'cancel',
              onPress: () => setContentType('music'),
            },
          ],
        );
        return;
      }
      if (contentType === 'audio_book' && audioDuration > 0 && audioDuration < 900) {
        Alert.alert(
          'Short audiobook?',
          'This is shorter than most audiobooks on SoundBridge, which are typically 15 minutes or more. Are you sure this is an audiobook?',
          [
            {
              text: 'Yes, this is an audiobook',
              onPress: () => { durationCheckBypassed.current = true; handleUpload(); },
            },
            {
              text: 'No, change to Music',
              style: 'cancel',
              onPress: () => setContentType('music'),
            },
          ],
        );
        return;
      }
    }
    durationCheckBypassed.current = false;

    let effectiveAcrcloudStatus = acrcloudStatus;
    let effectiveAcrcloudData = acrcloudData;

    if (contentType === 'music' && audioFile) {
      if (effectiveAcrcloudStatus === 'idle' || effectiveAcrcloudStatus === 'checking' || fingerprinting) {
        setFingerprinting(true);
        setAcrcloudStatus('checking');
        const fp = await fingerprintAudioTrack(audioFile, user.id, session, artistName);
        effectiveAcrcloudStatus = fp.status;
        effectiveAcrcloudData = fp.data;
        setAcrcloudStatus(fp.status);
        setAcrcloudData(fp.data);
        if (fp.status === 'error') {
          setAcrcloudError(fp.errorMessage || fp.data?.error || 'Audio verification failed');
        }
        if (fp.status === 'match' && fp.data?.detectedArtist) setOriginalArtist(fp.data.detectedArtist);
        if (fp.status === 'match' && fp.data?.detectedTitle) setOriginalTitle(fp.data.detectedTitle);
        setFingerprinting(false);
      }
    }

    const form = {
      contentType,
      title,
      description,
      artistName,
      genre,
      moodTags,
      episodeNumber,
      podcastCategory,
      djName,
      tracklist,
      narrator,
      chapterNumber,
      bookGenre,
      tags,
      lyrics,
      lyricsLanguage: lyricsLang,
      privacy,
      isPaid,
      price,
      currency,
      audioFile,
      coverImage,
    };

    const validation = validateSingleTrackForm({
      userId: user.id,
      session,
      form,
      acrcloud: { status: effectiveAcrcloudStatus, data: effectiveAcrcloudData },
      isCover,
      originalArtistName: originalArtist,
      originalSongTitle: originalTitle,
      isrcCode,
      isrcVerificationStatus,
      isOriginalConfirmed,
      agreedToCopyright,
      agreedToMixtapeTerms,
      audioDuration,
    });

    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const result = await executeSingleTrackUpload(
        {
          userId: user.id,
          session,
          form,
          acrcloud: { status: effectiveAcrcloudStatus, data: effectiveAcrcloudData },
          isCover,
          originalArtistName: originalArtist,
          originalSongTitle: originalTitle,
          isrcCode,
          isrcVerificationStatus,
          isOriginalConfirmed,
          agreedToCopyright,
          agreedToMixtapeTerms,
          audioDuration,
        },
        setUploadProgress,
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedTrackId(result.trackId ?? null);
      setShowDistributionNudge(true);
      resetForm();
      await loadQuota();
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setFingerprinting(false);
    }
  };

  const storagePercent = Math.round(uploadQuota?.storage?.storage_percent_used || 0);
  const tier = (uploadQuota?.tier || 'free').toLowerCase();
  const ct = CONTENT_TYPES.find(c => c.value === contentType)!;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0d0620', '#1a0840', '#0d0620']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={s.safe} edges={[]}>
        <View style={{ height: insets.top }} />

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ══════════════════════════════════════════════════
              SCREEN 01 — Editorial hero header
            ══════════════════════════════════════════════════ */}
          <View style={s.hero}>
            <LinearGradient colors={['rgba(28,8,70,0.9)', 'rgba(10,4,28,0.6)', 'transparent']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={s.topNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="arrow-back-outline" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.storagePill} activeOpacity={0.8}>
                <Ionicons name="cloud-outline" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={s.storagePillText}>{storagePercent}% used</Text>
              </TouchableOpacity>
            </View>
            <View style={s.wordmarkRow}>
              <View>
                <Text style={s.wordmark}>Create<Text style={s.wordmarkDim}> Track</Text></Text>
                <Text style={s.wordmarkSub}>Upload your track or episode</Text>
              </View>
              <PulseIcon />
            </View>
            <View style={s.heroDiv} />
            <View style={s.taglineBlock}>
              <Text style={s.taglineText}>UPLOAD. DISTRIBUTE. EARN.</Text>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════
              UPLOAD MODE — cinematic cards
            ══════════════════════════════════════════════════ */}
          <SectionLabel text="UPLOAD MODE" />
          <View style={s.modeRow}>
            <TouchableOpacity style={[s.modeCard, uploadMode === 'single' && s.modeCardActive]} onPress={() => setUploadMode('single')} activeOpacity={0.88}>
              <Image source={require('../../assets/banner-bg1.JPG')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <LinearGradient colors={uploadMode === 'single' ? ['rgba(220,38,38,0.55)', 'rgba(30,10,80,0.92)'] : ['rgba(15,5,40,0.72)', 'rgba(10,4,28,0.95)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
              {uploadMode === 'single' && <View style={s.modeCheckBadge}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
              <View style={s.modeCardContent}>
                <Ionicons name="musical-note" size={28} color={uploadMode === 'single' ? '#DC2626' : 'rgba(255,255,255,0.5)'} />
                <Text style={[s.modeLabel, uploadMode === 'single' && { color: '#DC2626' }]}>Single Track</Text>
                <Text style={s.modeDesc}>Upload one track</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modeCard, uploadMode === 'album' && { ...s.modeCardActive, borderColor: 'rgba(139,92,246,0.6)' }]}
              onPress={() => {
                if (tier === 'free') {
                  Alert.alert('Upgrade Required', 'Albums are available for Premium and Unlimited users.', [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade' as never) },
                  ]);
                  return;
                }
                setUploadMode('album');
              }}
              activeOpacity={0.88}
            >
              <LinearGradient colors={['#1C1235', '#2A1650', '#1C1235']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <LinearGradient colors={uploadMode === 'album' ? ['rgba(139,92,246,0.6)', 'transparent'] : ['rgba(139,92,246,0.2)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
              {uploadMode === 'album' && <View style={[s.modeCheckBadge, { backgroundColor: '#7C3AED' }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
              <View style={s.modeCardContent}>
                <Ionicons name="albums" size={28} color={uploadMode === 'album' ? '#A78BFA' : 'rgba(255,255,255,0.5)'} />
                <Text style={[s.modeLabel, uploadMode === 'album' && { color: '#A78BFA' }]}>Album</Text>
                <Text style={s.modeDesc}>Multiple tracks</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ══════════════════════════════════════════════════
              CONTENT TYPE — Screen 02 text tabs
            ══════════════════════════════════════════════════ */}
          <SectionLabel text="CONTENT TYPE" />
          <View style={s.contentTypeTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
              {CONTENT_TYPES.map(c => (
                <TouchableOpacity key={c.value} onPress={() => setContentType(c.value)} style={s.tab}>
                  <Text style={[s.tabText, contentType === c.value ? { color: '#fff', fontWeight: '500' } : { color: 'rgba(255,255,255,0.28)' }]}>{c.label}</Text>
                  {contentType === c.value && <View style={[s.tabDot, { backgroundColor: c.color }]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Active content type detail card */}
          <View style={s.ctypeCard}>
            <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
            <View style={[s.ctypeIconWrap, { backgroundColor: ct.color + '22', borderColor: ct.color + '44' }]}>
              <Ionicons name={ct.icon as any} size={28} color={ct.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ctypeLabel}>{ct.label}</Text>
              <Text style={s.ctypeDesc}>
                {contentType === 'music' ? 'Upload your music, beats, or audio tracks' :
                 contentType === 'podcast' ? 'Share your podcast episodes and audio content' :
                 contentType === 'mixtape' ? 'Upload DJ mixes and continuous sets' :
                 'Share chapters, stories, or spoken word'}
              </Text>
            </View>
          </View>

          {/* DJ Mixtape disclaimer */}
          {contentType === 'mixtape' && (
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
              <Text style={[s.infoBoxText, { color: 'rgba(255,255,255,0.6)' }]}>
                DJ Mixes are shared for promotional use. You are responsible for the content you upload. SoundBridge complies with all valid DMCA takedown requests.
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════
              AUDIO FILE
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text="Audio File *" />
            {audioFile ? (
              <View style={s.fileChosen}>
                <LinearGradient colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.06)']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="musical-notes" size={22} color="#22C55E" />
                <Text style={s.fileChosenName} numberOfLines={1}>{audioFile.name}</Text>
                <TouchableOpacity onPress={() => {
                  setAudioFile(null);
                  resetAcrAndIsrcState();
                }}><Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.uploadZone} onPress={pickAudio} activeOpacity={0.82}>
                <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="document-outline" size={36} color="rgba(255,255,255,0.2)" />
                <Text style={s.uploadZoneTitle}>Select Audio File</Text>
                <Text style={s.uploadZoneSub}>
                  MP3, WAV, M4A, AAC, OGG, FLAC (Max {contentType === 'mixtape' ? '200MB' : '100MB'})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ══════════════════════════════════════════════════
              AUDIO VERIFICATION (ACRCloud) — music only
            ══════════════════════════════════════════════════ */}
          {contentType === 'music' && audioFile && (
            <View style={s.formSection}>
              <FieldLabel text="Audio Verification" />

              {(acrcloudStatus === 'checking' || fingerprinting) && (
                <View style={[s.acrBox, s.acrBoxChecking]}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <View style={s.acrContent}>
                    <Text style={s.acrTitle}>Verifying audio content...</Text>
                    <Text style={s.acrDetails}>Checking if this track exists on streaming platforms</Text>
                  </View>
                </View>
              )}

              {acrcloudStatus === 'match' && acrcloudData && 'detectedTitle' in acrcloudData && (
                <View style={[s.acrBox, s.acrBoxMatch]}>
                  <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                  <View style={s.acrContent}>
                    <Text style={s.acrTitle}>This song appears to be a released track</Text>
                    <Text style={s.acrDetails}><Text style={{ fontWeight: '600' }}>Title:</Text> {acrcloudData.detectedTitle}</Text>
                    <Text style={s.acrDetails}><Text style={{ fontWeight: '600' }}>Artist:</Text> {acrcloudData.detectedArtist}</Text>
                    {acrcloudData.detectedAlbum && (
                      <Text style={s.acrDetails}><Text style={{ fontWeight: '600' }}>Album:</Text> {acrcloudData.detectedAlbum}</Text>
                    )}
                    <Text style={s.acrMessage}>
                      This recording matches a known release. Fill in the original artist and title below, then upload as a cover. If you own this recording, your upload will be queued for manual review.
                    </Text>
                    <View style={s.acrNotice}>
                      <Text style={s.acrNoticeText}>
                        Uploads that match existing recordings are flagged for manual review before going public. Confirm the original artist/title details below.
                      </Text>
                    </View>
                    {acrcloudData.artistMatch && !acrcloudData.artistMatch.match && (
                      <View style={s.acrMismatch}>
                        <Ionicons name="warning" size={16} color="#DC2626" />
                        <Text style={s.acrMismatchText}>
                          Artist name mismatch: detected as "{acrcloudData.detectedArtist}". Correct the original artist name below if needed.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {acrcloudStatus === 'no_match' && (
                <View style={[s.acrBox, s.acrBoxNoMatch]}>
                  <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                  <View style={s.acrContent}>
                    <Text style={s.acrTitle}>This appears to be original/unreleased music</Text>
                    <Text style={s.acrDetails}>No match found in music databases. You can proceed with upload.</Text>
                    <TouchableOpacity
                      onPress={() => setIsOriginalConfirmed(!isOriginalConfirmed)}
                      style={s.acrCheckboxRow}
                      activeOpacity={0.8}
                    >
                      <View style={[s.checkboxBox, isOriginalConfirmed && { backgroundColor: '#DC2626', borderColor: '#DC2626' }]}>
                        {isOriginalConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={s.checkboxLabel}>
                        I confirm this is my original/unreleased music and I own all rights to it
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {acrcloudStatus === 'error' && (
                <View style={[s.acrBox, s.acrBoxError]}>
                  <Ionicons name="information-circle" size={22} color="#F59E0B" />
                  <View style={s.acrContent}>
                    <Text style={s.acrTitle}>Audio verification unavailable</Text>
                    <Text style={s.acrDetails}>{acrcloudError || 'Verification service unavailable'}</Text>
                    <Text style={s.acrMessage}>
                      Fingerprinting failed. You can still proceed with upload. Your track will be flagged for manual review.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════
              BASIC INFORMATION
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text="Basic Information" />

            {/* Title */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Title *</Text>
              <StyledInput value={title} onChangeText={setTitle} placeholder={`Enter ${contentType} title`} />
            </View>

            {/* Description */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Description</Text>
              <StyledInput value={description} onChangeText={setDescription} placeholder={`Describe your ${contentType}…`} multiline numberOfLines={3} />
            </View>

            {/* Music: Artist Name + Genre + Mood Tags */}
            {contentType === 'music' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Artist Name *</Text>
                  <StyledInput value={artistName} onChangeText={setArtistName} placeholder="Enter artist name" />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Genre</Text>
                  <ChipRow options={GENRES} selected={genre} onSelect={g => setGenre(g === genre ? '' : g)} color="#DC2626" />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Mood</Text>
                  <Text style={s.inputHint}>Choose up to 3 moods (optional)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {MOOD_OPTIONS.map(mood => {
                      const sel = moodTags.includes(mood);
                      const atLimit = moodTags.length >= 3 && !sel;
                      return (
                        <TouchableOpacity key={mood} onPress={() => !atLimit && toggleMood(mood)}
                          style={[s.chip, sel && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }, atLimit && { opacity: 0.35 }]}>
                          <Text style={[s.chipText, sel && { color: '#fff' }]}>{mood}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Podcast: Episode Number + Category */}
            {contentType === 'podcast' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Episode Number *</Text>
                  <StyledInput value={episodeNumber} onChangeText={setEpisodeNumber} placeholder="e.g., 1" keyboardType="number-pad" />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Category</Text>
                  <ChipRow options={PODCAST_CATEGORIES} selected={podcastCategory} onSelect={c => setPodcastCategory(c === podcastCategory ? '' : c)} color="#8B5CF6" />
                </View>
              </>
            )}

            {/* DJ Mixtape: DJ Name + Genre + Tracklist */}
            {contentType === 'mixtape' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>DJ / Artist Name *</Text>
                  <StyledInput value={djName} onChangeText={setDjName} placeholder="e.g., DJ Justice" />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Genre *</Text>
                  <ChipRow options={GENRES} selected={genre} onSelect={g => setGenre(g === genre ? '' : g)} color="#F59E0B" />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Tracklist *</Text>
                  <Text style={s.inputHint}>List each track on a new line, e.g. "Artist - Song Title"</Text>
                  <StyledInput value={tracklist} onChangeText={setTracklist} placeholder={'1. Artist - Track Title\n2. Artist - Track Title'} multiline numberOfLines={6} />
                </View>
              </>
            )}

            {/* Audio Book: Narrator + Chapter + Genre */}
            {contentType === 'audio_book' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Narrator (optional)</Text>
                  <StyledInput value={narrator} onChangeText={setNarrator} placeholder="e.g., John Smith" />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Chapter / Part (optional)</Text>
                  <StyledInput value={chapterNumber} onChangeText={setChapterNumber} placeholder="e.g., Chapter 1, Part 2" />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Book Genre *</Text>
                  <ChipRow options={BOOK_GENRES} selected={bookGenre} onSelect={g => setBookGenre(g === bookGenre ? '' : g)} color="#0EA5E9" />
                </View>
              </>
            )}

            {/* Tags — all types */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Tags</Text>
              <StyledInput value={tags} onChangeText={setTags} placeholder="Enter tags separated by commas" />
            </View>

            {/* Lyrics — music only */}
            {contentType === 'music' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Lyrics (Optional)</Text>
                  <StyledInput value={lyrics} onChangeText={setLyrics} placeholder="Enter song lyrics…" multiline numberOfLines={8} />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Lyrics Language</Text>
                  <ChipRow options={LYRICS_LANGUAGES.map(l => l.label)} selected={LYRICS_LANGUAGES.find(l => l.value === lyricsLang)?.label || 'English'}
                    onSelect={label => { const l = LYRICS_LANGUAGES.find(x => x.label === label); if (l) setLyricsLang(l.value); }} color="#DC2626" />
                </View>
              </>
            )}
          </View>

          {/* ══════════════════════════════════════════════════
              COVER ART
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text="Cover Art *" />
            {coverImage ? (
              <View style={s.coverPreviewRow}>
                <Image source={{ uri: coverImage.uri }} style={s.coverThumb} />
                <Text style={[s.fileChosenName, { flex: 1 }]} numberOfLines={1}>{coverImage.name}</Text>
                <TouchableOpacity onPress={() => setCoverImage(null)}><Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[s.uploadZone, { height: 90 }]} onPress={pickCover} activeOpacity={0.82}>
                <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="camera-outline" size={26} color="rgba(255,255,255,0.2)" />
                <Text style={s.uploadZoneSub}>JPG, PNG (Max 5MB)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ══════════════════════════════════════════════════
              ISRC / COVER SONG — music only
            ══════════════════════════════════════════════════ */}
          {contentType === 'music' && (
            <View style={s.formSection}>
              {acrcloudStatus === 'match' ? (
                <FieldLabel
                  text="ISRC Verification (optional)"
                  hint="This track was detected as a released song. If you have an ISRC, enter it to verify ownership. If you don't have one, leave it blank."
                />
              ) : acrcloudStatus === 'no_match' ? (
                <FieldLabel
                  text={isCover ? 'Cover Song Details' : 'ISRC Verification (optional)'}
                  hint={!isCover ? 'No ISRC? SoundBridge will automatically assign one to your recording once PPL registration is complete. If you already have a distributor ISRC, enter it below.' : undefined}
                />
              ) : (
                <FieldLabel text="Cover Song Verification" />
              )}

              {acrcloudStatus !== 'match' && (
                <Checkbox checked={isCover} onPress={() => setIsCover(v => !v)} label="This is a cover song" />
              )}

              {(acrcloudStatus === 'match' || isCover) && (
                <View style={{ marginTop: 14, gap: 14 }}>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Original Artist Name *</Text>
                    <StyledInput value={originalArtist} onChangeText={setOriginalArtist} placeholder="e.g., The Beatles" />
                    {acrcloudStatus === 'match' && (
                      <Text style={s.inputHint}>Auto-filled from audio fingerprint — edit if incorrect.</Text>
                    )}
                  </View>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Original Song Title *</Text>
                    <StyledInput value={originalTitle} onChangeText={setOriginalTitle} placeholder="e.g., Let It Be" />
                    {acrcloudStatus === 'match' && (
                      <Text style={s.inputHint}>Auto-filled from audio fingerprint — edit if incorrect.</Text>
                    )}
                  </View>
                </View>
              )}

              {(acrcloudStatus === 'match' || acrcloudStatus === 'no_match' || isCover) && (
                <View style={{ marginTop: 16 }}>
                  {acrcloudStatus === 'match' && (
                    <View style={[s.isrcBanner, s.isrcBannerMatch]}>
                      <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.isrcBannerTitle}>Ownership Verification (optional)</Text>
                        <Text style={s.isrcBannerText}>
                          If you have an ISRC from your distributor (DistroKid, TuneCore, CD Baby, etc.), enter it to verify ownership. No ISRC? Leave blank — SoundBridge will assign your recording one.
                        </Text>
                      </View>
                    </View>
                  )}

                  {acrcloudStatus === 'no_match' && !isCover && (
                    <View style={[s.isrcBanner, s.isrcBannerAuto]}>
                      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.isrcBannerTitle}>ISRC Auto-Assignment</Text>
                        <Text style={s.isrcBannerText}>
                          SoundBridge will assign an ISRC (GB-SBR-26-XXXXX) to this recording automatically. If you already have a distributor ISRC, enter it below to use yours instead.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={[s.inputGroup, { marginTop: 12 }]}>
                    <Text style={s.inputLabel}>
                      ISRC Code <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '400', textTransform: 'none' }}>(optional)</Text>
                    </Text>
                    <TextInput
                      style={[
                        s.textInput,
                        isrcVerificationStatus === 'error' && { borderColor: '#F59E0B' },
                        isrcVerificationStatus === 'success' && { borderColor: '#22C55E' },
                      ]}
                      value={isrcCode}
                      onChangeText={handleISRCChange}
                      placeholder="e.g., GBUM71502800 — leave blank to auto-assign"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      maxLength={14}
                      autoCapitalize="characters"
                      selectionColor="#DC2626"
                      autoComplete="off"
                      textContentType="none"
                    />
                    <Text style={s.inputHint}>
                      Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional).{isCover ? " No ISRC? That's fine — leave it blank. SoundBridge will assign your recording an ISRC once we complete our PPL registration." : ''}
                    </Text>
                  </View>

                  {isrcVerificationStatus === 'loading' && (
                    <View style={s.verifyStatus}>
                      <ActivityIndicator size="small" color="#DC2626" />
                      <Text style={s.verifyStatusText}>Verifying ISRC code...</Text>
                    </View>
                  )}

                  {isrcVerificationStatus === 'success' && isrcVerificationData && (
                    <View style={[s.verifyBox, s.verifySuccess]}>
                      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.verifyTitle}>Verified</Text>
                        <Text style={s.verifyDetails}>
                          {isrcVerificationData.title}
                          {isrcVerificationData['artist-credit']?.length > 0 &&
                            ` by ${isrcVerificationData['artist-credit'].map((a: any) => a.name || a.artist?.name).join(', ')}`}
                        </Text>
                      </View>
                    </View>
                  )}

                  {isrcVerificationStatus === 'error' && isrcVerificationError && (
                    <View style={[s.verifyBox, s.verifyWarning]}>
                      <Ionicons name="information-circle" size={18} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.verifyTitle}>ISRC not verified</Text>
                        <Text style={s.verifyDetails}>{isrcVerificationError}</Text>
                        <Text style={[s.verifyDetails, { marginTop: 4 }]}>
                          You can still proceed — leave ISRC blank and SoundBridge will assign one.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════
              PRIVACY SETTINGS
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text="Privacy Settings" />
            <View style={s.privacyGroup}>
              {([
                { value: 'public'    as Privacy, label: 'Public',           desc: 'Anyone can view',                icon: 'globe-outline' },
                { value: 'followers' as Privacy, label: 'Followers Only',   desc: 'Only your followers can view',   icon: 'people-outline' },
                { value: 'private'   as Privacy, label: 'Private',          desc: 'Only you can view',              icon: 'lock-closed-outline' },
              ] as { value: Privacy; label: string; desc: string; icon: string }[]).map(opt => (
                <TouchableOpacity key={opt.value} style={[s.privacyOption, privacy === opt.value && s.privacyOptionActive]} onPress={() => setPrivacy(opt.value)} activeOpacity={0.82}>
                  <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name={opt.icon as any} size={18} color={privacy === opt.value ? '#DC2626' : 'rgba(255,255,255,0.4)'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.privacyLabel, privacy === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                    <Text style={s.privacyDesc}>{opt.desc}</Text>
                  </View>
                  {privacy === opt.value && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ══════════════════════════════════════════════════
              PRICING
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text="Pricing" />
            <View style={s.pricingToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.privacyLabel}>Paid track</Text>
                <Text style={s.privacyDesc}>{isPaid ? 'Listeners pay to access this track' : 'Free for everyone'}</Text>
              </View>
              <Switch
                value={isPaid}
                onValueChange={v => { setIsPaid(v); if (!v) setPrice(''); }}
                trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#DC2626' }}
                thumbColor={isPaid ? '#fff' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            {isPaid && (
              <View style={[s.inputGroup, { marginTop: 14 }]}>
                <Text style={s.inputLabel}>Price</Text>
                <View style={s.priceRow}>
                  <TouchableOpacity style={[s.currencyPill, currency === 'USD' && s.currencyPillActive]} onPress={() => setCurrency('USD')}>
                    <Text style={[s.currencyPillText, currency === 'USD' && { color: '#fff' }]}>USD $</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.currencyPill, currency === 'GBP' && s.currencyPillActive]} onPress={() => setCurrency('GBP')}>
                    <Text style={[s.currencyPillText, currency === 'GBP' && { color: '#fff' }]}>GBP £</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.currencyPill, currency === 'NGN' && s.currencyPillActive]} onPress={() => setCurrency('NGN')}>
                    <Text style={[s.currencyPillText, currency === 'NGN' && { color: '#fff' }]}>NGN ₦</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[s.textInput, { flex: 1, marginLeft: 8 }]}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="decimal-pad"
                    selectionColor="#DC2626"
                  />
                </View>
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════════════════
              COPYRIGHT CONFIRMATION
            ══════════════════════════════════════════════════ */}
          <View style={s.formSection}>
            <FieldLabel text={contentType === 'mixtape' ? 'Mixtape Terms *' : 'Copyright Confirmation *'} />
            <View style={s.copyrightBox}>
              <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="shield-checkmark-outline" size={22} color={contentType === 'mixtape' ? '#F59E0B' : '#DC2626'} style={{ marginTop: 2 }} />
              <Text style={s.copyrightText}>
                {contentType === 'mixtape'
                  ? 'DJ Mixes are shared for promotional, non-commercial purposes. I understand I do not own the underlying recordings and that rights holders may request removal. SoundBridge complies with all valid DMCA takedown requests.'
                  : 'I confirm that I own all rights to this music and it does not infringe any third-party copyrights. Uploading copyrighted content without permission may result in account suspension.'}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <Checkbox
                checked={contentType === 'mixtape' ? agreedToMixtapeTerms : agreedToCopyright}
                onPress={() => contentType === 'mixtape' ? setAgreedToMixtapeTerms(v => !v) : setAgreedToCopyright(v => !v)}
                label={contentType === 'mixtape' ? 'I agree to the mixtape terms above' : 'I agree to the copyright terms above'}
              />
            </View>
          </View>

          {/* ── Upload button ── */}
          <Pressable
            style={s.uploadBtn}
            onPress={handleUpload}
            disabled={isUploading || fingerprinting}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
            accessibilityRole="button"
            accessibilityLabel="Publish track"
          >
            <LinearGradient colors={['#DC2626', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.uploadBtnGrad} pointerEvents="none">
              {isUploading ? (
                <View style={{ alignItems: 'center', gap: 4 }} pointerEvents="none">
                  <ActivityIndicator color="#fff" />
                  {uploadProgress > 0 && (
                    <Text style={{ color: '#fff', fontSize: 12 }}>{uploadProgress}%</Text>
                  )}
                </View>
              ) : (
                <Text style={s.uploadBtnText}>Publish</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
      <CreatorAgreementModal
        visible={agreementVisible}
        submitting={agreementSubmitting}
        onAgreed={onAgreed}
        onDismiss={onDismiss}
      />

      {/* Distribution nudge — shown immediately after successful upload */}
      <Modal
        visible={showDistributionNudge}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowDistributionNudge(false)}
      >
        <View style={s.nudgeOverlay}>
          <View style={s.nudgeSheet}>
            {/* Green accent bar */}
            <View style={s.nudgeAccentBar} />

            <View style={s.nudgeHandle} />

            <View style={s.nudgeCheckRow}>
              <View style={s.nudgeCheckCircle}>
                <Ionicons name="checkmark" size={22} color="#fff" />
              </View>
              <Text style={s.nudgeCheckLabel}>Track is live</Text>
            </View>

            <Text style={s.nudgeTitle}>Get it on Spotify and major platforms</Text>
            <Text style={s.nudgeBody}>
              Your track is now on SoundBridge. Distributing it to streaming platforms means
              more listeners, more royalties, and a verified presence on Spotify, Apple Music,
              and everywhere else your audience already listens.
            </Text>

            <TouchableOpacity
              style={s.nudgeDistributeBtn}
              activeOpacity={0.85}
              onPress={() => {
                setShowDistributionNudge(false);
                (navigation as any).navigate('MBGSonicsDistribution', uploadedTrackId ? { preSelectedTrackId: uploadedTrackId } : undefined);
              }}
            >
              <Ionicons name="globe-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.nudgeDistributeBtnText}>Distribute This Track</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.nudgeDismissBtn}
              activeOpacity={0.7}
              onPress={() => setShowDistributionNudge(false)}
            >
              <Text style={s.nudgeDismissText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0620' },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Hero
  hero: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32, overflow: 'hidden' },
  topNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  storagePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  storagePillText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  wordmarkRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 },
  wordmark: { fontSize: 42, fontWeight: '300', color: '#fff', letterSpacing: -1.2, lineHeight: 46 },
  wordmarkDim: { color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  wordmarkSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: 0.1 },
  heroDiv: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginVertical: 18 },
  taglineBlock: { borderLeftWidth: 1.5, borderLeftColor: 'rgba(255,255,255,0.3)', paddingLeft: 14 },
  taglineText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.8, textTransform: 'uppercase' },

  // Section header dividers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 28, marginBottom: 14, gap: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  sectionLabelText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },

  // Mode cards
  modeRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  modeCard: { flex: 1, height: 150, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modeCardActive: { borderColor: 'rgba(220,38,38,0.6)' },
  modeCardContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  modeLabel: { fontSize: 15, fontWeight: '600', color: '#fff', textAlign: 'center' },
  modeDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  modeCheckBadge: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  // Content type tabs
  contentTypeTabs: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', marginBottom: 4 },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', gap: 4 },
  tabText: { fontSize: 20, letterSpacing: -0.2, lineHeight: 26 },
  tabDot: { width: 4, height: 4, borderRadius: 2 },
  ctypeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ctypeIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctypeLabel: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 3 },
  ctypeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },

  // Info box
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 12 },
  infoBoxText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Form section
  formSection: { marginHorizontal: 16, marginTop: 28 },
  uploadSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  uploadTagline: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#DC2626', marginTop: 2 },
  uploadSectionTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 },
  fieldHint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  // Upload zones
  uploadZone: { height: 120, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadZoneTitle: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
  uploadZoneSub: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingHorizontal: 20 },
  fileChosen: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  fileChosenName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  coverPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  coverThumb: { width: 48, height: 48, borderRadius: 8 },

  // Inputs
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  inputHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, lineHeight: 16 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#fff' },

  // Chips
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  checkboxBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxLabel: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  // Privacy
  privacyGroup: { gap: 8 },
  privacyOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  privacyOptionActive: { borderColor: 'rgba(220,38,38,0.5)' },
  privacyLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  privacyDesc: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  // Pricing
  pricingToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  currencyPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  currencyPillActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  currencyPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },

  // Copyright
  copyrightBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  copyrightText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },

  // Upload button
  uploadBtn: { marginHorizontal: 16, marginTop: 32, borderRadius: 999, overflow: 'hidden', zIndex: 20, elevation: 20 },
  uploadBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  uploadBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  // ACRCloud verification
  acrBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  acrBoxChecking: { borderColor: 'rgba(220,38,38,0.35)', backgroundColor: 'rgba(220,38,38,0.08)' },
  acrBoxMatch: { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.1)' },
  acrBoxNoMatch: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.08)' },
  acrBoxError: { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.08)' },
  acrContent: { flex: 1 },
  acrTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  acrDetails: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18, marginBottom: 2 },
  acrMessage: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17, marginTop: 8 },
  acrNotice: { marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)' },
  acrNoticeText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },
  acrMismatch: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)', backgroundColor: 'rgba(220,38,38,0.1)' },
  acrMismatchText: { flex: 1, fontSize: 12, color: '#FCA5A5', lineHeight: 17 },
  acrCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12, paddingVertical: 4 },

  // ISRC verification
  isrcBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  isrcBannerMatch: { borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)' },
  isrcBannerAuto: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.08)' },
  isrcBannerTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 4 },
  isrcBannerText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },
  verifyStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  verifyStatusText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  verifyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  verifySuccess: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.1)' },
  verifyWarning: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' },
  verifyTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  verifyDetails: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },

  // Distribution nudge modal
  nudgeOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  nudgeSheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, overflow: 'hidden' },
  nudgeAccentBar: { height: 3, backgroundColor: '#22C55E', marginBottom: 0 },
  nudgeHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  nudgeCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  nudgeCheckCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  nudgeCheckLabel: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  nudgeTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 10 },
  nudgeBody: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22, marginBottom: 24 },
  nudgeDistributeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  nudgeDistributeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  nudgeDismissBtn: { alignItems: 'center', paddingVertical: 12 },
  nudgeDismissText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
});
