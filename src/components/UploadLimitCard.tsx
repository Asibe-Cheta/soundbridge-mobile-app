import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        bg: 'rgba(24, 8, 52, 0.55)',
        inner: 'rgba(24, 8, 52, 0.38)',
        border: 'rgba(255, 255, 255, 0.12)',
      }
    : {
        bg: 'rgba(88, 36, 145, 0.18)',
        inner: 'rgba(88, 36, 145, 0.12)',
        border: 'rgba(88, 36, 145, 0.2)',
      };

  const GlassContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BlurView
      intensity={theme.isDark ? 90 : 60}
      tint={theme.isDark ? 'dark' : 'light'}
      style={[styles.container, { backgroundColor: glassPalette.bg, borderColor: glassPalette.border }]}
    >
      <View style={[styles.inner, { backgroundColor: glassPalette.inner, borderColor: glassPalette.border }]}>{children}</View>
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
            {storage.is_unlimited_tier ? 'Unlimited uploads*' : 'Uploads limited by storage capacity*'}
          </Text>
          {!storage.is_unlimited_tier && tier === 'premium' && (
            <Text style={[styles.resetText, { color: theme.colors.textSecondary, fontSize: 11 }]}>
              *Limited by storage capacity
            </Text>
          )}
        </>
      ) : (
          // Fallback to storage-based display if storage not available
        <>
          {quota.is_unlimited ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Unlimited storage available.</Text>
          ) : (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {tier === 'free' ? '250MB storage (~30-40 tracks)' : '2GB storage (~250 tracks)'}
            </Text>
          )}
        </>
      )}

      {showUpgrade && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={onUpgrade}
          accessibilityRole="button"
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeGradient}
          >
            <Text style={styles.upgradeText}>
              {tier === 'free' ? 'Upgrade for 2GB (66× more!)' : 'Upgrade for 10GB storage'}
            </Text>
          </LinearGradient>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  inner: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 20,
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
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 12,
  },
  upgradeGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
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
