import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { verifyCode, verifyBackupCode, parseTwoFactorError } from '../services/twoFactorAuthConfig';

type RouteParams = {
  TwoFactorVerification: {
    userId: string;
    email: string;
    sessionToken: string;
  };
};

export default function TwoFactorVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'TwoFactorVerification'>>();
  const { userId, email, sessionToken } = route.params;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const codeInputs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutTime) {
      const targetTime = new Date(lockoutTime).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
        setCountdown(remaining);
        
        if (remaining === 0) {
          setLockoutTime(null);
          setError(null);
          setAttemptsRemaining(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTime]);

  const handleVerify = async () => {
    if (isLoading || lockoutTime) return;

    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      Alert.alert('Error', 'Please enter your verification code');
      return;
    }

    if (useBackupCode) {
      if (trimmedCode.replace(/[\s-]/g, '').length !== 8) {
        Alert.alert('Error', 'Backup codes are 8 characters long');
        return;
      }
    } else {
      if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
        Alert.alert('Error', 'Verification codes are 6 digits');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (useBackupCode) {
        console.log('🔐 Verifying backup code...');
        const result = await verifyBackupCode(userId, sessionToken, trimmedCode);
        
        console.log('✅ Backup code verification successful');
        
        if (result.warning) {
          Alert.alert('Warning', result.warning);
        }
        
        // Success - navigate to home
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        console.log('🔐 Verifying TOTP code...');
        await verifyCode(userId, sessionToken, trimmedCode, false);
        
        console.log('✅ TOTP code verification successful');
        
        // Success - navigate to home
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      
      const parsedError = parseTwoFactorError(err);
      setError(parsedError.message);
      
      if (parsedError.attemptsRemaining !== undefined) {
        setAttemptsRemaining(parsedError.attemptsRemaining);
      }
      
      if (parsedError.lockoutTime) {
        setLockoutTime(parsedError.lockoutTime);
      }
      
      setCode('');
      if (codeInputs.current[0]) {
        codeInputs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBackupCodeMode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError(null);
    setAttemptsRemaining(null);
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (text: string, index: number) => {
    if (useBackupCode) {
      // Backup code mode - single input
      setCode(text.toUpperCase());
    } else {
      // TOTP mode - 6 separate inputs
      const newCode = code.split('');
      newCode[index] = text;
      const finalCode = newCode.join('');
      setCode(finalCode);

      // Auto-focus next input
      if (text && index < 5 && codeInputs.current[index + 1]) {
        codeInputs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      if (finalCode.length === 6 && /^\d{6}$/.test(finalCode)) {
        handleVerify();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const renderTOTPInput = () => {
    const codeArray = code.padEnd(6, ' ').split('').slice(0, 6);
    
    return (
      <View style={styles.codeInputContainer}>
        {codeArray.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (codeInputs.current[index] = ref)}
            style={[
              styles.codeInput,
              error && styles.codeInputError,
            ]}
            value={digit.trim()}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
            editable={!isLoading && !lockoutTime}
          />
        ))}
      </View>
    );
  };

  const renderBackupCodeInput = () => {
    return (
      <TextInput
        style={[
          styles.backupCodeInput,
          error && styles.backupCodeInputError,
        ]}
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        placeholder="XXXX-XXXX"
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        maxLength={9} // 8 chars + 1 hyphen
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        editable={!isLoading && !lockoutTime}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={useBackupCode ? 'key' : 'shield-checkmark'}
                  size={60}
                  color="#4ECDC4"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {useBackupCode ? 'Enter Backup Code' : 'Two-Factor Authentication'}
            </Text>
            <Text style={styles.subtitle}>
              {useBackupCode
                ? 'Enter one of your 8-character backup codes'
                : `Enter the 6-digit code from your authenticator app`}
            </Text>
            <Text style={styles.email}>{email}</Text>

            {/* Code Input */}
            <View style={styles.inputSection}>
              {useBackupCode ? renderBackupCodeInput() : renderTOTPInput()}
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

            {/* Lockout Countdown */}
            {lockoutTime && countdown > 0 && (
              <View style={styles.lockoutContainer}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.lockoutText}>
                  Account locked. Try again in {formatCountdown(countdown)}
                </Text>
              </View>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (isLoading || lockoutTime) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={isLoading || !!lockoutTime}
            >
              <LinearGradient
                colors={lockoutTime ? ['#666', '#666'] : ['#4ECDC4', '#44A08D']}
                style={styles.verifyButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {lockoutTime ? 'Locked' : 'Verify'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Backup Code */}
            {!lockoutTime && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleBackupCodeMode}
                disabled={isLoading}
              >
                <Text style={styles.toggleButtonText}>
                  {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.helpText}>
                {useBackupCode
                  ? 'Backup codes can only be used once'
                  : 'Codes refresh every 30 seconds'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  email: {
    fontSize: 14,
    color: '#4ECDC4',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputSection: {
    marginBottom: 24,
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
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
  backupCodeInput: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  backupCodeInputError: {
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
  lockoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  lockoutText: {
    color: '#F59E0B',
    fontSize: 14,
    marginLeft: 8,
  },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    padding: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#4ECDC4',
    fontSize: 15,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginLeft: 6,
  },
});

