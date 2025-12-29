import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '../services/StorageQuotaService';

interface CancellationWarningModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCancellation: () => void;
  currentTier: 'premium' | 'unlimited';
  storageUsed: number; // in bytes
  storageLimit: number; // in bytes
}

export const CancellationWarningModal: React.FC<CancellationWarningModalProps> = ({
  visible,
  onClose,
  onConfirmCancellation,
  currentTier,
  storageUsed,
  storageLimit,
}) => {
  const freeTierLimit = 30 * 1024 * 1024; // 30MB
  const isOverFreeLimit = storageUsed > freeTierLimit;
  const excessStorage = Math.max(0, storageUsed - freeTierLimit);
  const timesOverLimit = Math.floor(storageUsed / freeTierLimit);

  const tierName = currentTier === 'unlimited' ? 'Unlimited' : 'Premium';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="warning" size={40} color="#FF6B6B" />
              <Text style={styles.title}>Before You Cancel {tierName}</Text>
            </View>

            {/* Current Storage Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Your current storage:</Text>
              <Text style={styles.storageAmount}>
                {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
              </Text>
              <Text style={styles.freeTierInfo}>
                Free tier includes only 30MB of storage
              </Text>
              {isOverFreeLimit && (
                <Text style={styles.warningText}>
                  You're {timesOverLimit}× over the Free tier limit
                </Text>
              )}
            </View>

            {/* What Happens Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What happens if you cancel:</Text>

              <View style={styles.bulletPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.bulletText}>
                  All your tracks stay accessible for 90 days
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.bulletText}>
                  You can still download your content
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.bulletText}>
                  Tips and earnings continue working
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                <Text style={styles.bulletText}>
                  You cannot upload new tracks until you:
                </Text>
              </View>

              <View style={styles.subBullets}>
                <Text style={styles.subBulletText}>
                  • Delete content to get under 30MB, OR
                </Text>
                <Text style={styles.subBulletText}>
                  • Re-subscribe to {tierName}
                </Text>
              </View>
            </View>

            {/* After 90 Days Section */}
            {isOverFreeLimit && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>After 90 days:</Text>

                <View style={styles.bulletPoint}>
                  <Ionicons name="information-circle" size={20} color="#2196F3" />
                  <Text style={styles.bulletText}>
                    Only 30MB of your content stays public
                  </Text>
                </View>

                <View style={styles.bulletPoint}>
                  <Ionicons name="lock-closed" size={20} color="#FFA726" />
                  <Text style={styles.bulletText}>
                    Excess content ({formatBytes(excessStorage)}) becomes private
                  </Text>
                </View>

                <View style={styles.bulletPoint}>
                  <Ionicons name="eye-off" size={20} color="#9E9E9E" />
                  <Text style={styles.bulletText}>
                    You can still access private tracks, but others can't
                  </Text>
                </View>

                <View style={styles.bulletPoint}>
                  <Ionicons name="refresh" size={20} color="#4CAF50" />
                  <Text style={styles.bulletText}>
                    Re-subscribe anytime to restore public access
                  </Text>
                </View>
              </View>
            )}

            {/* Storage Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current storage:</Text>
                <Text style={styles.summaryValue}>{formatBytes(storageUsed)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Free tier limit:</Text>
                <Text style={styles.summaryValue}>30MB</Text>
              </View>
              {isOverFreeLimit && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Excess storage:</Text>
                  <Text style={[styles.summaryValue, styles.excessValue]}>
                    {formatBytes(excessStorage)}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.keepButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.keepButtonText}>Keep {tierName}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onConfirmCancellation}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Continue with Cancellation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
  },
  storageAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  freeTierInfo: {
    fontSize: 14,
    color: '#FFA726',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#E0E0E0',
    marginLeft: 10,
    lineHeight: 20,
  },
  subBullets: {
    marginLeft: 30,
    marginTop: 4,
  },
  subBulletText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
    lineHeight: 20,
  },
  summaryBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  excessValue: {
    color: '#FF6B6B',
  },
  buttonContainer: {
    gap: 12,
  },
  keepButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  keepButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
