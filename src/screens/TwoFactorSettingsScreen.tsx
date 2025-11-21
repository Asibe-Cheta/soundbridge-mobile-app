import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getTwoFactorStatus,
  disableTwoFactor,
  regenerateBackupCodes,
  parseTwoFactorError,
} from '../services/twoFactorAuthConfig';
import BackupCodesModal from '../components/BackupCodesModal';
import type { TwoFactorStatusResponse } from '../types/twoFactor';

export default function TwoFactorSettingsScreen() {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      console.log('📊 Loading 2FA status...');
      const statusData = await getTwoFactorStatus();
      setStatus(statusData);
      console.log('✅ Status loaded:', statusData);
    } catch (error) {
      console.error('❌ Failed to load status:', error);
      Alert.alert('Error', 'Failed to load 2FA status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleEnableTwoFactor = () => {
    (navigation as any).navigate('TwoFactorSetup');
  };

  const handleDisableTwoFactor = () => {
    Alert.prompt(
      'Disable Two-Factor Authentication',
      'Enter your password to continue',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: (password) => {
            if (!password) {
              Alert.alert('Error', 'Password is required');
              return;
            }
            
            // Ask for TOTP code
            Alert.prompt(
              'Enter Verification Code',
              'Enter your current 6-digit code from your authenticator app',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disable',
                  style: 'destructive',
                  onPress: async (code) => {
                    if (!code || code.length !== 6) {
                      Alert.alert('Error', 'Please enter a valid 6-digit code');
                      return;
                    }
                    
                    await performDisable(password, code);
                  },
                },
              ],
              'plain-text',
              '',
              'number-pad'
            );
          },
        },
      ],
      'secure-text'
    );
  };

  const performDisable = async (password: string, code: string) => {
    try {
      console.log('🔓 Disabling 2FA...');
      await disableTwoFactor(password, code);
      
      console.log('✅ 2FA disabled successfully');
      Alert.alert('Success', 'Two-factor authentication has been disabled', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('❌ Disable failed:', err);
      const parsedError = parseTwoFactorError(err);
      Alert.alert('Failed to Disable', parsedError.message);
    }
  };

  const handleRegenerateBackupCodes = () => {
    Alert.prompt(
      'Regenerate Backup Codes',
      'This will invalidate all existing backup codes. Enter your current 6-digit code to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async (code) => {
            if (!code || code.length !== 6) {
              Alert.alert('Error', 'Please enter a valid 6-digit code');
              return;
            }
            
            await performRegenerate(code);
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  const performRegenerate = async (code: string) => {
    try {
      console.log('🔄 Regenerating backup codes...');
      const response = await regenerateBackupCodes(code);
      
      console.log('✅ Backup codes regenerated');
      setNewBackupCodes(response.backupCodes);
      setShowBackupCodes(true);
      
      // Refresh status to update backup codes count
      loadStatus();
    } catch (err: any) {
      console.error('❌ Regenerate failed:', err);
      const parsedError = parseTwoFactorError(err);
      Alert.alert('Failed to Regenerate', parsedError.message);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBackupCodesWarningLevel = (remaining?: number): 'safe' | 'warning' | 'critical' => {
    if (!remaining) return 'critical';
    if (remaining >= 5) return 'safe';
    if (remaining >= 3) return 'warning';
    return 'critical';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4ECDC4"
            />
          }
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIcon,
                status?.enabled ? styles.statusIconEnabled : styles.statusIconDisabled,
              ]}>
                <Ionicons
                  name={status?.enabled ? 'shield-checkmark' : 'shield-outline'}
                  size={32}
                  color={status?.enabled ? '#10B981' : 'rgba(255, 255, 255, 0.5)'}
                />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {status?.enabled ? '2FA Enabled' : '2FA Disabled'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {status?.enabled
                    ? 'Your account is protected with 2FA'
                    : 'Add an extra layer of security'}
                </Text>
              </View>
            </View>
          </View>

          {status?.enabled ? (
            <>
              {/* Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Configured</Text>
                    <Text style={styles.detailValue}>{formatDate(status.configuredAt)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Last Used</Text>
                    <Text style={styles.detailValue}>{formatDate(status.lastUsedAt)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="key-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Method</Text>
                    <Text style={styles.detailValue}>Authenticator App (TOTP)</Text>
                  </View>
                </View>
              </View>

              {/* Backup Codes Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Backup Codes</Text>
                
                <View style={[
                  styles.backupCodesCard,
                  getBackupCodesWarningLevel(status.backupCodesRemaining) === 'warning' && styles.backupCodesWarning,
                  getBackupCodesWarningLevel(status.backupCodesRemaining) === 'critical' && styles.backupCodesCritical,
                ]}>
                  <View style={styles.backupCodesHeader}>
                    <Ionicons
                      name="key"
                      size={24}
                      color={
                        getBackupCodesWarningLevel(status.backupCodesRemaining) === 'critical'
                          ? '#FF6B6B'
                          : getBackupCodesWarningLevel(status.backupCodesRemaining) === 'warning'
                          ? '#F59E0B'
                          : '#10B981'
                      }
                    />
                    <View style={styles.backupCodesInfo}>
                      <Text style={styles.backupCodesCount}>
                        {status.backupCodesRemaining || 0} codes remaining
                      </Text>
                      <Text style={styles.backupCodesExpiry}>
                        Expires: {formatDate(status.backupCodesExpireAt)}
                      </Text>
                    </View>
                  </View>

                  {(status.backupCodesRemaining || 0) < 3 && (
                    <View style={styles.backupCodesAlert}>
                      <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                      <Text style={styles.backupCodesAlertText}>
                        Low on backup codes! Consider regenerating.
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerateBackupCodes}
                  >
                    <Ionicons name="refresh" size={18} color="#4ECDC4" />
                    <Text style={styles.regenerateButtonText}>Regenerate Codes</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={handleDisableTwoFactor}
                >
                  <Ionicons name="shield-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.dangerButtonText}>Disable Two-Factor Authentication</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Enable Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why Enable 2FA?</Text>
                
                <View style={styles.benefitRow}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <Text style={styles.benefitText}>
                    Protect your account from unauthorized access
                  </Text>
                </View>

                <View style={styles.benefitRow}>
                  <Ionicons name="lock-closed" size={24} color="#10B981" />
                  <Text style={styles.benefitText}>
                    Secure your music, messages, and personal data
                  </Text>
                </View>

                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.benefitText}>
                    Industry-standard security using authenticator apps
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={handleEnableTwoFactor}
                >
                  <LinearGradient
                    colors={['#4ECDC4', '#44A08D']}
                    style={styles.enableButtonGradient}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.enableButtonText}>Enable Two-Factor Authentication</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Ionicons name="information-circle-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.helpText}>
              Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when you sign in.
            </Text>
          </View>
        </ScrollView>

        {/* Backup Codes Modal */}
        <BackupCodesModal
          visible={showBackupCodes}
          backupCodes={newBackupCodes}
          onClose={() => {
            setShowBackupCodes(false);
            setNewBackupCodes([]);
          }}
          title="New Backup Codes"
          message="Your old backup codes have been invalidated. Save these new codes in a safe place."
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusIconEnabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusIconDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  backupCodesCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  backupCodesWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  backupCodesCritical: {
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  backupCodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backupCodesInfo: {
    flex: 1,
    marginLeft: 12,
  },
  backupCodesCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  backupCodesExpiry: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  backupCodesAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  backupCodesAlertText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    marginLeft: 8,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  regenerateButtonText: {
    color: '#4ECDC4',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    marginLeft: 16,
    lineHeight: 22,
  },
  enableButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
  },
  enableButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  helpText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
});

