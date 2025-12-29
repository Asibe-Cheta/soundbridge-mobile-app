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
    case 'premium':
      return 'Premium';
    case 'unlimited':
      return 'Unlimited';
    // Legacy support
    case 'pro':
      return 'Premium';
    case 'enterprise':
      return 'Unlimited';
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

  const tierLabel = formatTierLabel(quota.tier);
  const tier = (quota.tier ?? 'free').toLowerCase();
  const storage = quota.storage;

  // Show upgrade if: Free tier OR storage full and not on unlimited tier
  const showUpgrade = onUpgrade && (tier === 'free' || (tier === 'premium' && !quota.can_upload));

  return (
    <GlassContainer>
      <View style={styles.headerRow}>
        <Ionicons name="cloud" size={22} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{tierLabel} Tier</Text>
      </View>

      {/* Storage-based information */}
      {storage ? (
        <>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {storage.storage_limit_formatted} storage · {storage.approximate_tracks}
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            {storage.is_unlimited_tier ? 'Unlimited uploads*' : tier === 'free' ? '3 uploads total' : 'Unlimited uploads*'}
          </Text>
          {!storage.is_unlimited_tier && tier === 'premium' && (
            <Text style={[styles.resetText, { color: theme.colors.textSecondary, fontSize: 11 }]}>
              *Limited by storage capacity
            </Text>
          )}
        </>
      ) : (
        // Fallback to old upload count display if storage not available
        <>
          {quota.is_unlimited ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Unlimited uploads available.</Text>
          ) : (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {quota.upload_limit ?? 'N/A'} {tier === 'free' ? 'uploads total' : 'uploads/month'} · {quota.remaining ?? 0} remaining
            </Text>
          )}
        </>
      )}

      {showUpgrade && (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
          onPress={onUpgrade}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" style={styles.upgradeIcon} />
          <Text style={styles.upgradeText}>
            {tier === 'free' ? 'Upgrade for 2GB (66× more!)' : 'Upgrade for 10GB storage'}
          </Text>
        </TouchableOpacity>
      )}

      {!quota.can_upload && storage && (
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
          <Text style={[styles.warningText, { color: '#B91C1C' }]}>
            Storage limit reached ({storage.storage_percent_used.toFixed(0)}% used). Delete files or upgrade.
          </Text>
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
