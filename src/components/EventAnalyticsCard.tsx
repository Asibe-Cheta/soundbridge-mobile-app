import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { EventAnalytics } from '../services/EventAnalyticsService';

const PRICING_URL = 'https://www.soundbridge.live/pricing';

type Tier = 'free' | 'premium' | 'unlimited' | null | undefined;

interface Props {
  analytics: EventAnalytics | null;
  tier: Tier;
}

function MetricRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricIcon, { color: theme.colors.primary }]}>{icon}</Text>
      <View style={styles.metricInfo}>
        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>{sub}</Text>
        ) : null}
      </View>
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
      {title.toUpperCase()}
    </Text>
  );
}

export default function EventAnalyticsCard({ analytics, tier }: Props) {
  const { theme } = useTheme();
  const isPremium = tier === 'premium' || tier === 'unlimited';
  const isUnlimited = tier === 'unlimited';

  // Locked state for free users
  if (!isPremium) {
    return (
      <View style={[styles.lockedCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.lockedIconRow}>
          <Ionicons name="lock-closed" size={28} color={theme.colors.textSecondary} />
        </View>
        <Text style={[styles.lockedTitle, { color: theme.colors.text }]}>
          See how your event is performing.
        </Text>
        <Text style={[styles.lockedBody, { color: theme.colors.textSecondary }]}>
          Reach, ticket sales, notification opens and more. Available on Premium and Unlimited.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => Linking.openURL(PRICING_URL)}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeButtonText}>Access Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const a = analytics;

  const openRate = a && a.notifications_sent > 0
    ? `${((a.notifications_opened / a.notifications_sent) * 100).toFixed(1)}%`
    : '—';

  const viewToTicketRate = a && a.event_page_views > 0 && a.ticket_sales_count > 0
    ? `${((a.ticket_sales_count / a.event_page_views) * 100).toFixed(1)}%`
    : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Event Analytics</Text>

      {/* Reach */}
      <SectionHeader title="Reach" />
      <MetricRow icon="🔔" label="Notifications Sent" value={a?.notifications_sent ?? 0} />
      <MetricRow
        icon="👆"
        label="Notifications Opened"
        value={a?.notifications_opened ?? 0}
        sub={`Open rate: ${openRate}`}
      />
      <MetricRow icon="👁" label="Page Views" value={a?.event_page_views ?? 0} />

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* Engagement */}
      <SectionHeader title="Engagement" />
      <MetricRow icon="🔖" label="Bookmarks" value={a?.bookmarks_count ?? 0} />
      <MetricRow
        icon="↗️"
        label="Shares"
        value={(a?.shares_link_count ?? 0) + (a?.shares_card_count ?? 0)}
        sub={`Link: ${a?.shares_link_count ?? 0}  ·  Card: ${a?.shares_card_count ?? 0}`}
      />

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* Conversion */}
      <SectionHeader title="Conversion" />
      <MetricRow
        icon="🎟"
        label="Tickets Sold"
        value={a?.ticket_sales_count ?? 0}
        sub={
          a && a.ticket_sales_revenue > 0
            ? `Revenue: £${a.ticket_sales_revenue.toLocaleString()}`
            : undefined
        }
      />
      {viewToTicketRate && (
        <MetricRow icon="📈" label="Page → Purchase Rate" value={viewToTicketRate} />
      )}

      {/* Advanced — Unlimited only */}
      {isUnlimited && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <SectionHeader title="Advanced" />

          {a?.peak_view_hour != null && (
            <MetricRow
              icon="⏰"
              label="Peak Viewing Hour"
              value={`${a.peak_view_hour}:00`}
            />
          )}

          {a?.notification_open_rate != null && (
            <MetricRow
              icon="📊"
              label="Notification Open Trend"
              value={`${(a.notification_open_rate * 100).toFixed(1)}%`}
            />
          )}

          {a?.views_by_city && Object.keys(a.views_by_city).length > 0 && (
            <View style={styles.advancedSection}>
              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>
                Views by City
              </Text>
              {Object.entries(a.views_by_city)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([city, count]) => (
                  <View key={city} style={styles.cityRow}>
                    <Text style={[styles.cityName, { color: theme.colors.text }]}>{city}</Text>
                    <Text style={[styles.cityCount, { color: theme.colors.textSecondary }]}>
                      {count as number}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {a?.views_by_genre_match && Object.keys(a.views_by_genre_match).length > 0 && (
            <View style={styles.advancedSection}>
              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>
                Views by Genre Match
              </Text>
              {Object.entries(a.views_by_genre_match)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([genre, count]) => (
                  <View key={genre} style={styles.cityRow}>
                    <Text style={[styles.cityName, { color: theme.colors.text }]}>{genre}</Text>
                    <Text style={[styles.cityCount, { color: theme.colors.textSecondary }]}>
                      {count as number}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 16,
    width: 28,
    marginTop: 1,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricSub: {
    fontSize: 12,
    marginTop: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  advancedSection: {
    marginBottom: 12,
  },
  advancedLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cityName: {
    fontSize: 13,
  },
  cityCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Locked state
  lockedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginTop: 24,
    marginBottom: 8,
    alignItems: 'center',
  },
  lockedIconRow: {
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
