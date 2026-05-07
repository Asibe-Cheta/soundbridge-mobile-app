// src/screens/CreateUrgentGigScreen.tsx
// C3 — 3-step form: Details → Payment → Searching.
// Step 1: skill, genre, date/time, duration, location, radius, payment.
// Step 2: Summary + Stripe Payment Sheet.
// Step 3: Animated searching state with realtime status updates.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import { config } from '../config/environment';
import { urgentGigService } from '../services/UrgentGigService';
import { urgentGigRealtimeService } from '../services/UrgentGigRealtimeService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILLS = [
  'Trumpeter', 'Vocalist', 'Drummer', 'DJ', 'Sound Engineer',
  'Pianist', 'Guitarist', 'Bassist', 'Violinist', 'Saxophonist',
  'Vocal Coach', 'Music Producer', 'Choir Director', 'Percussionist',
  'Backing Singer', 'MC / Host', 'Flautist', 'Cellist', 'Keyboardist',
  'Harpist', 'Trombonist', 'French Horn', 'Oboist', 'Clarinettist', 'Other',
];

const GENRES = [
  'Gospel', 'Jazz', 'R&B', 'Classical', 'Afrobeats', 'Hip-Hop',
  'Pop', 'Rock', 'Soul', 'Country', 'Worship', 'Latin', 'Electronic', 'Other',
];

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];
const CURRENCY_OPTIONS = ['GBP', 'USD', 'EUR', 'NGN'];
const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };
const PLATFORM_FEE_PCT = 0.15;

// Durations in hours (0.5-step slider handled as index)
const DURATIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateUrgentGigScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 state ──
  const [skill, setSkill] = useState('');
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dateNeeded, setDateNeeded] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time'>('date');
  const [showIosDTPicker, setShowIosDTPicker] = useState(false);
  const [durationIdx, setDurationIdx] = useState(3); // 2h default
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(20);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [description, setDescription] = useState('');

  // ── Step 2 state ──
  const [creatingGig, setCreatingGig] = useState(false);
  const [gigId, setGigId] = useState<string | null>(null);

  // ── Step 3 state ──
  const [estimatedMatches, setEstimatedMatches] = useState(0);
  const [gigStatus, setGigStatus] = useState<string>('searching');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Realtime cleanup ──
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // ── Pulse animation for step 3 ──
  useEffect(() => {
    if (step !== 3) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [step]);

  // ── Realtime subscription on step 3 ──
  useEffect(() => {
    if (step !== 3 || !gigId) return;

    unsubRef.current = urgentGigRealtimeService.subscribeToGigStatus(gigId, (updated) => {
      if (updated.urgent_status) setGigStatus(updated.urgent_status);
    });
  }, [step, gigId]);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validateStep1(): string | null {
    if (!skill) return 'Please select a skill.';
    if (!dateNeeded || dateNeeded < new Date(Date.now() + 60 * 60 * 1000)) {
      return 'Date & time must be at least 1 hour in the future.';
    }
    if (!locationAddress.trim()) return 'Please enter a location.';
    if (locationLat == null || locationLng == null) {
      return 'Please select a location from the suggestions.';
    }
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) return 'Please enter a valid payment amount.';
    return null;
  }

  // ---------------------------------------------------------------------------
  // Step 1 → Step 2
  // ---------------------------------------------------------------------------

  function handleContinueToPayment() {
    const error = validateStep1();
    if (error) {
      Alert.alert('Missing info', error);
      return;
    }
    setStep(2);
  }

  // ---------------------------------------------------------------------------
  // Step 2 → create gig + Stripe Payment Sheet → Step 3
  // ---------------------------------------------------------------------------

  const handleConfirmAndPay = useCallback(async () => {
    setCreatingGig(true);
    let gig_id: string;
    let stripe_client_secret: string;
    let estimated: number;
    let customer_id: string | undefined;
    let ephemeral_key_secret: string | undefined;

    try {
      const result = await urgentGigService.createUrgentGig({
        skill_required: skill.toLowerCase(),
        date_needed: dateNeeded.toISOString(),
        payment_amount: parseFloat(paymentAmount),
        payment_currency: currency,
        location_lat: locationLat!,
        location_lng: locationLng!,
        location_address: locationAddress.trim(),
        genre: selectedGenres,
        duration_hours: DURATIONS[durationIdx],
        location_radius_km: radiusKm,
        description: description.trim() || undefined,
        title: `${skill} Needed`,
      });
      gig_id = result.gig_id;
      stripe_client_secret = result.stripe_client_secret;
      estimated = result.estimated_matches;
      customer_id = result.customer_id;
      ephemeral_key_secret = result.ephemeral_key_secret;
    } catch (err: any) {
      setCreatingGig(false);
      Alert.alert('Error', err?.message ?? 'Failed to create gig. Please try again.');
      return;
    }

    // Initialise Stripe Payment Sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'SoundBridge',
      paymentIntentClientSecret: stripe_client_secret,
      ...(customer_id && ephemeral_key_secret
        ? { customerId: customer_id, customerEphemeralKeySecret: ephemeral_key_secret }
        : {}),
      defaultBillingDetails: {
        name: user?.display_name || user?.email || undefined,
        email: user?.email || undefined,
      },
    });

    if (initError) {
      setCreatingGig(false);
      Alert.alert('Payment Error', initError.message);
      return;
    }

    // Present Payment Sheet
    const { error: presentError } = await presentPaymentSheet();
    setCreatingGig(false);

    if (presentError) {
      if (presentError.code !== 'Canceled') {
        Alert.alert('Payment Failed', presentError.message);
      }
      return;
    }

    // Payment sheet succeeded — immediately call backend to confirm payment.
    // This advances payment_status → 'escrowed' and urgent_status → 'searching',
    // and sends push notifications to matched providers.
    // Belt-and-suspenders alongside the Stripe webhook.
    try {
      await urgentGigService.confirmPayment(gig_id);
    } catch {
      // Webhook will handle it if this call fails. Move to searching UI regardless.
    }

    setGigId(gig_id);
    setEstimatedMatches(estimated);
    setStep(3);
  }, [skill, dateNeeded, paymentAmount, currency, locationLat, locationLng,
      locationAddress, selectedGenres, durationIdx, radiusKm, description,
      initPaymentSheet, presentPaymentSheet]);

  // ---------------------------------------------------------------------------
  // Genre toggle
  // ---------------------------------------------------------------------------

  function toggleGenre(genre: string) {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }

  // ---------------------------------------------------------------------------
  // Date/time picker helpers
  // ---------------------------------------------------------------------------

  function onDateChange(_: any, date?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setDateNeeded(prev => {
          const next = new Date(date);
          next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
          return next;
        });
        setShowTimePicker(true);
      }
    } else if (date) {
      setDateNeeded(prev => {
        const next = new Date(date);
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  function onTimeChange(_: any, date?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setDateNeeded(prev => {
        const next = new Date(prev);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const amount = parseFloat(paymentAmount) || 0;
  const platformFee = +(amount * PLATFORM_FEE_PCT).toFixed(2);
  const creatorReceives = +(amount - platformFee).toFixed(2);
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;

  function formatDate(d: Date) {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const s = buildStyles(theme);

  return (
    <LinearGradient
      colors={theme.isDark ? ['#0F0F1A', '#1A0A2E', '#0D1117'] : ['#F8F4FF', '#EEE8FF', '#F0EBFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          {step === 1
            ? <BackButton />
            : <TouchableOpacity onPress={() => step === 2 ? setStep(1) : null} style={s.backBtn}>
                {step === 2 && <Ionicons name="arrow-back" size={22} color={theme.colors.text} />}
              </TouchableOpacity>
          }
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>
            {step === 1 ? 'Gig Details' : step === 2 ? 'Confirm & Pay' : 'Finding Musicians'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {([1, 2, 3] as const).map(n => (
            <View key={n} style={[s.stepDot, step >= n && s.stepDotActive, { backgroundColor: step >= n ? theme.colors.primary : theme.colors.border }]} />
          ))}
        </View>

        {/* ── STEP 1: Details ──────────────────────────────────────────── */}
        {step === 1 && (
          <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Skill */}
            <Text style={s.label(theme)}>Skill Needed *</Text>
            <TouchableOpacity
              style={s.selector(theme)}
              onPress={() => setShowSkillPicker(true)}
            >
              <Text style={[s.selectorText, { color: skill ? theme.colors.text : theme.colors.textSecondary }]}>
                {skill || 'Select a skill…'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Genre chips */}
            <Text style={s.label(theme)}>Genre (optional)</Text>
            <View style={s.chipRow}>
              {GENRES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.chip, { backgroundColor: selectedGenres.includes(g) ? theme.colors.primary : theme.colors.card, borderColor: selectedGenres.includes(g) ? theme.colors.primary : theme.colors.border }]}
                  onPress={() => toggleGenre(g)}
                >
                  <Text style={[s.chipText, { color: selectedGenres.includes(g) ? '#fff' : theme.colors.textSecondary }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date & Time */}
            <Text style={s.label(theme)}>Date & Time *</Text>
            <View style={s.rowGap}>
              <TouchableOpacity
                style={[s.selector(theme), { flex: 1 }]}
                onPress={() => Platform.OS === 'ios' ? (setIosPickerMode('date'), setShowIosDTPicker(true)) : setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                <Text style={[s.selectorText, { color: theme.colors.text, marginLeft: 6 }]}>{formatDate(dateNeeded)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.selector(theme), { flex: 1 }]}
                onPress={() => Platform.OS === 'ios' ? (setIosPickerMode('time'), setShowIosDTPicker(true)) : setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <Text style={[s.selectorText, { color: theme.colors.text, marginLeft: 6 }]}>{formatTime(dateNeeded)}</Text>
              </TouchableOpacity>
            </View>

            {/* Android date/time pickers (render when active) */}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker value={dateNeeded} mode="date" minimumDate={new Date()} display="default" onChange={onDateChange} />
            )}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker value={dateNeeded} mode="time" is24Hour display="default" onChange={onTimeChange} />
            )}

            {/* Duration */}
            <Text style={s.label(theme)}>Duration</Text>
            <View style={s.durationRow}>
              <TouchableOpacity onPress={() => setDurationIdx(i => Math.max(0, i - 1))} style={[s.stepBtn, { borderColor: theme.colors.border }]}>
                <Ionicons name="remove" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[s.durationText, { color: theme.colors.text }]}>
                {DURATIONS[durationIdx]} {DURATIONS[durationIdx] === 1 ? 'hour' : 'hours'}
              </Text>
              <TouchableOpacity onPress={() => setDurationIdx(i => Math.min(DURATIONS.length - 1, i + 1))} style={[s.stepBtn, { borderColor: theme.colors.border }]}>
                <Ionicons name="add" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Location */}
            <Text style={s.label(theme)}>Location *</Text>
            <View style={{ zIndex: 1000 }}>
              {config.googlePlacesApiKey ? (
                <GooglePlacesAutocomplete
                  placeholder="Search venue or address…"
                  onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
                    setLocationAddress(data.description);
                    if (details?.geometry?.location) {
                      setLocationLat(details.geometry.location.lat);
                      setLocationLng(details.geometry.location.lng);
                    } else if (data.place_id) {
                      // Fetch coords manually if library didn't return details
                      fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${data.place_id}&fields=geometry&key=${config.googlePlacesApiKey}`)
                        .then(r => r.json())
                        .then(json => {
                          const loc = json.result?.geometry?.location;
                          if (loc) { setLocationLat(loc.lat); setLocationLng(loc.lng); }
                        })
                        .catch(() => {});
                    }
                  }}
                  query={{ key: config.googlePlacesApiKey, language: 'en' }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  debounce={300}
                  minLength={2}
                  GooglePlacesDetailsQuery={{ fields: 'geometry' }}
                  styles={{
                    container: { flex: 0, zIndex: 1000 },
                    textInputContainer: { backgroundColor: 'transparent' },
                    textInput: {
                      height: 48,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    listView: {
                      backgroundColor: theme.colors.card,
                      borderRadius: 10,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      zIndex: 1001,
                      elevation: 5,
                    },
                    row: { backgroundColor: theme.colors.card, padding: 14, minHeight: 44 },
                    separator: { height: 1, backgroundColor: theme.colors.border },
                    description: { color: theme.colors.text, fontSize: 14 },
                    poweredContainer: { display: 'none' },
                  }}
                  textInputProps={{ placeholderTextColor: theme.colors.textSecondary }}
                  listViewDisplayed="auto"
                  disableScroll={true}
                />
              ) : (
                <TextInput
                  style={s.input(theme)}
                  placeholder="Enter venue or address…"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={locationAddress}
                  onChangeText={(t) => { setLocationAddress(t); setLocationLat(null); setLocationLng(null); }}
                  returnKeyType="done"
                />
              )}
            </View>

            {/* Radius */}
            <Text style={s.label(theme)}>Search Radius</Text>
            <View style={s.chipRow}>
              {RADIUS_OPTIONS.map(km => (
                <TouchableOpacity
                  key={km}
                  style={[s.chip, { backgroundColor: radiusKm === km ? theme.colors.primary : theme.colors.card, borderColor: radiusKm === km ? theme.colors.primary : theme.colors.border }]}
                  onPress={() => setRadiusKm(km)}
                >
                  <Text style={[s.chipText, { color: radiusKm === km ? '#fff' : theme.colors.textSecondary }]}>{km} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment */}
            <Text style={s.label(theme)}>Payment Amount *</Text>
            <View style={s.rowGap}>
              <TouchableOpacity
                style={[s.selector(theme), { width: 90 }]}
                onPress={() => {
                  const idx = CURRENCY_OPTIONS.indexOf(currency);
                  setCurrency(CURRENCY_OPTIONS[(idx + 1) % CURRENCY_OPTIONS.length]);
                }}
              >
                <Text style={[s.selectorText, { color: theme.colors.text, fontWeight: '600' }]}>{currency}</Text>
                <Ionicons name="swap-vertical" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[s.input(theme), { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
            </View>

            {/* Description */}
            <Text style={s.label(theme)}>Description (optional)</Text>
            <TextInput
              style={[s.input(theme), { height: 80, textAlignVertical: 'top' }]}
              placeholder="Any extra details for musicians…"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={500}
              value={description}
              onChangeText={setDescription}
            />

            {/* Continue */}
            <TouchableOpacity style={s.primaryBtn} onPress={handleContinueToPayment} activeOpacity={0.85}>
              <LinearGradient colors={['#DC2626', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
                <Text style={s.primaryBtnText}>Continue →</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ── STEP 2: Confirm & Pay ─────────────────────────────────── */}
        {step === 2 && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Summary card */}
            <View style={[s.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Skill</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]}>{skill}</Text>
              </View>
              {selectedGenres.length > 0 && (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Genre</Text>
                  <Text style={[s.summaryValue, { color: theme.colors.text }]}>{selectedGenres.join(', ')}</Text>
                </View>
              )}
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>When</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]}>{formatDate(dateNeeded)} at {formatTime(dateNeeded)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]}>{DURATIONS[durationIdx]} hours</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Location</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]} numberOfLines={2}>{locationAddress}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Radius</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]}>{radiusKm} km</Text>
              </View>
            </View>

            {/* Payment breakdown */}
            <View style={[s.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Gig payment</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text }]}>{sym}{amount.toFixed(2)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.textSecondary }]}>Platform fee (12%)</Text>
                <Text style={[s.summaryValue, { color: theme.colors.textSecondary }]}>-{sym}{platformFee.toFixed(2)}</Text>
              </View>
              <View style={[s.summaryRow, s.summaryDivider, { borderTopColor: theme.colors.border }]}>
                <Text style={[s.summaryLabel, { color: theme.colors.text, fontWeight: '700' }]}>Creator receives</Text>
                <Text style={[s.summaryValue, { color: '#10B981', fontWeight: '700', fontSize: 18 }]}>{sym}{creatorReceives.toFixed(2)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: theme.colors.text, fontWeight: '700' }]}>You pay today</Text>
                <Text style={[s.summaryValue, { color: theme.colors.text, fontWeight: '700', fontSize: 18 }]}>{sym}{amount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={[s.escrowNote, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Ionicons name="lock-closed" size={16} color="#92400E" />
              <Text style={[s.escrowText, { color: '#92400E' }]}>
                Payment is held securely in escrow until you confirm the gig is complete.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, creatingGig && { opacity: 0.6 }]}
              onPress={handleConfirmAndPay}
              disabled={creatingGig}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#DC2626', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
                {creatingGig
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="card" size={18} color="#fff" />
                      <Text style={s.primaryBtnText}>Confirm & Pay {sym}{amount.toFixed(2)}</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ── STEP 3: Searching ──────────────────────────────────────── */}
        {step === 3 && (
          <View style={s.searchingContainer}>
            {/* Pulse circle */}
            <Animated.View style={[s.pulseOuter, { transform: [{ scale: pulseAnim }], borderColor: '#DC2626' + '40' }]}>
              <View style={[s.pulseInner, { backgroundColor: '#DC2626' + '20' }]}>
                <Text style={{ fontSize: 52 }}>🔍</Text>
              </View>
            </Animated.View>

            {gigStatus === 'searching' && (
              <>
                <Text style={[s.searchTitle, { color: theme.colors.text }]}>
                  Finding {skill}s near you…
                </Text>
                {estimatedMatches > 0 && (
                  <Text style={[s.searchSub, { color: '#10B981' }]}>
                    ✅ Notified {estimatedMatches} musicians nearby
                  </Text>
                )}
                <Text style={[s.searchSub, { color: theme.colors.textSecondary }]}>
                  Accepting responses now — usually fills in minutes
                </Text>
              </>
            )}

            {gigStatus === 'confirmed' && (
              <Text style={[s.searchTitle, { color: '#10B981' }]}>
                🎉 A musician has been selected!
              </Text>
            )}

            {(gigStatus === 'cancelled') && (
              <Text style={[s.searchTitle, { color: '#EF4444' }]}>
                No one responded in time. Your payment has been refunded.
              </Text>
            )}

            <View style={s.searchActions}>
              {gigStatus === 'searching' && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => navigation.navigate('UrgentGigResponses' as never, { gigId } as never)}
                >
                  <LinearGradient colors={['#DC2626', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
                    <Text style={s.primaryBtnText}>View Responses</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {gigStatus === 'confirmed' && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => navigation.navigate('UrgentGigResponses' as never, { gigId } as never)}
                >
                  <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
                    <Text style={s.primaryBtnText}>View Gig</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.cancelGigBtn, { borderColor: theme.colors.border }]}
                onPress={() => Alert.alert('Cancel Gig', 'Cancel this gig? Your payment will be refunded.', [
                  { text: 'Keep Gig', style: 'cancel' },
                  { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
                ])}
              >
                <Text style={[s.cancelGigText, { color: theme.colors.textSecondary }]}>Cancel Gig</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* ── Skill picker modal ───────────────────────────── */}
      <Modal visible={showSkillPicker} transparent animationType="slide" onRequestClose={() => setShowSkillPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.colors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.colors.text }]}>Select Skill</Text>
              <TouchableOpacity onPress={() => setShowSkillPicker(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SKILLS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, { borderBottomColor: theme.colors.border }, skill === item && { backgroundColor: theme.colors.primary + '15' }]}
                  onPress={() => { setSkill(item); setShowSkillPicker(false); }}
                >
                  <Text style={[s.modalItemText, { color: theme.colors.text }, skill === item && { color: theme.colors.primary, fontWeight: '600' }]}>
                    {item}
                  </Text>
                  {skill === item && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── iOS Date/Time picker modal ───────────────────── */}
      {Platform.OS === 'ios' && (
        <Modal visible={showIosDTPicker} transparent animationType="slide" onRequestClose={() => setShowIosDTPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.iosPickerSheet, { backgroundColor: theme.colors.card }]}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setShowIosDTPicker(false)}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[s.modalTitle, { color: theme.colors.text }]}>
                  {iosPickerMode === 'date' ? 'Select Date' : 'Select Time'}
                </Text>
                <TouchableOpacity onPress={() => setShowIosDTPicker(false)}>
                  <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateNeeded}
                mode={iosPickerMode}
                minimumDate={iosPickerMode === 'date' ? new Date() : undefined}
                is24Hour
                display="spinner"
                onChange={iosPickerMode === 'date' ? onDateChange : onTimeChange}
                style={{ height: 200 }}
                textColor={theme.colors.text}
              />
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const buildStyles = (theme: any) => ({
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {},
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  label: (t: any) => ({
    fontSize: 13,
    fontWeight: '600' as const,
    color: t.colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
  }),
  selector: (t: any) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
  }),
  selectorText: {
    fontSize: 15,
    flex: 1,
  },
  input: (t: any) => ({
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: t.colors.text,
  }),
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  rowGap: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  durationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '700' as const,
    minWidth: 90,
    textAlign: 'center' as const,
  },
  locRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  locBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryBtn: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  primaryBtnGrad: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  // Step 2 summary
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 6,
  },
  summaryDivider: {
    borderTopWidth: StyleSheet.hairlineWidth as unknown as number,
    marginTop: 6,
    paddingTop: 12,
  },
  summaryLabel: {
    fontSize: 14,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1.5,
  },
  escrowNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  escrowText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  // Step 3
  searchingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
  },
  pulseOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 32,
  },
  pulseInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  searchTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  searchSub: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 6,
    lineHeight: 20,
  },
  searchActions: {
    width: '100%' as const,
    marginTop: 32,
    gap: 12,
  },
  secondaryBtn: {
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  cancelGigBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center' as const,
  },
  cancelGigText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%' as const,
    paddingBottom: 30,
  },
  iosPickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth as unknown as number,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth as unknown as number,
  },
  modalItemText: {
    fontSize: 15,
  },
});
