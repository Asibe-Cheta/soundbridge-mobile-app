import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Switch, TextInput, Alert,
  StatusBar, FlatList, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import { SystemTypography as Typography } from '../constants/Typography';

type Step = 'select_track' | 'cover_art' | 'form' | 'payment' | 'success';

interface TrackItem {
  id: string;
  title: string;
  genre: string | null;
  cover_art_url: string | null;
  isrc_code: string | null;
}

interface DistributionCoverArt {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
}

interface FormData {
  releaseDate: Date;
  featuredArtists: string;
  explicit: boolean;
  rightsConfirmed: boolean;
}

interface SuccessData {
  requestId: string;
  trackTitle: string;
  releaseDate: string;
}

const MIN_COVER_SIZE = 1400; // Apple Music minimum (strictest major platform)

export default function MBGSonicsDistributionScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: { preSelectedTrackId?: string } }, 'params'>>();
  const { theme } = useTheme();
  const { user, userProfile, session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const isDark = theme.isDark;

  const preSelectedTrackId = route.params?.preSelectedTrackId;

  const minReleaseDate = new Date();
  minReleaseDate.setDate(minReleaseDate.getDate() + 14);

  const [step, setStep] = useState<Step>(preSelectedTrackId ? 'cover_art' : 'select_track');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackItem | null>(null);

  const [coverArtStatus, setCoverArtStatus] = useState<'checking' | 'pass' | 'fail' | null>(null);
  const [distributionCoverArt, setDistributionCoverArt] = useState<DistributionCoverArt | null>(null);

  const [formData, setFormData] = useState<FormData>({
    releaseDate: minReleaseDate,
    featuredArtists: '',
    explicit: false,
    rightsConfirmed: false,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [paying, setPaying] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Fetch creator's tracks for selection step
  useEffect(() => {
    if (step === 'select_track' && user?.id) {
      setLoadingTracks(true);
      supabase
        .from('audio_tracks')
        .select('id, title, genre, cover_art_url, isrc_code')
        .eq('creator_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setTracks(data ?? []); setLoadingTracks(false); });
    }
  }, [step, user?.id]);

  // Load preselected track
  useEffect(() => {
    if (preSelectedTrackId && !selectedTrack) {
      supabase
        .from('audio_tracks')
        .select('id, title, genre, cover_art_url, isrc_code')
        .eq('id', preSelectedTrackId)
        .single()
        .then(({ data }) => { if (data) setSelectedTrack(data as TrackItem); });
    }
  }, [preSelectedTrackId]);

  // Auto-validate cover art when entering cover_art step
  useEffect(() => {
    if (step === 'cover_art') {
      if (selectedTrack?.cover_art_url) {
        checkExistingCoverArt(selectedTrack.cover_art_url);
      } else {
        setCoverArtStatus('fail');
      }
    }
  }, [step, selectedTrack]);

  const checkExistingCoverArt = (url: string) => {
    setCoverArtStatus('checking');
    Image.getSize(
      url,
      (width, height) => {
        const square = Math.abs(width - height) / Math.max(width, height) < 0.02;
        setCoverArtStatus(width >= MIN_COVER_SIZE && height >= MIN_COVER_SIZE && square ? 'pass' : 'fail');
      },
      () => setCoverArtStatus('fail')
    );
  };

  const pickDistributionCoverArt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const w = asset.width ?? 0;
    const h = asset.height ?? 0;
    const mime = asset.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(mime)) {
      Alert.alert('Invalid format', 'Cover art must be a JPEG or PNG file.');
      return;
    }
    if (w < MIN_COVER_SIZE || h < MIN_COVER_SIZE) {
      Alert.alert('Image too small', `Must be at least ${MIN_COVER_SIZE}×${MIN_COVER_SIZE} px (Apple Music minimum). Yours is ${w}×${h}.`);
      return;
    }
    if (Math.abs(w - h) / Math.max(w, h) > 0.02) {
      Alert.alert('Not square', 'Cover art must have a square aspect ratio.');
      return;
    }
    setDistributionCoverArt({ uri: asset.uri, width: w, height: h, mimeType: mime });
  };

  const uploadDistributionCoverArt = async (): Promise<string | null> => {
    if (!distributionCoverArt || !user?.id) return null;
    try {
      const ext = distributionCoverArt.mimeType === 'image/png' ? 'png' : 'jpg';
      const filename = `distribution/${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(distributionCoverArt.uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from('cover-art')
        .upload(filename, blob, { contentType: distributionCoverArt.mimeType, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('cover-art').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Could not upload cover art.');
      return null;
    }
  };

  const handlePayAndSubmit = async () => {
    if (!selectedTrack || !user?.id || !session) return;
    setPaying(true);
    try {
      let distributionCoverArtUrl: string | null = null;
      if (distributionCoverArt) {
        distributionCoverArtUrl = await uploadDistributionCoverArt();
        if (!distributionCoverArtUrl) { setPaying(false); return; }
      }

      const { clientSecret, paymentIntentId } = await apiFetch<{ clientSecret: string; paymentIntentId: string }>(
        '/api/distribution/create-payment-intent',
        { method: 'POST', session, body: JSON.stringify({ creatorId: user.id, trackId: selectedTrack.id }) }
      );

      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'SoundBridge',
        defaultBillingDetails: {
          email: user.email ?? undefined,
          name: userProfile?.display_name ?? undefined,
        },
      });
      if (initErr) throw new Error(initErr.message);

      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== 'Canceled') throw new Error(presentErr.message);
        return;
      }

      const { requestId, releaseDate } = await apiFetch<{ requestId: string; releaseDate: string }>(
        '/api/distribution/confirm',
        {
          method: 'POST', session,
          body: JSON.stringify({
            paymentIntentId,
            trackId: selectedTrack.id,
            artistName: userProfile?.display_name ?? user.email,
            trackTitle: selectedTrack.title,
            genre: selectedTrack.genre,
            isrcCode: selectedTrack.isrc_code,
            featuredArtists: formData.featuredArtists.trim() || null,
            explicitContent: formData.explicit,
            rightsConfirmed: formData.rightsConfirmed,
            requestedReleaseDate: formData.releaseDate.toISOString().split('T')[0],
            creatorEmail: user.email,
            distributionCoverArtUrl,
          }),
        }
      );

      setSuccessData({ requestId, trackTitle: selectedTrack.title, releaseDate });
      setStep('success');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setFormData(p => ({ ...p, releaseDate: date }));
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const canProceedCoverArt = coverArtStatus === 'pass' || (coverArtStatus === 'fail' && !!distributionCoverArt);

  // ─── Steps ─────────────────────────────────────────────────────────────────

  const renderSelectTrack = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select a track</Text>
      <Text style={[styles.stepSub, { color: theme.colors.textSecondary }]}>
        Choose which track to distribute to streaming platforms.
      </Text>
      {loadingTracks ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : tracks.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="musical-notes-outline" size={44} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No uploaded tracks yet.</Text>
        </View>
      ) : (
        <View style={[styles.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {tracks.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.trackRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}
              onPress={() => { setSelectedTrack(item); setStep('cover_art'); }}
              activeOpacity={0.75}
            >
              {item.cover_art_url ? (
                <Image source={{ uri: item.cover_art_url }} style={styles.trackThumb} />
              ) : (
                <View style={[styles.trackThumb, styles.thumbPlaceholder, { backgroundColor: theme.colors.primary + '22' }]}>
                  <Ionicons name="musical-note" size={20} color={theme.colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.trackGenre, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.genre ?? 'No genre'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderCoverArt = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Cover art check</Text>
      <Text style={[styles.stepSub, { color: theme.colors.textSecondary }]}>
        Minimum 1400×1400 px square JPEG or PNG (Apple Music requirement). 3000×3000 recommended for best quality.
      </Text>

      {selectedTrack?.cover_art_url ? (
        <View style={[styles.coverRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Image source={{ uri: selectedTrack.cover_art_url }} style={styles.coverThumb} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.coverLabel, { color: theme.colors.textSecondary }]}>Current cover art</Text>
            {coverArtStatus === 'checking' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Checking…</Text>
              </View>
            )}
            {coverArtStatus === 'pass' && (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>Meets platform requirements</Text>
              </View>
            )}
            {coverArtStatus === 'fail' && (
              <View style={styles.statusRow}>
                <Ionicons name="close-circle" size={17} color="#EF4444" />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>Does not meet requirements</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.noCoverBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="image-outline" size={36} color={theme.colors.textSecondary} />
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>No cover art on this track.</Text>
        </View>
      )}

      {coverArtStatus === 'fail' && (
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Upload distribution cover art</Text>
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            Used for distribution only — your SoundBridge cover art is unchanged.
          </Text>
          <TouchableOpacity
            style={[styles.uploadBtn, { borderColor: distributionCoverArt ? '#10B981' : theme.colors.primary }]}
            onPress={pickDistributionCoverArt}
            activeOpacity={0.8}
          >
            {distributionCoverArt ? (
              <>
                <Image source={{ uri: distributionCoverArt.uri }} style={styles.uploadPreview} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uploadBtnLabel, { color: '#10B981' }]}>{distributionCoverArt.width}×{distributionCoverArt.height} px</Text>
                  <Text style={[styles.fieldHint, { color: theme.colors.textSecondary, marginBottom: 0 }]}>Tap to change</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              </>
            ) : (
              <>
                <View style={[styles.uploadIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.uploadBtnLabel, { color: theme.colors.primary }]}>Choose image (min 1400×1400 px)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: canProceedCoverArt ? theme.colors.primary : theme.colors.border, marginTop: 32 }]}
        onPress={() => canProceedCoverArt && setStep('form')}
        disabled={!canProceedCoverArt}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderForm = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Distribution details</Text>

      <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Pre-filled from your profile &amp; track</Text>
      <View style={[styles.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 24 }]}>
        {[
          { label: 'Artist name', value: userProfile?.display_name ?? user?.email ?? '' },
          { label: 'Track title', value: selectedTrack?.title ?? '' },
          { label: 'Genre', value: selectedTrack?.genre ?? 'Not specified' },
          { label: 'ISRC code', value: selectedTrack?.isrc_code ?? 'Not assigned' },
          { label: 'Creator email', value: user?.email ?? '' },
          { label: 'Creator ID', value: (user?.id ?? '').slice(0, 16) + '…' },
        ].map((f, i, arr) => (
          <View key={f.label} style={[styles.readRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
            <Text style={[styles.readLabel, { color: theme.colors.textSecondary }]}>{f.label}</Text>
            <Text style={[styles.readValue, { color: theme.colors.text }]} numberOfLines={1}>{f.value}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Requested release date *</Text>
      <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>Minimum 14 days from today for processing time.</Text>
      <TouchableOpacity
        style={[styles.dateBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.dateBtnText, { color: theme.colors.text }]}>{formatDate(formData.releaseDate)}</Text>
        <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.dateOverlay}>
            <View style={[styles.dateCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={[styles.dateCardHeader, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.dateAction, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.dateCardTitle, { color: theme.colors.text }]}>Release Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.dateAction, { color: theme.colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={formData.releaseDate} mode="date" display="spinner" onChange={handleDateChange} minimumDate={minReleaseDate} textColor={theme.colors.text} />
            </View>
          </View>
        </Modal>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker value={formData.releaseDate} mode="date" display="default" onChange={handleDateChange} minimumDate={minReleaseDate} />
      )}

      <Text style={[styles.fieldLabel, { color: theme.colors.text, marginTop: 20 }]}>Featured artists (optional)</Text>
      <TextInput
        style={[styles.textInput, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        placeholder="e.g. Artist A, Artist B"
        placeholderTextColor={theme.colors.textSecondary}
        value={formData.featuredArtists}
        onChangeText={v => setFormData(p => ({ ...p, featuredArtists: v }))}
      />

      <View style={[styles.switchRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Explicit content</Text>
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary, marginBottom: 0, marginTop: 3 }]}>Enable if this track contains explicit language or themes.</Text>
        </View>
        <Switch
          value={formData.explicit}
          onValueChange={v => setFormData(p => ({ ...p, explicit: v }))}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
          thumbColor={formData.explicit ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

      <TouchableOpacity
        style={[styles.checkRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => setFormData(p => ({ ...p, rightsConfirmed: !p.rightsConfirmed }))}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, { borderColor: formData.rightsConfirmed ? theme.colors.primary : theme.colors.border, backgroundColor: formData.rightsConfirmed ? theme.colors.primary : 'transparent' }]}>
          {formData.rightsConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[styles.checkText, { color: theme.colors.text }]}>
          I confirm that I own or have the necessary rights to distribute this track, including any samples, co-writes or features.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: formData.rightsConfirmed ? theme.colors.primary : theme.colors.border }]}
        onPress={() => formData.rightsConfirmed && setStep('payment')}
        disabled={!formData.rightsConfirmed}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Review &amp; Pay</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPayment = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Review &amp; pay</Text>

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {selectedTrack?.cover_art_url && <Image source={{ uri: selectedTrack.cover_art_url }} style={styles.summaryArt} />}
        <Text style={[styles.summaryTrack, { color: theme.colors.text }]}>{selectedTrack?.title}</Text>
        <Text style={[styles.summaryArtist, { color: theme.colors.textSecondary }]}>{userProfile?.display_name ?? user?.email}</Text>
        <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, width: '100%', marginVertical: 16 }]} />
        <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: theme.colors.textSecondary }]}>Release date</Text><Text style={[styles.summaryVal, { color: theme.colors.text }]}>{formatDate(formData.releaseDate)}</Text></View>
        {formData.featuredArtists.trim() ? <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: theme.colors.textSecondary }]}>Featured</Text><Text style={[styles.summaryVal, { color: theme.colors.text }]}>{formData.featuredArtists}</Text></View> : null}
        <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: theme.colors.textSecondary }]}>Explicit</Text><Text style={[styles.summaryVal, { color: theme.colors.text }]}>{formData.explicit ? 'Yes' : 'No'}</Text></View>
      </View>

      <LinearGradient
        colors={['rgba(124,58,237,0.16)', 'rgba(124,58,237,0.08)']}
        style={[styles.feeCard, { borderColor: 'rgba(124,58,237,0.30)' }]}
      >
        <View style={styles.feeRow}>
          <Text style={[styles.feeLabel, { color: theme.colors.text }]}>Distribution fee</Text>
          <Text style={[styles.feeAmount, { color: theme.colors.primary }]}>£15.79</Text>
        </View>
        <Text style={[styles.feeNote, { color: theme.colors.textSecondary }]}>
          This fee covers SoundBridge's facilitation service. Streaming royalty terms are separate and handled directly between you and MBG Sonics.
        </Text>
      </LinearGradient>

      <TouchableOpacity
        style={[styles.payBtn, { backgroundColor: paying ? theme.colors.border : theme.colors.primary }]}
        onPress={handlePayAndSubmit}
        disabled={paying}
        activeOpacity={0.85}
      >
        {paying ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="lock-closed" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pay £15.79 and Submit</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successWrap}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={56} color="#10B981" />
      </View>
      <Text style={[styles.successTitle, { color: theme.colors.text }]}>Distribution request submitted</Text>
      <Text style={[styles.successBody, { color: theme.colors.textSecondary }]}>
        Your distribution request has been submitted successfully.
      </Text>
      <View style={[styles.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, width: '100%', marginBottom: 20 }]}>
        {[
          { k: 'Track', v: successData?.trackTitle ?? '' },
          { k: 'Release date', v: successData?.releaseDate ? new Date(successData.releaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '' },
          { k: 'Reference', v: successData?.requestId ?? '' },
        ].map((r, i) => (
          <View key={r.k} style={[styles.readRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
            <Text style={[styles.readLabel, { color: theme.colors.textSecondary }]}>{r.k}</Text>
            <Text style={[styles.readValue, { color: theme.colors.text }]} numberOfLines={1}>{r.v}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.successNote, { color: theme.colors.textSecondary }]}>
        MBG Sonics will process your request and your track will be live on streaming platforms by your requested release date. We will notify you when it goes live.
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, width: '100%' }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const stepOrder: Step[] = preSelectedTrackId
    ? ['cover_art', 'form', 'payment', 'success']
    : ['select_track', 'cover_art', 'form', 'payment', 'success'];

  const currentIdx = stepOrder.indexOf(step);
  const totalSteps = stepOrder.length - 1; // exclude success from count

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => {
              if (currentIdx <= 0 || step === 'success') { navigation.goBack(); return; }
              setStep(stepOrder[currentIdx - 1]);
            }}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.navCenter}>
            <Image source={require('../../assets/mbg.JPG')} style={styles.navLogo} />
            <Text style={[styles.navTitle, { color: theme.colors.text }]}>MBG Sonics Distribution</Text>
          </View>

          {step !== 'success' && (
            <Text style={[styles.stepCounter, { color: theme.colors.textSecondary }]}>
              {Math.min(currentIdx + 1, totalSteps)}/{totalSteps}
            </Text>
          )}
          {step === 'success' && <View style={{ width: 36 }} />}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'select_track' && renderSelectTrack()}
          {step === 'cover_art'    && renderCoverArt()}
          {step === 'form'         && renderForm()}
          {step === 'payment'      && renderPayment()}
          {step === 'success'      && renderSuccess()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navLogo: { width: 26, height: 26, borderRadius: 7 },
  navTitle: { fontSize: 14, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  stepCounter: { fontSize: 13, fontFamily: Typography.body.fontFamily, minWidth: 30, textAlign: 'right' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  stepTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, marginBottom: 8, fontFamily: Typography.body.fontFamily },
  stepSub: { fontSize: 14, lineHeight: 21, marginBottom: 24, fontFamily: Typography.body.fontFamily },

  listCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  trackRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  trackThumb: { width: 50, height: 50, borderRadius: 10 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  trackTitle: { fontSize: 14, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  trackGenre: { fontSize: 12, marginTop: 2, fontFamily: Typography.body.fontFamily },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', fontFamily: Typography.body.fontFamily },

  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  coverThumb: { width: 72, height: 72, borderRadius: 10 },
  coverLabel: { fontSize: 12, fontFamily: Typography.body.fontFamily },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontFamily: Typography.body.fontFamily },
  noCoverBox: { alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1, gap: 10, marginBottom: 4 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  uploadPreview: { width: 50, height: 50, borderRadius: 8 },
  uploadIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadBtnLabel: { fontSize: 14, fontWeight: '600', fontFamily: Typography.body.fontFamily },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: Typography.body.fontFamily },
  readRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  readLabel: { fontSize: 13, flex: 1, fontFamily: Typography.body.fontFamily },
  readValue: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right', fontFamily: Typography.body.fontFamily },

  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, fontFamily: Typography.body.fontFamily },
  fieldHint: { fontSize: 12, marginBottom: 8, fontFamily: Typography.body.fontFamily },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  dateBtnText: { flex: 1, fontSize: 15, fontFamily: Typography.body.fontFamily },
  textInput: { padding: 14, borderRadius: 14, borderWidth: 1, fontSize: 15, fontFamily: Typography.body.fontFamily },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 16, gap: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: Typography.body.fontFamily },

  dateOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dateCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingBottom: 32 },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  dateCardTitle: { fontSize: 16, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  dateAction: { fontSize: 15, fontWeight: '500', fontFamily: Typography.body.fontFamily },

  summaryCard: { borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16, alignItems: 'center' },
  summaryArt: { width: 80, height: 80, borderRadius: 12, marginBottom: 12 },
  summaryTrack: { fontSize: 18, fontWeight: '700', textAlign: 'center', fontFamily: Typography.body.fontFamily },
  summaryArtist: { fontSize: 13, marginTop: 4, textAlign: 'center', fontFamily: Typography.body.fontFamily },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  summaryKey: { fontSize: 13, fontFamily: Typography.body.fontFamily },
  summaryVal: { fontSize: 13, fontWeight: '600', fontFamily: Typography.body.fontFamily },

  feeCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 24 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  feeLabel: { fontSize: 17, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  feeAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -1, fontFamily: Typography.body.fontFamily },
  feeNote: { fontSize: 13, lineHeight: 20, fontFamily: Typography.body.fontFamily },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18 },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: Typography.body.fontFamily },

  successWrap: { alignItems: 'center', paddingTop: 40 },
  successIcon: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: -0.4, marginBottom: 12, fontFamily: Typography.body.fontFamily },
  successBody: { fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 28, fontFamily: Typography.body.fontFamily },
  successNote: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 28, fontFamily: Typography.body.fontFamily },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 17 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: Typography.body.fontFamily },
});
