import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// Helper function to format backup codes for display (e.g., "ABCD1234" -> "ABCD-1234")
const formatBackupCode = (code: string): string => {
  if (code.length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
};

interface BackupCodesModalProps {
  visible: boolean;
  backupCodes: string[];
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
}

export default function BackupCodesModal({
  visible,
  backupCodes,
  onClose,
  onConfirm,
  title = 'Save Your Backup Codes',
  message = 'Store these codes in a safe place. Each code can only be used once.',
}: BackupCodesModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleCopyAll = () => {
    const codesText = backupCodes
      .map((code, index) => `${index + 1}. ${formatBackupCode(code)}`)
      .join('\n');
    
    Clipboard.setString(codesText);
    Alert.alert('Copied!', 'Backup codes copied to clipboard');
  };

  const handleCopySingle = (code: string, index: number) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', `Code ${index + 1} copied to clipboard`);
  };

  const handleShare = async () => {
    try {
      const codesText = `SoundBridge Backup Codes\n\n${backupCodes
        .map((code, index) => `${index + 1}. ${formatBackupCode(code)}`)
        .join('\n')}\n\n⚠️ Keep these codes safe and secure!`;
      
      await Share.share({
        message: codesText,
        title: 'SoundBridge Backup Codes',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDownload = () => {
    // In a real app, you'd save to device storage
    Alert.alert(
      'Download Backup Codes',
      'In the full version, codes would be saved as a text file to your device.',
      [
        { text: 'Copy to Clipboard', onPress: handleCopyAll },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={30} tint="dark" style={styles.container}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="key" size={32} color="#4ECDC4" />
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Title and Message */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Each code works only once. Store them securely!
              </Text>
            </View>

            {/* Backup Codes List */}
            <ScrollView style={styles.codesContainer} contentContainerStyle={styles.codesContent}>
              {backupCodes.map((code, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.codeRow}
                  onPress={() => handleCopySingle(code, index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.codeNumberContainer}>
                    <Text style={styles.codeNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.codeText}>{formatBackupCode(code)}</Text>
                  <Ionicons name="copy-outline" size={18} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopyAll}>
                <Ionicons name="copy" size={20} color="#4ECDC4" />
                <Text style={styles.actionButtonText}>Copy All</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="#4ECDC4" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
                <Ionicons name="download-outline" size={20} color="#4ECDC4" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            </View>

            {/* Confirmation Checkbox */}
            {onConfirm && (
              <TouchableOpacity
                style={styles.confirmContainer}
                onPress={() => setConfirmed(!confirmed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                  {confirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.confirmText}>
                  I have saved these codes in a safe place
                </Text>
              </TouchableOpacity>
            )}

            {/* Done Button */}
            <TouchableOpacity
              style={[
                styles.doneButton,
                onConfirm && !confirmed && styles.doneButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={onConfirm ? !confirmed : false}
            >
              <LinearGradient
                colors={onConfirm && !confirmed ? ['#666', '#666'] : ['#4ECDC4', '#44A08D']}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.doneButtonText}>
                  {onConfirm ? 'Continue' : 'Done'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    lineHeight: 22,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '600',
  },
  codesContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  codesContent: {
    paddingBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  codeNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  codeNumber: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  codeText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionButtonText: {
    color: '#4ECDC4',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  confirmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  confirmText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  doneButton: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

