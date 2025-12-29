import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { StorageQuota, getStorageWarningLevel, getStorageWarningMessage, getUpgradeSuggestion } from '../services/StorageQuotaService';

interface StorageIndicatorProps {
  storageQuota: StorageQuota;
  onPress?: () => void;
  compact?: boolean; // Compact version for dashboard
}

export default function StorageIndicator({ storageQuota, onPress, compact = false }: StorageIndicatorProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const warningLevel = getStorageWarningLevel(storageQuota.storage_percent_used);
  const warningMessage = getStorageWarningMessage(storageQuota);
  const upgradeSuggestion = getUpgradeSuggestion(storageQuota);

  // Color scheme based on usage level
  const getProgressColor = () => {
    switch (warningLevel) {
      case 'critical':
        return '#EF4444'; // Red
      case 'warning':
        return '#F59E0B'; // Orange
      default:
        return '#10B981'; // Green
    }
  };

  const progressColor = getProgressColor();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to storage management screen
      navigation.navigate('StorageManagement' as never);
    }
  };

  const handleUpgradePress = () => {
    navigation.navigate('Upgrade' as never);
  };

  if (compact) {
    // Compact version for dashboard/profile
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.compactContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Ionicons name="cloud-outline" size={20} color={theme.colors.text} />
          <Text style={[styles.compactTitle, { color: theme.colors.text }]}>Storage</Text>
        </View>

        <View style={styles.compactProgress}>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, storageQuota.storage_percent_used)}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.compactPercent, { color: theme.colors.textSecondary }]}>
            {Math.round(storageQuota.storage_percent_used)}%
          </Text>
        </View>

        <Text style={[styles.compactUsage, { color: theme.colors.textSecondary }]}>
          {storageQuota.storage_used_formatted} / {storageQuota.storage_limit_formatted}
        </Text>

        {warningLevel !== 'safe' && (
          <View style={[styles.compactWarning, { backgroundColor: progressColor + '20' }]}>
            <Ionicons name="warning-outline" size={14} color={progressColor} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Full version for upload screen
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cloud-outline" size={24} color={theme.colors.text} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Storage</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {storageQuota.approximate_tracks}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handlePress} style={styles.manageButton}>
          <Text style={[styles.manageButtonText, { color: theme.colors.primary }]}>Manage</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Usage Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {storageQuota.storage_used_formatted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Used</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {storageQuota.storage_available_formatted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Available</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {storageQuota.storage_limit_formatted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, storageQuota.storage_percent_used)}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
          {Math.round(storageQuota.storage_percent_used)}% used
        </Text>
      </View>

      {/* Warning Message */}
      {warningMessage && (
        <View style={[styles.warningBox, { backgroundColor: progressColor + '15', borderColor: progressColor + '40' }]}>
          <Ionicons name="warning-outline" size={20} color={progressColor} style={styles.warningIcon} />
          <Text style={[styles.warningText, { color: progressColor }]}>{warningMessage}</Text>
        </View>
      )}

      {/* Upgrade Suggestion */}
      {upgradeSuggestion && (
        <TouchableOpacity
          onPress={handleUpgradePress}
          style={styles.upgradeButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#EC4899', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeGradient}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeText}>{upgradeSuggestion}</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full version styles
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressSection: {
    gap: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  warningIcon: {
    flexShrink: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  upgradeButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  upgradeText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Compact version styles
  compactContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactPercent: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  compactUsage: {
    fontSize: 11,
  },
  compactWarning: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
