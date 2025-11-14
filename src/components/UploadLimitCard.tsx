import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { UploadQuota } from '../services/UploadQuotaService';

type UploadLimitCardProps = {
  quota: UploadQuota | null;
  loading?: boolean;
  onUpgrade?: () => void;
};

const formatTierLabel = (tierValue: string | undefined) => {
  const tier = tierValue?.toLowerCase() ?? 'free';
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'enterprise':
      return 'Enterprise';
    default:
      return tier.charAt(0).toUpperCase() + tier.slice(1);
  }
};

export default function UploadLimitCard({ quota, loading, onUpgrade }: UploadLimitCardProps) {
  const { theme } = useTheme();

  const glassPalette = theme.isDark
    ? {
        bg: 'rgba(15, 23, 42, 0.55)',
        inner: 'rgba(15, 23, 42, 0.28)',
        border: 'rgba(148, 163, 184, 0.32)',
      }
    : {
        bg: 'rgba(255, 255, 255, 0.72)',
        inner: 'rgba(255, 255, 255, 0.38)',
        border: 'rgba(148, 163, 184, 0.2)',
      };

  const GlassContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BlurView
      intensity={theme.isDark ? 90 : 60}
      tint={theme.isDark ? 'dark' : 'light'}
      style={[styles.container, { backgroundColor: glassPalette.bg, borderColor: glassPalette.border }]}
    >
      <View style={[styles.inner, { backgroundColor: glassPalette.inner }]}>{children}</View>
    </BlurView>
  );

  if (loading) {
    return (
      <GlassContainer>
        <Text style={[styles.title, { color: theme.colors.text }]}>Checking your upload quota…</Text>
      </GlassContainer>
    );
  }

  if (!quota) {
    return null;
  }

  const remaining = quota.remaining ?? (quota.upload_limit != null ? quota.upload_limit - quota.uploads_this_month : null);
  const tierLabel = formatTierLabel(quota.tier);
  const resetDate = quota.reset_date ? new Date(quota.reset_date) : null;
  const showUpgrade = onUpgrade && (quota.tier ?? 'free').toLowerCase() === 'free';

  return (
    <GlassContainer>
      <View style={styles.headerRow}>
        <Ionicons name="musical-notes" size={22} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{tierLabel}</Text>
      </View>

      {quota.is_unlimited ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Unlimited uploads available.</Text>
      ) : (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {quota.upload_limit ?? 'N/A'} uploads / month · {remaining ?? 0} remaining
        </Text>
      )}

      {resetDate && !quota.is_unlimited && (
        <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>Resets {resetDate.toLocaleDateString()}</Text>
      )}

      {showUpgrade && (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
          onPress={onUpgrade}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" style={styles.upgradeIcon} />
          <Text style={styles.upgradeText}>Need more uploads? Upgrade</Text>
        </TouchableOpacity>
      )}

      {!quota.can_upload && (
        <View
          style={[
            styles.warning,
            {
              backgroundColor: theme.isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(248, 113, 113, 0.16)',
              borderColor: '#F87171',
            }
          ]}
          accessibilityRole="alert"
        >
          <Ionicons name="alert-circle" size={18} color="#B91C1C" style={styles.warningIcon} />
          <Text style={[styles.warningText, { color: '#B91C1C' }]}>Upload limit reached. Upgrade or wait for reset.</Text>
        </View>
      )}
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  inner: {
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  resetText: {
    fontSize: 12,
    marginBottom: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  upgradeIcon: {
    marginRight: 4,
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  warning: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
