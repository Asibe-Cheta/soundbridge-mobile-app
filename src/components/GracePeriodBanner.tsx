import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '../services/StorageQuotaService';

interface GracePeriodBannerProps {
  storageStatus: 'grace_period' | 'grace_expired';
  graceDaysRemaining?: number;
  storageUsed: number;
  storageLimit: number;
  onManageStorage: () => void;
  onUpgrade: () => void;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  storageStatus,
  graceDaysRemaining = 0,
  storageUsed,
  storageLimit,
  onManageStorage,
  onUpgrade,
}) => {
  const isGracePeriod = storageStatus === 'grace_period';
  const percentOver = Math.floor((storageUsed / storageLimit) * 100);
  const excessStorage = storageUsed - storageLimit;

  if (isGracePeriod) {
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.gracePeriodBanner}>
          <View style={styles.bannerHeader}>
            <Ionicons name="information-circle" size={24} color="#FFA726" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.bannerTitle}>Grace Period Active</Text>
              <Text style={styles.daysRemaining}>
                {graceDaysRemaining} {graceDaysRemaining === 1 ? 'day' : 'days'} remaining
              </Text>
            </View>
          </View>

          <View style={styles.storageInfo}>
            <Text style={styles.storageText}>
              Your storage: {formatBytes(storageUsed)} / {formatBytes(storageLimit)} (Free tier)
            </Text>
            <Text style={styles.warningText}>
              {percentOver}% over Free tier limit
            </Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>
                All tracks accessible until grace period ends
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="close-circle" size={16} color="#FF6B6B" />
              <Text style={styles.infoText}>
                Cannot upload new content
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="trash" size={16} color="#2196F3" />
              <Text style={styles.infoText}>
                Delete {formatBytes(excessStorage)} to upload, or re-subscribe
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.manageButton]}
              onPress={onManageStorage}
              activeOpacity={0.8}
            >
              <Text style={styles.manageButtonText}>Delete Tracks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.upgradeButton]}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Grace period expired
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.expiredBanner}>
        <View style={styles.bannerHeader}>
          <Ionicons name="lock-closed" size={24} color="#FF6B6B" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.bannerTitle}>Upload Blocked</Text>
            <Text style={styles.subtitle}>Grace period expired</Text>
          </View>
        </View>

        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            Storage: {formatBytes(storageUsed)} / {formatBytes(storageLimit)} (Free tier)
          </Text>
          <Text style={styles.expiredWarningText}>
            Excess content is now private
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>To upload new tracks:</Text>
          <View style={styles.option}>
            <Text style={styles.optionNumber}>1.</Text>
            <Text style={styles.optionText}>
              Delete public tracks to free {formatBytes(excessStorage)}, OR
            </Text>
          </View>
          <View style={styles.option}>
            <Text style={styles.optionNumber}>2.</Text>
            <Text style={styles.optionText}>
              Upgrade to restore all content + upload new tracks
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.upgradeButton, { width: '100%' }]}
          onPress={onUpgrade}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Premium - 2GB</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  gracePeriodBanner: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  expiredBanner: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  daysRemaining: {
    fontSize: 14,
    color: '#FFA726',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  storageInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  storageText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA726',
  },
  expiredWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  infoList: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#E0E0E0',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#E0E0E0',
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  manageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  upgradeButton: {
    backgroundColor: '#FF6B6B',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
