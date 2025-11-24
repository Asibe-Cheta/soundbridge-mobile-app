import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
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
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { verifyCodeDuringLogin, verifyBackupCodeDuringLogin, parseTwoFactorError } from '../services/twoFactorAuthConfig';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { debugLog, debugError, debugWarn } from '../utils/logStore';
import LoginDebugPanel from '../components/LoginDebugPanel';

type RouteParams = {
  TwoFactorVerification: {
    userId: string;
    email: string;
    verificationSessionId?: string; // New: from secure login-initiate flow
    sessionToken?: string; // Legacy: for backward compatibility
  };
};

export default function TwoFactorVerificationScreen() {
  debugLog('🖥️ TwoFactorVerificationScreen RENDERED');
  
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'TwoFactorVerification'>>();
  const { userId, email, verificationSessionId, sessionToken } = route.params;
  // Use verificationSessionId (new) or sessionToken (legacy) for backward compatibility
  const activeSessionId = verificationSessionId || sessionToken;
  debugLog('📋 Route params:', { userId, email, hasVerificationSessionId: !!verificationSessionId, hasSessionToken: !!sessionToken, activeSessionId: !!activeSessionId });
  
  const { refreshUser, setIsChecking2FA, user } = useAuth();
  debugLog('🔧 Auth context:', { hasRefreshUser: !!refreshUser, hasSetIsChecking2FA: !!setIsChecking2FA, hasUser: !!user });

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const codeInputs = useRef<Array<TextInput | null>>([]);
  
  // Track if component is mounted (Claude's solution)
  const isMountedRef = useRef(true);
  
  // Track if verification succeeded - USING STATE instead of ref to trigger useEffect
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  // Track if navigation has been attempted (prevent multiple attempts)
  const navigationAttemptedRef = useRef(false);
  
  // Track loading message for better UX
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Cleanup on unmount (Claude's solution)
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-navigate when user is set after successful verification (Claude's solution)
  useEffect(() => {
    debugLog('🔍 Navigation useEffect triggered:', {
      verificationSuccess,
      hasUser: !!user,
      userId: user?.id,
      navigationAttempted: navigationAttemptedRef.current,
    });
    
    // Only navigate if verification succeeded AND user is set AND we haven't navigated yet
    if (verificationSuccess && user && !navigationAttemptedRef.current) {
      debugLog('✅✅✅ ALL CONDITIONS MET - NAVIGATING TO MAINTABS ✅✅✅');
      debugLog('🔍 Navigation state check:', {
        verificationSuccess,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        navigationReady: !!navigation,
        alreadyAttempted: navigationAttemptedRef.current,
      });
      
      // Mark navigation as attempted to prevent multiple attempts
      navigationAttemptedRef.current = true;
      
      // Small delay to ensure all state updates are complete
      const navigateTimer = setTimeout(() => {
        try {
          debugLog('🚀 Dispatching navigation to MainTabs...');
          // Use CommonActions.reset to properly navigate to MainTabs
          // This works even when MainTabs is in a different stack
          (navigation as any).dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
          debugLog('✅✅✅ Navigation dispatched successfully ✅✅✅');
        } catch (err) {
          debugError('❌ Navigation error:', err);
          // Reset the flag so we can try again
          navigationAttemptedRef.current = false;
          // Fallback: Let AppNavigator handle it automatically
          debugLog('⚠️ Falling back to AppNavigator automatic navigation');
        }
      }, 200); // Small delay to ensure state propagation
      
      return () => clearTimeout(navigateTimer);
    } else {
      debugLog('⏸️ Navigation conditions not met:', {
        verificationSuccess,
        hasUser: !!user,
        navigationAttempted: navigationAttemptedRef.current,
      });
    }
  }, [verificationSuccess, user, navigation]);

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
    debugLog('🔐🔐🔐 handleVerify CALLED 🔐🔐🔐');
    debugLog('🔐 Current state:', {
      isLoading,
      lockoutTime,
      code,
      codeLength: code.length,
      useBackupCode,
      hasUserId: !!userId,
      hasVerificationSessionId: !!activeSessionId,
    });
    
    if (isLoading || lockoutTime) {
      debugWarn('⚠️ Verify blocked: isLoading=', isLoading, 'lockoutTime=', lockoutTime);
      return;
    }

    // Clean the code - remove all non-digit characters for TOTP, or clean backup code format
    let cleanedCode: string;
    if (useBackupCode) {
      cleanedCode = code.replace(/[\s-]/g, '').toUpperCase();
    } else {
      cleanedCode = code.replace(/\D/g, ''); // Remove all non-digits
    }
    
    debugLog('🔐 handleVerify called:', {
      originalCode: code,
      cleanedCode,
      codeLength: cleanedCode.length,
      useBackupCode,
    });

    if (!cleanedCode) {
      Alert.alert('Error', 'Please enter your verification code');
      return;
    }

    if (useBackupCode) {
      if (cleanedCode.length !== 8) {
        Alert.alert('Error', 'Backup codes are 8 characters long');
        return;
      }
    } else {
      // Validate TOTP code: must be exactly 6 digits
      debugLog('🔍 Validating TOTP code:', {
        originalCode: code,
        cleanedCode,
        cleanedCodeLength: cleanedCode.length,
        isAllDigits: /^\d+$/.test(cleanedCode),
        isExactly6Digits: /^\d{6}$/.test(cleanedCode),
      });
      
      if (!cleanedCode) {
        debugError('❌ Code is empty after cleaning');
        Alert.alert('Invalid Code', 'Please enter a 6-digit code from your authenticator app');
        return;
      }
      
      if (cleanedCode.length !== 6) {
        debugError('❌ Invalid TOTP code length:', {
          originalCode: code,
          cleanedCode,
          length: cleanedCode.length,
          expectedLength: 6,
        });
        Alert.alert('Invalid Code', `Please enter exactly 6 digits. You entered ${cleanedCode.length}.`);
        // Don't clear the code - let user fix it
        return;
      }
      
      if (!/^\d{6}$/.test(cleanedCode)) {
        debugError('❌ Invalid TOTP code format (not all digits):', {
          cleanedCode,
          isDigits: /^\d{6}$/.test(cleanedCode),
        });
        Alert.alert('Invalid Code', 'The code must contain only numbers (0-9)');
        // Don't clear the code - let user fix it
        return;
      }
      
      debugLog('✅ Code validation passed:', cleanedCode);
    }

    debugLog('✅ Code validation passed, calling API...');
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Verifying code...');
    setVerificationSuccess(false); // Reset success flag (using state now)
    navigationAttemptedRef.current = false; // Reset navigation attempt flag

    try {
      if (useBackupCode) {
        debugLog('🔐 Verifying backup code...', { userId, verificationSessionId: activeSessionId?.substring(0, 20) + '...', codeLength: cleanedCode.length });
        const result = await verifyBackupCodeDuringLogin(userId, activeSessionId!, cleanedCode);
        
        debugLog('📊 Backup code verification result:', { success: result.success, error: result.error });
        
        if (!result.success) {
          throw new Error(result.error || 'Backup code verification failed');
        }
        
        debugLog('✅ Backup code verification successful');
        debugLog('📊 Result details:', {
          success: result.success,
          hasAccessToken: !!(result as any).accessToken,
          hasRefreshToken: !!(result as any).refreshToken,
          error: result.error,
        });
        
        // Note: Session is set internally by verifyBackupCodeDuringLogin
        // We don't need tokens in response since we wait for user state via useEffect
        
        if (result.warning) {
          Alert.alert('Warning', result.warning);
        }
        
        // Step 2: Session is already set by verifyBackupCodeDuringLogin (it awaits setSupabaseSessionFromTokens)
        // Just wait a moment for user state to propagate from onAuthStateChange
        if (!isMountedRef.current) return;
        
        setLoadingMessage('Establishing session...');
        debugLog('⏳ Session already set, waiting for user state to propagate...');
        
        // Wait for user state to propagate (fixed delay - simpler than polling)
        // The session is already set, we just need AuthContext to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 3: Clear 2FA flag and mark verification as successful
        if (!isMountedRef.current) return;
        
        debugLog('✅ Session established, clearing 2FA flag and marking verification success');
        debugLog('🔍 User state at this point:', { hasUser: !!user, userId: user?.id });
        
        setIsChecking2FA(false);
        
        // Now set verification success - this will trigger the navigation useEffect
        setVerificationSuccess(true);
        
        setLoadingMessage('Success! Redirecting...');
        
        debugLog('✅✅✅ Verification success flag set to TRUE - useEffect should trigger now ✅✅✅');
      } else {
        debugLog('🔐 Verifying TOTP code...', { userId, verificationSessionId: activeSessionId?.substring(0, 20) + '...', code: cleanedCode });
        const result = await verifyCodeDuringLogin(userId, activeSessionId!, cleanedCode, false);
        
        debugLog('📊 TOTP code verification result:', { success: result.success, error: result.error, hasAccessToken: !!(result as any).accessToken });
        
        if (!result.success) {
          throw new Error(result.error || 'TOTP code verification failed');
        }
        
        debugLog('✅ TOTP code verification successful');
        debugLog('📊 Result details:', {
          success: result.success,
          hasAccessToken: !!(result as any).accessToken,
          hasRefreshToken: !!(result as any).refreshToken,
          error: result.error,
        });
        
        // Check if we actually got tokens
        if (!(result as any).accessToken || !(result as any).refreshToken) {
          debugError('❌ No access/refresh tokens in response!');
          debugError('📊 Full result:', JSON.stringify(result, null, 2));
          throw new Error('Verification succeeded but no tokens received. Please try again.');
        }
        
        // Step 2: Session is already set by verifyCodeDuringLogin (it awaits setSupabaseSessionFromTokens)
        // Just wait a moment for user state to propagate from onAuthStateChange
        if (!isMountedRef.current) return;
        
        setLoadingMessage('Establishing session...');
        debugLog('⏳ Session already set, waiting for user state to propagate...');
        
        // Wait for user state to propagate (fixed delay - simpler than polling)
        // The session is already set, we just need AuthContext to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 3: Clear 2FA flag and mark verification as successful
        if (!isMountedRef.current) return;
        
        debugLog('✅ Session established, clearing 2FA flag and marking verification success');
        debugLog('🔍 User state at this point:', { hasUser: !!user, userId: user?.id });
        
        setIsChecking2FA(false);
        
        // Now set verification success - this will trigger the navigation useEffect
        setVerificationSuccess(true);
        
        setLoadingMessage('Success! Redirecting...');
        
        debugLog('✅✅✅ Verification success flag set to TRUE - useEffect should trigger now ✅✅✅');
      }
    } catch (err: any) {
      debugError('❌ Verification failed:', err);
      
      // Only update state if component is still mounted (Claude's solution)
      if (isMountedRef.current) {
        const parsedError = parseTwoFactorError(err);
        setError(parsedError.message);
        
        if (parsedError.attemptsRemaining !== undefined) {
          setAttemptsRemaining(parsedError.attemptsRemaining);
        }
        
        if (parsedError.lockoutTime) {
          setLockoutTime(parsedError.lockoutTime);
        }
        
        setCode('');
        setIsLoading(false);
        setLoadingMessage('');
        setVerificationSuccess(false); // Use state instead of ref
        
        if (codeInputs.current[0]) {
          codeInputs.current[0].focus();
        }
      }
    }
    // Note: No finally block - we handle loading state in the useEffect (Claude's solution)
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
      // Only allow digits, remove any non-digit characters
      const digitOnly = text.replace(/\D/g, '');
      if (digitOnly.length > 1) {
        // Handle paste or multiple digits
        const digits = digitOnly.slice(0, 6);
        setCode(digits);
        // Focus the last input that has a digit
        const lastIndex = Math.min(digits.length - 1, 5);
        if (codeInputs.current[lastIndex]) {
          codeInputs.current[lastIndex]?.focus();
        }
        // Auto-submit if we have 6 digits
        if (digits.length === 6) {
          setTimeout(() => handleVerify(), 100);
        }
        return;
      }
      
      // Single digit input
      const currentCode = code.replace(/\D/g, ''); // Clean existing code
      const newCodeArray = currentCode.split('');
      if (digitOnly) {
        newCodeArray[index] = digitOnly;
      } else {
        // Backspace - remove digit at this index
        newCodeArray[index] = '';
      }
      const finalCode = newCodeArray.join('').slice(0, 6); // Ensure max 6 digits
      
      debugLog('📝 Code input changed:', {
        index,
        digitOnly,
        currentCode,
        finalCode,
        finalCodeLength: finalCode.length,
      });
      
      setCode(finalCode);

      // Auto-focus next input
      if (digitOnly && index < 5 && codeInputs.current[index + 1]) {
        codeInputs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered (only if not already loading)
      if (finalCode.length === 6 && /^\d{6}$/.test(finalCode) && !isLoading && !lockoutTime) {
        debugLog('🚀 Auto-submitting code (6 digits entered):', finalCode);
        // Use a small delay to ensure state is fully updated
        setTimeout(() => {
          // Double-check the code state is still valid before submitting
          const currentCode = code.replace(/\D/g, '');
          if (currentCode.length === 6 && /^\d{6}$/.test(currentCode) && !isLoading && !lockoutTime) {
            debugLog('✅ Code validated, calling handleVerify');
            handleVerify();
          } else {
            debugWarn('⚠️ Code validation failed in auto-submit:', {
              currentCode,
              length: currentCode.length,
              isLoading,
              lockoutTime,
            });
          }
        }, 200);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const cleanCode = code.replace(/\D/g, '');
      // If current field is empty or we're deleting, move to previous field
      if (!cleanCode[index] && index > 0) {
        codeInputs.current[index - 1]?.focus();
      } else if (cleanCode[index]) {
        // Delete the digit at current index
        const newCodeArray = cleanCode.split('');
        newCodeArray[index] = '';
        setCode(newCodeArray.join(''));
      }
    }
  };

  const renderTOTPInput = () => {
    // Ensure code is always 6 digits, pad with empty string for display
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    const codeArray = cleanCode.split('').concat(Array(6 - cleanCode.length).fill(''));
    
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
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0 && cleanCode.length === 0}
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
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => setShowDebugPanel(true)}
              >
                <Ionicons name="bug" size={24} color="#FFFFFF" />
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

            {/* Loading Message - Removed separate container to avoid double spinner */}

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

            {/* Verify Button - Moved outside ScrollView for better touch handling */}
          </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Verify Button Container - COMPLETELY outside KeyboardAvoidingView with absolute positioning (Web team's solution) */}
        <View 
          style={styles.verifyButtonContainer}
          pointerEvents="box-none"
        >
          {/* Main Verify Button - Using Pressable (Web team's recommendation) */}
          <Pressable
            style={({ pressed }) => [
              styles.verifyButton,
              pressed && styles.verifyButtonPressed,
              (isLoading || lockoutTime) && styles.verifyButtonDisabled,
            ]}
            onPress={() => {
              debugLog('🔘🔘🔘 VERIFY BUTTON PRESSED - START 🔘🔘🔘');
              debugLog('🔘 Button state:', {
                code,
                codeLength: code.length,
                isLoading,
                lockoutTime,
                useBackupCode,
                disabled: isLoading || !!lockoutTime,
              });
              
              if (isLoading) {
                debugWarn('⚠️ Verify blocked: already loading');
                Alert.alert('Please wait', 'Verification in progress...');
                return;
              }
              
              if (lockoutTime) {
                debugWarn('⚠️ Verify blocked: account locked');
                Alert.alert('Account Locked', 'Please wait before trying again.');
                return;
              }
              
              debugLog('✅ All checks passed, calling handleVerify...');
              try {
                handleVerify();
              } catch (err) {
                debugError('❌ Error calling handleVerify:', err);
                Alert.alert('Error', 'Failed to verify code. Please try again.');
              }
              debugLog('🔘🔘🔘 VERIFY BUTTON PRESSED - END 🔘🔘🔘');
            }}
            onPressIn={() => {
              debugLog('🔘🔘🔘 onPressIn FIRED! Button is being touched!');
            }}
            onPressOut={() => {
              debugLog('🔘🔘🔘 onPressOut FIRED!');
            }}
            disabled={isLoading || !!lockoutTime}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityLabel="Verify 2FA code"
            accessibilityRole="button"
            testID="verify-2fa-button"
          >
            {({ pressed }) => (
              <View style={styles.verifyButtonGradient}>
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    {loadingMessage ? (
                      <Text style={styles.loadingButtonText}>{loadingMessage}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {lockoutTime ? 'Locked' : 'Verify'}
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
        
        {/* Toggle Backup Code - Also outside KeyboardAvoidingView */}
        {!lockoutTime && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleBackupCodeMode}
              disabled={isLoading}
            >
              <Text style={styles.toggleButtonText}>
                {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Help Text - Outside KeyboardAvoidingView */}
        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.5)" />
          <Text style={styles.helpText}>
            {useBackupCode
              ? 'Backup codes can only be used once'
              : 'Codes refresh every 30 seconds'}
          </Text>
        </View>
      </LinearGradient>
      
      {/* Debug Panel */}
      <LoginDebugPanel
        visible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
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
  verifyButtonContainer: {
    position: 'absolute',
    bottom: 180, // Moved much higher - was 120, now 180 to be well above all text
    left: 24,
    right: 24,
    zIndex: 1000,
    elevation: 10, // Android
    pointerEvents: 'box-none', // Allow touches to pass through container
  },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#4ECDC4', // Fallback background
    minHeight: 56,
  },
  verifyButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  verifyButtonPressed: {
    opacity: 0.7,
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 140, // Position below verify button (button is at 180, so 140 gives 40px gap)
    left: 24,
    right: 24,
    zIndex: 999,
  },
  verifyButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none', // Don't block touches
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
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
    position: 'absolute',
    bottom: 20, // At the very bottom
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 998,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
  },
  loadingMessage: {
    color: '#4ECDC4',
    fontSize: 14,
    marginLeft: 8,
  },
});

