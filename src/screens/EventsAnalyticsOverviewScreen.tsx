import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import eventAnalyticsService, { EventAnalytics } from '../services/EventAnalyticsService';
import { notificationService } from '../services/NotificationService';

// Exactly match EventAnalyticsCard's Tier type and gating constants
type Tier = 'free' | 'premium' | 'unlimited' | null | undefined;

interface EventRow {
  id: string;
  title: string;
  event_date: string;
}

interface EventWithAnalytics {
  event: EventRow;
  analytics: EventAnalytics | null;
  analyticsError: boolean;
}

const notifScheduledKey = (id: string) => `@sb:event_end_notif:${id}`;
const inAppShownKey = (id: string) => `@sb:event_end_inapp:${id}`;

function getEventStatus(eventDate: string): 'upcoming' | 'live' | 'past' {
  const now = new Date();
  const date = new Date(eventDate);
  const diff = now.getTime() - date.getTime();
  if (diff < 0) return 'upcoming';
  if (diff < 6 * 60 * 60 * 1000) return 'live'; // treat up to 6h after start as "live"
  return 'past';
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRevenue(amount: number): string {
  if (amount >= 1000) return `£${(amount / 1000).toFixed(1)}k`;
  return `£${amount.toFixed(0)}`;
}

export default function EventsAnalyticsOverviewScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Exactly mirrors EventAnalyticsCard gating
  const tier = userProfile?.subscription_tier as Tier;
  const isPremium = tier === 'premium' || tier === 'unlimited';

  const [items, setItems] = useState<EventWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const runPostEventAlerts = useCallback(
    async (currentItems: EventWithAnalytics[]) => {
      if (!isPremium) return;
      for (const item of currentItems) {
        if (getEventStatus(item.event.event_date) !== 'past') continue;
        const hoursAgo =
          (Date.now() - new Date(item.event.event_date).getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 48) continue;
        const alreadyShown = await AsyncStorage.getItem(inAppShownKey(item.event.id)).catch(
          () => null,
        );
        if (alreadyShown) continue;

        const a = item.analytics;
        const views = a?.event_page_views ?? 0;
        const tickets = a?.ticket_sales_count ?? 0;
        const topCity = a?.views_by_city
          ? Object.entries(a.views_by_city).sort(
              ([, x], [, y]) => (y as number) - (x as number),
            )[0]?.[0]
          : null;
        const parts = [
          `${views} view${views !== 1 ? 's' : ''}`,
          tickets > 0 ? `${tickets} ticket${tickets !== 1 ? 's' : ''} sold` : null,
          topCity ? `Top city: ${topCity}` : null,
        ].filter(Boolean);

        showToast(`"${item.event.title}" ended — ${parts.join(' · ')}`, 'info', 6000);
        await AsyncStorage.setItem(inAppShownKey(item.event.id), '1').catch(() => {});
        break; // one toast at a time
      }
    },
    [isPremium, showToast],
  );

  const scheduleEndNotifications = useCallback(async (currentItems: EventWithAnalytics[]) => {
    for (const item of currentItems) {
      if (getEventStatus(item.event.event_date) === 'past') continue;
      const alreadyScheduled = await AsyncStorage.getItem(
        notifScheduledKey(item.event.id),
      ).catch(() => null);
      if (alreadyScheduled) continue;
      // Fire ~2 hours after event start as an approximate end time
      const fireAt = new Date(new Date(item.event.event_date).getTime() + 2 * 60 * 60 * 1000);
      if (fireAt <= new Date()) continue;
      await notificationService
        .scheduleLocalNotification(
          'Your event has ended 🎉',
          `"${item.event.title}" has ended. Open Event Insights to see your reach and ticket sales.`,
          { type: 'event_reminder', eventId: item.event.id },
          fireAt,
        )
        .catch(() => {});
      await AsyncStorage.setItem(notifScheduledKey(item.event.id), '1').catch(() => {});
    }
  }, []);

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.id) return;
      const [eventsResult, analyticsResult] = await Promise.allSettled([
        supabase
          .from('events')
          .select('id, title, event_date')
          .eq('creator_id', user.id)
          .order('event_date', { ascending: false }),
        eventAnalyticsService.getAllForCreator(user.id),
      ]);

      const events: EventRow[] =
        eventsResult.status === 'fulfilled' ? eventsResult.value.data ?? [] : [];
      const analyticsRows: EventAnalytics[] =
        analyticsResult.status === 'fulfilled' ? analyticsResult.value : [];
      const analyticsGlobalError = analyticsResult.status === 'rejected';
      const analyticsMap = new Map(analyticsRows.map(a => [a.event_id, a]));

      const merged: EventWithAnalytics[] = events.map(event => ({
        event,
        analytics: analyticsMap.get(event.id) ?? null,
        analyticsError: analyticsGlobalError,
      }));

      setItems(merged);

      // Post-event work after we have fresh data
      await runPostEventAlerts(merged);
      await scheduleEndNotifications(merged);
    },
    [user?.id, runPostEventAlerts, scheduleEndNotifications],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadData().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData({ silent: true });
    setRefreshing(false);
  }, [loadData]);

  // ─── sub-renderers ────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Insights</Text>
      <View style={styles.backBtn} />
    </View>
  );

  const renderStatusBadge = (status: 'upcoming' | 'live' | 'past') => {
    const map = {
      upcoming: { label: 'Upcoming', bg: 'rgba(59,130,246,0.13)', color: '#3B82F6' },
      live: { label: 'Live Now', bg: 'rgba(16,185,129,0.13)', color: '#10B981' },
      past: { label: 'Past', bg: `${theme.colors.textSecondary}18`, color: theme.colors.textSecondary },
    } as const;
    const c = map[status];
    return (
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        {status === 'live' && <View style={[styles.liveDot, { backgroundColor: c.color }]} />}
        <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
      </View>
    );
  };

  const renderLockedMetrics = () => (
    <TouchableOpacity
      style={[styles.lockedRow, { borderTopColor: theme.colors.border }]}
      onPress={() => navigation.navigate('Upgrade' as never)}
      activeOpacity={0.7}
    >
      <Text style={styles.lockedCrown}>👑</Text>
      <Text style={[styles.lockedText, { color: theme.colors.textSecondary }]}>
        View how this event performed and get insight on what to do next
      </Text>
      <Ionicons name="chevron-forward" size={12} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderMetricChips = (analytics: EventAnalytics | null) => {
    const views = analytics?.event_page_views ?? 0;
    const tickets = analytics?.ticket_sales_count ?? 0;
    const revenue = analytics?.ticket_sales_revenue ?? 0;
    const shares =
      (analytics?.shares_link_count ?? 0) + (analytics?.shares_card_count ?? 0);

    return (
      <View style={[styles.metricsRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>👁</Text>
          <Text style={[styles.chipValue, { color: theme.colors.text }]}>
            {views.toLocaleString()}
          </Text>
          <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>views</Text>
        </View>

        <View style={[styles.chipDivider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.chip}>
          <Text style={styles.chipIcon}>🎟</Text>
          <Text style={[styles.chipValue, { color: theme.colors.text }]}>{tickets}</Text>
          <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>sold</Text>
        </View>

        {revenue > 0 && (
          <>
            <View style={[styles.chipDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.chip}>
              <Text style={styles.chipIcon}>💷</Text>
              <Text style={[styles.chipValue, { color: theme.colors.text }]}>
                {formatRevenue(revenue)}
              </Text>
              <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>
                revenue
              </Text>
            </View>
          </>
        )}

        <View style={[styles.chipDivider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.chip}>
          <Text style={styles.chipIcon}>↗️</Text>
          <Text style={[styles.chipValue, { color: theme.colors.text }]}>{shares}</Text>
          <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>shares</Text>
        </View>
      </View>
    );
  };

  const renderEventCard = (item: EventWithAnalytics, index: number) => {
    const { event, analytics, analyticsError } = item;
    const status = getEventStatus(event.event_date);
    const isLast = index === items.length - 1;

    return (
      <View
        key={event.id}
        style={[
          styles.eventCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          !isLast && styles.eventCardSpaced,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text
              style={[styles.eventTitle, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
            <Text style={[styles.eventDate, { color: theme.colors.textSecondary }]}>
              {formatEventDate(event.event_date)}
            </Text>
          </View>
          {renderStatusBadge(status)}
        </View>

        {analyticsError ? (
          <View style={[styles.errorRow, { borderTopColor: theme.colors.border }]}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
              Insights temporarily unavailable
            </Text>
          </View>
        ) : isPremium ? (
          renderMetricChips(analytics)
        ) : (
          renderLockedMetrics()
        )}
      </View>
    );
  };

  // ─── main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {renderHeader()}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            items.length === 0 && styles.contentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Upgrade prompt — free users only, when there are events to show */}
          {!isPremium && items.length > 0 && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => navigation.navigate('Upgrade' as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeCrown}>👑</Text>
              <Text style={styles.upgradeBannerText}>
                View actionable, real-time analytics to improve your turnouts — we guide you
                through what to do every time you create an event.{' '}
                <Text style={styles.upgradeBannerBold}>Premium</Text> gives you unique
                direction on how and where to host.{' '}
                <Text style={styles.upgradeBannerBold}>Upgrade now.</Text>
              </Text>
              <Ionicons name="chevron-forward" size={13} color="#8B5CF6" />
            </TouchableOpacity>
          )}

          {/* Empty state */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No events yet
              </Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                Create your first event and start tracking reach, ticket sales and audience
                insights.
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('CreateEvent' as never)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item, index) => renderEventCard(item, index))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Content
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  contentEmpty: {
    flexGrow: 1,
  },

  // Upgrade banner
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(139,92,246,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  upgradeCrown: {
    fontSize: 16,
  },
  upgradeBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#8B5CF6',
    lineHeight: 19,
  },
  upgradeBannerBold: {
    fontWeight: '700',
  },

  // Event card
  eventCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  eventCardSpaced: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  eventDate: {
    fontSize: 12,
  },

  // Status badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Metric chips row
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  chipDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: 4,
  },

  // Locked metrics row
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedCrown: {
    fontSize: 12,
  },
  lockedText: {
    flex: 1,
    fontSize: 12,
  },

  // Error row
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Empty state — matches AnalyticsDashboardScreen pattern exactly
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
