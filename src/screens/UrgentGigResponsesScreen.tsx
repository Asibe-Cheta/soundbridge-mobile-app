// src/screens/UrgentGigResponsesScreen.tsx
// C4 — Requester views provider responses in real time.
// Supabase Realtime subscription on gig_responses.
// Sort tabs: Distance · Rating · Price

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import VerifiedAvatar from '../components/VerifiedAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { urgentGigService } from '../services/UrgentGigService';
import { urgentGigRealtimeService } from '../services/UrgentGigRealtimeService';
import type { UrgentGig, GigResponse } from '../types/urgent-gig.types';

type RouteParams = {
  UrgentGigResponses: {
    gigId: string;
  };
};

type SortMode = 'distance' | 'rating' | 'price';

const STATUS_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  accepted:  { icon: 'checkmark-circle',  color: '#10B981', label: 'ACCEPTED' },
  pending:   { icon: 'time',              color: '#F59E0B', label: 'Viewing...' },
  declined:  { icon: 'close-circle',      color: '#EF4444', label: 'DECLINED' },
  expired:   { icon: 'alert-circle',      color: '#6B7280', label: 'EXPIRED' },
};

export default function UrgentGigResponsesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'UrgentGigResponses'>>();
  const { gigId } = route.params;

  const [gig, setGig] = useState<UrgentGig | null>(null);
  const [responses, setResponses] = useState<GigResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [selecting, setSelecting] = useState<string | null>(null); // responseId being selected

  // Countdown
  const [timeLeft, setTimeLeft] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [gigData, responsesData] = await Promise.all([
        urgentGigService.getGigDetails(gigId),
        urgentGigService.getGigResponses(gigId),
      ]);
      setGig(gigData);
      setResponses(responsesData);
    } catch (err: any) {
      console.error('UrgentGigResponsesScreen load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gigId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Realtime subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    unsubRef.current = urgentGigRealtimeService.subscribeToGigResponses(
      gigId,
      // INSERT: new provider accepted
      (newResponse) => {
        setResponses(prev => {
          const exists = prev.find(r => r.id === newResponse.id);
          if (exists) return prev;
          return [newResponse, ...prev];
        });
      },
      // UPDATE: status changed (e.g. accepted → expired)
      (updatedResponse) => {
        setResponses(prev =>
          prev.map(r => r.id === updatedResponse.id ? { ...r, ...updatedResponse } : r)
        );
      }
    );

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [gigId]);

  // ---------------------------------------------------------------------------
  // Countdown timer (updates every 30s)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function tick() {
      if (!gig?.expires_at) return;
      const diff = new Date(gig.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gig?.expires_at]);

  // ---------------------------------------------------------------------------
  // Sort
  // ---------------------------------------------------------------------------

  const sorted = [...responses].sort((a, b) => {
    if (sortMode === 'distance') {
      return (a.provider?.distance_km ?? 999) - (b.provider?.distance_km ?? 999);
    }
    if (sortMode === 'rating') {
      return (b.provider?.rating ?? 0) - (a.provider?.rating ?? 0);
    }
    if (sortMode === 'price') {
      const aPrice = a.provider?.per_gig_rate ?? a.provider?.hourly_rate ?? 999999;
      const bPrice = b.provider?.per_gig_rate ?? b.provider?.hourly_rate ?? 999999;
      return aPrice - bPrice;
    }
    return 0;
  });

  const acceptedResponses = sorted.filter(r => r.status === 'accepted');

  // ---------------------------------------------------------------------------
  // Select provider
  // ---------------------------------------------------------------------------

  const handleSelect = useCallback((response: GigResponse) => {
    if (!response.provider) return;
    const name = response.provider.display_name;
    Alert.alert(
      `Select ${name}?`,
      'They will be notified immediately. Other applicants will be declined.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Selection',
          style: 'default',
          onPress: async () => {
            setSelecting(response.id);
            try {
              const result = await urgentGigService.selectProvider(gigId, response.id);
              navigation.navigate('UrgentGigConfirmation' as never, {
                gigId,
                projectId: result.project_id,
                providerName: name,
                providerAvatar: response.provider?.avatar_url,
                gigTitle: gig?.title ?? 'Urgent Gig',
                gigDateTime: gig?.date_needed,
                gigLocation: gig?.location_address,
                paymentAmount: gig?.payment_amount,
                currency: gig?.payment_currency ?? 'GBP',
              } as never);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to select provider.');
            } finally {
              setSelecting(null);
            }
          },
        },
      ]
    );
  }, [gigId, gig, navigation]);

  // ---------------------------------------------------------------------------
  // Render response card
  // ---------------------------------------------------------------------------

  const renderResponse = useCallback(({ item: r }: { item: GigResponse }) => {
    const p = r.provider;
    const statusInfo = STATUS_ICONS[r.status] ?? STATUS_ICONS.pending;
    const isSelecting = selecting === r.id;

    return (
      <View style={[styles.responseCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardTop}>
          {/* Avatar */}
          <VerifiedAvatar
            avatarUrl={p?.avatar_url}
            isVerified={p?.is_verified}
            size={44}
            fallbackIconSize={20}
          />

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={[styles.providerName, { color: theme.colors.text }]} numberOfLines={1}>
              {p?.display_name ?? 'Unknown'}
            </Text>
            {p?.headline && (
              <Text style={[styles.providerHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {p.headline}
              </Text>
            )}
            <View style={styles.metaRow}>
              {p?.rating != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {p.rating.toFixed(1)}
                    {p.review_count != null && ` (${p.review_count})`}
                  </Text>
                </View>
              )}
              {p?.distance_km != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.primary} />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {p.distance_km.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
            {/* Rate */}
            {(p?.per_gig_rate != null || p?.hourly_rate != null) && (
              <Text style={[styles.rateText, { color: theme.colors.text }]}>
                {p.per_gig_rate != null ? `£${p.per_gig_rate}/gig` : ''}
                {p.per_gig_rate != null && p.hourly_rate != null ? ' · ' : ''}
                {p.hourly_rate != null ? `£${p.hourly_rate}/hr` : ''}
              </Text>
            )}
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Message */}
        {r.message ? (
          <Text style={[styles.messageText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            "{r.message}"
          </Text>
        ) : null}

        {/* Actions */}
        {r.status === 'accepted' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.profileBtn, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('CreatorProfile' as never, { userId: p?.id } as never)}
            >
              <Text style={[styles.profileBtnText, { color: theme.colors.text }]}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectBtn, isSelecting && { opacity: 0.6 }]}
              onPress={() => handleSelect(r)}
              disabled={isSelecting}
            >
              <LinearGradient colors={['#DC2626', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.selectBtnGrad}>
                {isSelecting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.selectBtnText}>Select →</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [theme, selecting, handleSelect, navigation]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
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
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {gig?.title ?? 'Responses'}
            </Text>
            {timeLeft ? (
              <Text style={[styles.headerSub, { color: timeLeft === 'Expired' ? '#EF4444' : '#F59E0B' }]}>
                {timeLeft === 'Expired' ? '⏰ Gig expired' : `⏰ Expires in ${timeLeft}`}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => { setRefreshing(true); loadData(); }}
          >
            <Ionicons name="refresh" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Sort tabs */}
        <View style={[styles.sortRow, { borderBottomColor: theme.colors.border }]}>
          {(['distance', 'rating', 'price'] as SortMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortTab, sortMode === mode && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setSortMode(mode)}
            >
              <Text style={[styles.sortTabText, { color: sortMode === mode ? theme.colors.primary : theme.colors.textSecondary }]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Accepted count banner */}
        {acceptedResponses.length > 0 && (
          <View style={[styles.acceptedBanner, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '600' }}>
              {acceptedResponses.length} musician{acceptedResponses.length > 1 ? 's' : ''} accepted — select one to confirm
            </Text>
          </View>
        )}

        {/* List */}
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          renderItem={renderResponse}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⏳</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Waiting for responses</Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                Musicians have been notified. Responses usually come in within minutes.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  sortTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sortTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  responseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  providerHeadline: {
    fontSize: 12,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  profileBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectBtnGrad: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
