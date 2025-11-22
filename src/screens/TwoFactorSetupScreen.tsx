import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Clipboard,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { setupTOTP, verifySetup, parseTwoFactorError } from '../services/twoFactorAuthConfig';
import BackupCodesModal from '../components/BackupCodesModal';

type SetupStep = 'loading' | 'qrcode' | 'verify' | 'complete';

export default function TwoFactorSetupScreen() {
  const navigation = useNavigation();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('loading');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [sessionToken, setSessionToken] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  
  const codeInputs = useRef<Array<TextInput | null>>([]);

  // Initialize setup
  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      console.log('🔧 Initializing 2FA setup...');
      const response = await setupTOTP();
      
      console.log('📦 Setup response:', response);
      
      setQrCodeUrl(response.qrCode || '');
      setOtpauthUrl(response.otpauthUrl || '');
      setSecret(response.secret || '');
      setBackupCodes(response.backupCodes || []); // Empty if not provided yet
      setSessionToken(response.sessionToken || '');
      
      if (response.expiresAt) {
        setExpiresAt(new Date(response.expiresAt));
      }
      
      setCurrentStep('qrcode');
      console.log('✅ Setup initialized successfully');
    } catch (err: any) {
      console.error('❌ Setup initialization failed:', err);
      const parsedError = parseTwoFactorError(err);
      
      // Check if 2FA is already enabled
      if (parsedError.message?.includes('already enabled') || parsedError.title === '2FA Already Enabled') {
        Alert.alert(
          '2FA Already Enabled',
          'Two-factor authentication is already set up for your account. Go to 2FA Settings to manage it.',
          [
            {
              text: 'Go to Settings',
              onPress: () => {
                navigation.goBack();
                setTimeout(() => {
                  (navigation as any).navigate('TwoFactorSettings');
                }, 100);
              },
            },
            { text: 'Cancel', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Setup Failed', parsedError.message, [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: initializeSetup },
        ]);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (isVerifying) return;

    const code = verificationCode.trim();
    
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log('🔐 Verifying setup code...');
      const verifyResponse = await verifySetup(sessionToken, code);
      
      console.log('✅ Setup verified successfully');
      
      // Store backup codes from verification response
      if (verifyResponse.data?.backupCodes && Array.isArray(verifyResponse.data.backupCodes)) {
        setBackupCodes(verifyResponse.data.backupCodes);
        console.log(`✅ Received ${verifyResponse.data.backupCodes.length} backup codes`);
      }
      
      setCurrentStep('complete');
      
      // Show backup codes modal if available
      if (verifyResponse.data?.backupCodes && verifyResponse.data.backupCodes.length > 0) {
        setShowBackupCodes(true);
      } else {
        // If no backup codes, just show success
        Alert.alert(
          'Success!',
          'Two-factor authentication has been enabled for your account.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      
      const parsedError = parseTwoFactorError(err);
      setError(parsedError.message);
      
      if (parsedError.attemptsRemaining !== undefined) {
        setAttemptsRemaining(parsedError.attemptsRemaining);
        
        if (parsedError.attemptsRemaining === 0) {
          Alert.alert(
            'Too Many Attempts',
            'Your setup session has expired. Please start again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
      
      setVerificationCode('');
      if (codeInputs.current[0]) {
        codeInputs.current[0].focus();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    Clipboard.setString(secret);
    Alert.alert('Copied!', 'Secret key copied to clipboard');
  };

  const handleOpenAuthenticatorApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL(otpauthUrl);
      if (canOpen) {
        await Linking.openURL(otpauthUrl);
      } else {
        Alert.alert(
          'No Authenticator App',
          'Please install an authenticator app like Google Authenticator or Authy to continue.'
        );
      }
    } catch (error) {
      console.error('Failed to open authenticator app:', error);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = verificationCode.split('');
    newCode[index] = text;
    const finalCode = newCode.join('');
    setVerificationCode(finalCode);

    // Auto-focus next input
    if (text && index < 5 && codeInputs.current[index + 1]) {
      codeInputs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (finalCode.length === 6 && /^\d{6}$/.test(finalCode)) {
      handleVerifyCode();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  if (currentStep === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Setting up 2FA...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enable 2FA</Text>
            <View style={{ width: 40 }} />
          </View>

          {currentStep === 'qrcode' && (
            <>
              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Step 1 of 2: Scan QR Code</Text>

              {/* Instructions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📱 Scan with Authenticator App</Text>
                <Text style={styles.sectionText}>
                  Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code:
                </Text>
              </View>

              {/* QR Code */}
              <View style={styles.qrCodeContainer}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.quickAddButton}
                  onPress={handleOpenAuthenticatorApp}
                >
                  <Ionicons name="open-outline" size={16} color="#4ECDC4" />
                  <Text style={styles.quickAddText}>Quick Add</Text>
                </TouchableOpacity>
              </View>

              {/* Manual Entry */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⌨️ Or Enter Manually</Text>
                <Text style={styles.sectionText}>
                  If you can't scan the QR code, enter this key manually:
                </Text>
                <TouchableOpacity
                  style={styles.secretBox}
                  onPress={handleCopySecret}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secretText}>{secret}</Text>
                  <Ionicons name="copy-outline" size={20} color="#4ECDC4" />
                </TouchableOpacity>
              </View>

              {/* Backup Codes Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔑 Backup Codes</Text>
                <Text style={styles.sectionText}>
                  You'll receive 10 backup codes after verification. Keep them safe - they can be used to access your account if you lose your authenticator device.
                </Text>
              </View>

              {/* Next Button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setCurrentStep('verify')}
              >
                <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.nextButtonGradient}>
                  <Text style={styles.nextButtonText}>Next: Verify Code</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {currentStep === 'verify' && (
            <>
              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotComplete]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.stepLine, styles.stepLineActive]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
              <Text style={styles.stepText}>Step 2 of 2: Verify Setup</Text>

              {/* Verify Instructions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔐 Enter Verification Code</Text>
                <Text style={styles.sectionText}>
                  Enter the 6-digit code from your authenticator app to complete setup:
                </Text>
              </View>

              {/* Code Input */}
              <View style={styles.codeInputContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (codeInputs.current[index] = ref)}
                    style={[styles.codeInput, error && styles.codeInputError]}
                    value={verificationCode[index] || ''}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                    editable={!isVerifying}
                  />
                ))}
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Attempts Remaining */}
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <Text style={styles.attemptsText}>
                  {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                </Text>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={isVerifying}
              >
                <LinearGradient
                  colors={isVerifying ? ['#666', '#666'] : ['#4ECDC4', '#44A08D']}
                  style={styles.verifyButtonGradient}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.verifyButtonText}>Complete Setup</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backToQRButton}
                onPress={() => setCurrentStep('qrcode')}
                disabled={isVerifying}
              >
                <Text style={styles.backToQRText}>Back to QR Code</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Backup Codes Modal */}
        {backupCodes && backupCodes.length > 0 && (
          <BackupCodesModal
            visible={showBackupCodes}
            backupCodes={backupCodes}
            onClose={() => {
              setShowBackupCodes(false);
              if (currentStep === 'complete') {
                // After closing backup codes, go back
                Alert.alert(
                  'Success!',
                  'Two-factor authentication has been enabled. Your backup codes have been saved.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              }
            }}
            onConfirm={currentStep === 'complete' ? () => setBackupCodesSaved(true) : undefined}
            title={currentStep === 'complete' ? 'Save Your Backup Codes' : 'Preview: Backup Codes'}
            message={
              currentStep === 'complete'
                ? 'Store these codes in a safe place. You can use them to log in if you lose access to your authenticator app.'
                : 'These are your backup codes. You will be asked to save them after completing setup.'
            }
          />
        )}
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    backgroundColor: '#4ECDC4',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepDotComplete: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4ECDC4',
  },
  stepText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeImage: {
    width: 280,
    height: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickAddText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  secretText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  previewButtonText: {
    color: '#4ECDC4',
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
  },
  nextButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 24,
  },
  codeInput: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: '#FF6B6B',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
  },
  attemptsText: {
    color: '#F59E0B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backToQRButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  backToQRText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
  },
});

