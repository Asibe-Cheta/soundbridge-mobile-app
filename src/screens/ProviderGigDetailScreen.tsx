// src/screens/ProviderGigDetailScreen.tsx
// C6 — Provider's view of an urgent gig.
// Entry: deep link from push notification (gig_id in payload).
// States: searching (can accept/decline), waiting (accepted, awaiting selection),
//         confirmed (selected! → links to OpportunityProjectScreen), filled (missed).

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import VerifiedAvatar from '../components/VerifiedAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { urgentGigService } from '../services/UrgentGigService';
import { urgentGigRealtimeService } from '../services/UrgentGigRealtimeService';
import type { UrgentGig } from '../types/urgent-gig.types';

type RouteParams = {
  ProviderGigDetail: {
    gigId: string;
    // Pre-filled from notification payload (optional, saves one API call)
    previewTitle?: string;
    previewAmount?: number;
    previewCurrency?: string;
    previewSkill?: string;
    previewLocation?: string;
    previewDistanceKm?: number;
  };
};

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };
const PLATFORM_FEE_PCT = 0.15;

type ProviderGigState = 'loading' | 'searching' | 'accepted' | 'confirmed' | 'declined' | 'cancelled' | 'filled';

export default function ProviderGigDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'ProviderGigDetail'>>();
  const { gigId, previewTitle, previewAmount, previewCurrency, previewSkill, previewLocation, previewDistanceKm } = route.params;

  const [gig, setGig] = useState<UrgentGig | null>(null);
  const [viewState, setViewState] = useState<ProviderGigState>('loading');
  const [responding, setResponding] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const unsubGigStatus = useRef<(() => void) | null>(null);
  const unsubResponses = useRef<(() => void) | null>(null);

  // ---------------------------------------------------------------------------
  // Load gig
  // ---------------------------------------------------------------------------

  const loadGig = useCallback(async () => {
    try {
      const data = await urgentGigService.getGigDetails(gigId);
      setGig(data);
      deriveState(data);
    } catch (err) {
      console.error('ProviderGigDetailScreen load error:', err);
    }
  }, [gigId]);

  function deriveState(data: UrgentGig) {
    switch (data.urgent_status) {
      case 'searching':
        setViewState('searching');
        break;
      case 'confirmed':
      case 'completed': {
        // Only show "you were selected" if this user is the selected provider
        const isSelected = data.selected_provider_id != null && data.selected_provider_id === user?.id;
        setViewState(isSelected ? 'confirmed' : 'filled');
        if (isSelected && data.project_id) {
          setProjectId(data.project_id);
        }
        break;
      }
      case 'cancelled':
        setViewState('cancelled');
        break;
      default:
        setViewState('searching');
        break;
    }
  }

  useEffect(() => {
    loadGig();
  }, [loadGig]);

  // ---------------------------------------------------------------------------
  // Realtime: watch gig status + count accepted responses
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Gig status changes (confirmed / cancelled)
    unsubGigStatus.current = urgentGigRealtimeService.subscribeToGigStatus(
      gigId,
      (updated) => {
        if (updated.urgent_status === 'confirmed') {
          // Check if we're the selected provider
          // We'll reload to get full data including selected_provider_id
          loadGig();
        } else if (updated.urgent_status === 'cancelled') {
          setViewState('cancelled');
        }
      }
    );

    // Watch gig_responses to count how many accepted (shows "3 accepted, awaiting selection")
    unsubResponses.current = urgentGigRealtimeService.subscribeToGigResponses(
      gigId,
      (_newResp) => setAcceptedCount(c => c + 1),
      (_updResp) => {} // We don't need to track updates here
    );

    return () => {
      if (unsubGigStatus.current) unsubGigStatus.current();
      if (unsubResponses.current) unsubResponses.current();
    };
  }, [gigId, loadGig]);

  // ---------------------------------------------------------------------------
  // Accept / Decline
  // ---------------------------------------------------------------------------

  const handleAccept = useCallback(() => {
    Alert.alert(
      'Accept this gig?',
      'The requester will see your profile and may select you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setResponding(true);
            try {
              await urgentGigService.respondToGig(gigId, 'accept');
              setViewState('accepted');
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not accept gig. Please try again.');
            } finally {
              setResponding(false);
            }
          },
        },
      ]
    );
  }, [gigId]);

  const handleDecline = useCallback(() => {
    Alert.alert(
      'Decline this gig?',
      "You won't be considered for this gig.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setResponding(true);
            try {
              await urgentGigService.respondToGig(gigId, 'decline');
              setViewState('declined');
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not decline gig.');
            } finally {
              setResponding(false);
            }
          },
        },
      ]
    );
  }, [gigId]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const sym = CURRENCY_SYMBOLS[gig?.payment_currency ?? previewCurrency ?? 'GBP'] ?? '£';
  const amount = gig?.payment_amount ?? previewAmount ?? 0;
  const creatorReceives = +(amount * (1 - PLATFORM_FEE_PCT)).toFixed(2);

  function formatDateTime(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${time}`;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${time}`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const s = buildStyles(theme);

  if (viewState === 'loading') {
    return (
      <LinearGradient colors={theme.isDark ? ['#0F0F1A', '#1A0A2E'] : ['#F8F4FF', '#EEE8FF']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.isDark ? ['#0F0F1A', '#1A0A2E', '#0D1117'] : ['#F8F4FF', '#EEE8FF', '#F0EBFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <BackButton />
          <View style={s.urgentBadge}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={s.urgentBadgeText}>URGENT GIG</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── DECLINED / CANCELLED ──────────────────────────────── */}
          {(viewState === 'declined' || viewState === 'cancelled') && (
            <View style={s.stateCard}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
              <Text style={[s.stateTitle, { color: theme.colors.text }]}>
                {viewState === 'declined' ? 'You declined this gig' : 'This gig was cancelled'}
              </Text>
              <Text style={[s.stateSub, { color: theme.colors.textSecondary }]}>
                {viewState === 'declined'
                  ? 'Keep your availability on to get the next one!'
                  : 'The requester cancelled or no one responded in time.'}
              </Text>
              <TouchableOpacity
                style={s.ghostBtn}
                onPress={() => navigation.navigate('ProviderAvailability' as never)}
              >
                <Text style={[s.ghostBtnText, { color: theme.colors.primary }]}>Check your availability settings</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── FILLED (selected another provider) ───────────────── */}
          {viewState === 'filled' && (
            <View style={s.stateCard}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
              <Text style={[s.stateTitle, { color: theme.colors.text }]}>This gig was filled</Text>
              <Text style={[s.stateSub, { color: theme.colors.textSecondary }]}>
                Another musician was selected. Keep your availability on to get the next one!
              </Text>
            </View>
          )}

          {/* ── CONFIRMED — you were selected ───────────────────── */}
          {viewState === 'confirmed' && (
            <View style={[s.stateCard, { backgroundColor: '#10B98110', borderColor: '#10B981' }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
              <Text style={[s.stateTitle, { color: '#10B981' }]}>You've been selected!</Text>
              <Text style={[s.stateSub, { color: theme.colors.textSecondary }]}>
                {gig?.title ?? previewTitle}{'\n'}
                {gig?.location_address ?? previewLocation}{'\n'}
                {sym}{creatorReceives.toFixed(2)} after platform fee
              </Text>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={() => navigation.navigate('OpportunityProject' as never, { projectId } as never)}
              >
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.confirmBtnGrad}>
                  <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                  <Text style={s.confirmBtnText}>View Gig Project</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── ACCEPTED — waiting for selection ────────────────── */}
          {viewState === 'accepted' && (
            <View style={[s.stateCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B' }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>⏳</Text>
              <Text style={[s.stateTitle, { color: '#F59E0B' }]}>You've accepted!</Text>
              <Text style={[s.stateSub, { color: theme.colors.textSecondary }]}>
                Waiting for the requester to review applicants and select one.
                {acceptedCount > 1 && ` ${acceptedCount} musicians accepted so far.`}
              </Text>
            </View>
          )}

          {/* ── SEARCHING — gig details + accept/decline ─────────── */}
          {viewState === 'searching' && (
            <>
              {/* Payment hero */}
              <View style={s.paymentHero}>
                <Text style={[s.paymentAmount, { color: theme.colors.text }]}>
                  {sym}{amount.toFixed(2)}
                </Text>
                <Text style={[s.paymentSub, { color: theme.colors.textSecondary }]}>
                  You receive {sym}{creatorReceives.toFixed(2)} after 15% platform fee
                </Text>
              </View>

              {/* Detail chips */}
              <View style={s.detailRow}>
                {(gig?.skill_required ?? previewSkill) && (
                  <View style={[s.detailChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Ionicons name="musical-note" size={14} color={theme.colors.primary} />
                    <Text style={[s.detailChipText, { color: theme.colors.text }]}>
                      {(gig?.skill_required ?? previewSkill)!.charAt(0).toUpperCase() + (gig?.skill_required ?? previewSkill)!.slice(1)}
                    </Text>
                  </View>
                )}
                {(gig?.genre ?? []).length > 0 && (
                  <View style={[s.detailChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[s.detailChipText, { color: theme.colors.text }]}>
                      {(gig!.genre).join(' · ')}
                    </Text>
                  </View>
                )}
                {(gig?.distance_km ?? previewDistanceKm) != null && (
                  <View style={[s.detailChip, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
                    <Ionicons name="location" size={14} color="#10B981" />
                    <Text style={[s.detailChipText, { color: '#10B981' }]}>
                      {(gig?.distance_km ?? previewDistanceKm)!.toFixed(1)} km away
                    </Text>
                  </View>
                )}
              </View>

              {/* Info card */}
              <View style={[s.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {gig?.date_needed && (
                  <View style={s.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                    <Text style={[s.infoText, { color: theme.colors.text }]}>
                      {formatDateTime(gig.date_needed)}
                    </Text>
                  </View>
                )}
                {gig?.duration_hours && (
                  <View style={s.infoRow}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                    <Text style={[s.infoText, { color: theme.colors.text }]}>
                      {gig.duration_hours} hours
                    </Text>
                  </View>
                )}
                {(gig?.location_address ?? previewLocation) && (
                  <View style={s.infoRow}>
                    <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                    <Text style={[s.infoText, { color: theme.colors.text }]}>
                      {gig?.location_address ?? previewLocation}
                    </Text>
                  </View>
                )}
                {gig?.description && (
                  <View style={[s.infoRow, { alignItems: 'flex-start' }]}>
                    <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
                    <Text style={[s.infoText, { color: theme.colors.textSecondary, flex: 1 }]}>
                      {gig.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Requester info */}
              {gig?.requester && (
                <View style={[s.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Posted by</Text>
                  <View style={s.requesterRow}>
                    <VerifiedAvatar
                      avatarUrl={gig.requester.avatar_url}
                      isVerified={gig.requester.is_verified}
                      size={40}
                      fallbackIconSize={18}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.requesterName, { color: theme.colors.text }]}>
                        {gig.requester.display_name}
                      </Text>
                      {gig.requester.rating != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={[s.requesterRating, { color: theme.colors.textSecondary }]}>
                            {gig.requester.rating.toFixed(1)}
                            {gig.requester.review_count != null && ` (${gig.requester.review_count})`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.declineBtn, { borderColor: '#EF4444', opacity: responding ? 0.6 : 1 }]}
                  onPress={handleDecline}
                  disabled={responding}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <Text style={[s.declineBtnText, { color: '#EF4444' }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.acceptBtn, { opacity: responding ? 0.6 : 1 }]}
                  onPress={handleAccept}
                  disabled={responding}
                >
                  <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.acceptBtnGrad}>
                    {responding
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={s.acceptBtnText}>Accept Gig</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Message button */}
              <TouchableOpacity
                style={[s.messageBtn, { borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('Chat' as never, { targetUserId: gig?.created_by } as never)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.primary} />
                <Text style={[s.messageBtnText, { color: theme.colors.primary }]}>Send a Message</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const buildStyles = (theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC262620',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // State cards
  stateCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  stateSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ghostBtn: {
    paddingVertical: 8,
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  confirmBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Searching view
  paymentHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentAmount: {
    fontSize: 48,
    fontWeight: '900',
  },
  paymentSub: {
    fontSize: 13,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requesterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  requesterAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
  },
  requesterRating: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
