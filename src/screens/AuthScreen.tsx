import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Image,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import * as BiometricAuth from '../services/biometricAuth';
import { loginWithTwoFactorCheck } from '../services/twoFactorAuthConfig';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const navigation = useNavigation();
  const { setIsChecking2FA } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const { signIn, signUp, signInWithGoogle, resetPassword, resendConfirmation, error, refreshUser, session } = useAuth();

  // Debug logging functions
  const debugLog = (...args: any[]) => {
    console.log('[AuthScreen]', ...args);
  };

  const debugError = (...args: any[]) => {
    console.error('[AuthScreen]', ...args);
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Reset animations when switching modes
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSignUp, isForgotPassword]);

  // Check biometric availability on mount and auto-trigger if enabled
  useEffect(() => {
    const checkAndAutoBiometric = async () => {
      const capability = await BiometricAuth.checkBiometricAvailability();
      setBiometricAvailable(capability.available && capability.enrolled);
      
      if (capability.available && capability.enrolled) {
        const typeName = BiometricAuth.getBiometricTypeName(capability.types);
        setBiometricType(typeName);
        
        const enabled = await BiometricAuth.isBiometricLoginEnabled();
        setBiometricEnabled(enabled);
        console.log(`✅ ${typeName} available and ${enabled ? 'enabled' : 'not enabled'}`);
        
        // Auto-trigger biometric login if enabled (only on login screen)
        if (enabled && !isSignUp && !isForgotPassword) {
          console.log('🔐 Auto-triggering biometric login...');
          // Small delay to ensure UI is ready
          setTimeout(() => {
            handleBiometricLogin(true); // Pass true to indicate auto-trigger
          }, 500);
        }
      }
    };
    
    checkAndAutoBiometric();
  }, [isSignUp, isForgotPassword]); // Re-run when switching between login/signup/forgot

  const hasNeonEffect = (inputName: string) => {
    return focusedInput === inputName;
  };

  const handleResendVerification = async () => {
    if (!verificationEmail && !email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailToUse = verificationEmail || email;
    setIsLoading(true);
    
    try {
      const { success, error } = await resendConfirmation(emailToUse);
      
      if (success) {
        Alert.alert(
          'Email Sent',
          'Verification email has been resent. Please check your inbox.'
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to resend verification email');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async (isAutoTrigger = false) => {
    debugLog('🔐 handleBiometricLogin called, isAutoTrigger:', isAutoTrigger);
    setIsLoading(true);
    
    try {
      debugLog('📱 Prompting for biometric authentication...');
      const credentials = await BiometricAuth.getBiometricCredentials();
      
      if (!credentials) {
        // If this was an auto-trigger on app launch, fail silently
        // If user manually triggered it, show an error
        if (!isAutoTrigger) {
          Alert.alert('Biometric Login Failed', 'Could not retrieve stored credentials. Please enable biometric login from your profile settings after logging in.');
        }
        debugLog('⚠️ Biometric login skipped - no stored credentials or authentication cancelled');
        setIsLoading(false);
        return;
      }

      debugLog('✅ Biometric authentication successful, credentials retrieved for:', credentials.email);
      
      // Fill the form fields so user can see what's happening
      setEmail(credentials.email);
      setPassword(credentials.password);
      
      // Auto-accept terms when biometric succeeds (user already agreed when enabling biometric)
      setTermsAccepted(true);

      debugLog('🔐 Attempting to sign in with biometric credentials...');
      debugLog('📧 Email:', credentials.email);
      debugLog('🔑 Password length:', credentials.password.length);
      
      const { success, error } = await signIn(credentials.email, credentials.password);
      
      debugLog('📊 Sign in result:', { success, error: error?.message });
      
      if (!success) {
        debugError('❌ Biometric login failed:', error?.message);
        // Show error with option to disable biometric login
        Alert.alert(
          'Biometric Login Failed', 
          error?.message || 'Could not log in with stored credentials. Your password may have changed.',
          [
            { 
              text: 'Disable Biometric Login', 
              style: 'destructive',
              onPress: async () => {
                try {
                  // Force disable without requiring biometric auth since credentials are invalid
                  await BiometricAuth.disableBiometricLogin(true);
                  setBiometricEnabled(false);
                  setEmail('');
                  setPassword('');
                  setTermsAccepted(false);
                  Alert.alert('Biometric Login Disabled', 'Please log in manually with your correct credentials. You can re-enable biometric login after logging in.');
                } catch (err) {
                  debugError('Failed to disable biometric login:', err);
                }
                setIsLoading(false);
              }
            },
            { 
              text: 'Try Again Manually', 
              onPress: () => {
                // Keep email, clear password so user can try again
                setPassword('');
                setIsLoading(false);
              }
            }
          ]
        );
        return; // Don't clear loading in finally block if we already handled it
      } else {
        debugLog('✅ Biometric login successful!');
        // Success is handled by auth state change
      }
    } catch (err: any) {
      debugError('❌ Biometric login error:', err);
      debugError('Error details:', err.message, err.stack);
      // Show error even on auto-trigger
      Alert.alert(
        'Biometric Login Error', 
        'An unexpected error occurred. Please try logging in manually.',
        [{ text: 'OK', onPress: () => {
          setPassword('');
          setIsLoading(false);
        }}]
      );
      return; // Don't clear loading in finally block if we already handled it
    } finally {
      // Only clear loading if we didn't handle it in error cases above
      if (setIsLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

          setIsLoading(true);
    
    try {
      // Use the new 2FA-aware login flow
      // Note: We DON'T set isChecking2FA here because loginWithTwoFactorCheck
      // will sign out if 2FA is required, preventing navigation
      debugLog('🔐 Starting login with 2FA check...');
      const result = await loginWithTwoFactorCheck(email, password);
      
      debugLog('📊 Login result:', JSON.stringify({
        requires2FA: result.requires2FA,
        hasUserId: !!result.userId,
        hasSessionToken: !!result.sessionToken,
        hasSession: !!result.session,
      }, null, 2));
      
      if (result.requires2FA) {
        // 2FA is required - navigate to verification screen
        debugLog('🔐 2FA required - navigating to verification screen');
        debugLog('🔑 Verification Session ID:', result.verificationSessionId?.substring(0, 20) + '...');
        debugLog('🔑 Session token (legacy):', result.sessionToken?.substring(0, 20) + '...');
        
        // Check for either verificationSessionId (new) or sessionToken (legacy)
        const activeSessionId = result.verificationSessionId || result.sessionToken;
        if (!result.userId || !activeSessionId) {
          debugError('❌ Missing required information for 2FA verification');
          Alert.alert('Error', 'Missing required information for 2FA verification. Please try again.');
          setIsLoading(false);
          return;
        }
        
        // Set flag to track 2FA flow (for internal state, not UI control)
        setIsChecking2FA(true);
        debugLog('🚩 2FA check flag set to true (2FA required)');
        
        debugLog('📤 Navigating to TwoFactorVerification with:', JSON.stringify({
          userId: result.userId,
          email: result.email || email,
          hasSessionToken: !!result.sessionToken,
        }, null, 2));
        
        // Navigate to 2FA screen - use navigate instead of reset for cleaner flow
        // The 2FA screen will handle its own loading state
        (navigation as any).navigate('TwoFactorVerification', {
          userId: result.userId,
          email: result.email || email,
          verificationSessionId: result.verificationSessionId, // New: from secure login-initiate flow
          sessionToken: result.sessionToken, // Legacy: for backward compatibility
        });
        
        debugLog('✅ Navigated to 2FA verification screen');
        // Don't clear loading here - let the 2FA screen take over
        return; // Exit early - don't proceed to app
      } else {
        // Login successful without 2FA - clear the flag
        // onAuthStateChange will have already set the user state
        debugLog('✅ Login successful without 2FA');
        setIsChecking2FA(false);
        debugLog('🚩 2FA check flag cleared (2FA not required)');
        // User state should already be set by onAuthStateChange
        // No need to manually set it
        
        // Offer to enable or update biometric login (optional)
        if (biometricAvailable) {
          if (!biometricEnabled) {
            // Offer to enable biometric login for the first time
            setTimeout(() => {
              Alert.alert(
                `Enable ${biometricType} Login?`,
                'Would you like to enable biometric login for faster access next time?',
                [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Enable',
                    onPress: async () => {
                      const result = await BiometricAuth.enableBiometricLogin(email, password);
                      if (result.success) {
                        setBiometricEnabled(true);
                        Alert.alert('Success', `${biometricType} login enabled!`);
                      } else {
                        Alert.alert('Error', result.error || 'Failed to enable biometric login');
                      }
                    },
                  },
                ]
              );
            }, 500);
          } else {
            // Biometric is enabled - offer to update stored credentials
            setTimeout(() => {
              Alert.alert(
                `Update ${biometricType} Login?`,
                'Would you like to update your stored credentials for biometric login?',
                [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Update',
                    onPress: async () => {
                      const result = await BiometricAuth.updateBiometricCredentials(email, password);
                      if (result.success) {
                        Alert.alert('Success', `${biometricType} login credentials updated!`);
                      } else {
                        Alert.alert('Error', result.error || 'Failed to update biometric login');
                      }
                    },
                  },
                ]
              );
            }, 500);
          }
        }
        
        // User is logged in - AppNavigator will handle navigation based on user state
        debugLog('✅ Login flow complete - AppNavigator will handle navigation');
      }
    } catch (err: any) {
      debugError('❌ Login error:', err);
      debugError('📊 Error message:', err.message);
      debugError('📊 Error stack:', err.stack);
      
      // ⚠️ CRITICAL: Always clear 2FA check flag on error
      setIsChecking2FA(false);
      debugLog('🚩 2FA check flag cleared (error occurred)');
      
      // Handle email verification errors
      if (err.message?.includes('Email not confirmed')) {
        setNeedsEmailVerification(true);
        setVerificationEmail(email);
        Alert.alert(
          'Email Verification Required',
          'Please verify your email before signing in. Check your inbox for the verification link.',
          [
            { text: 'Resend Email', onPress: handleResendVerification },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Login Failed', err.message || 'An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signUp(email, password);
      
      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error?.message || 'An error occurred during sign up');
      } else {
        // Check if email verification is needed
        if (result.needsEmailVerification) {
          setNeedsEmailVerification(true);
          setVerificationEmail(email);
          Alert.alert(
            'Verify Your Email',
            'We\'ve sent a verification link to your email. Please check your inbox and click the link to verify your account.',
            [
              { text: 'Resend Email', onPress: handleResendVerification },
              { text: 'OK', onPress: () => {
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setTermsAccepted(false);
              }}
            ]
          );
        } else {
          Alert.alert('Success', 'Account created successfully!');
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setTermsAccepted(false);
        }
      }
    } catch (err) {
      Alert.alert('Sign Up Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const { success, error } = await signInWithGoogle();
      
      if (!success) {
        Alert.alert('Google Login Failed', error?.message || 'An error occurred during Google login');
      }
      // Success is handled by auth state change
    } catch (err) {
      Alert.alert('Google Login Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { success, error } = await resetPassword(email);
      
      if (!success) {
        Alert.alert('Reset Failed', error?.message || 'Failed to send reset email');
      } else {
        Alert.alert(
          'Reset Email Sent', 
          'Check your email for instructions to reset your password.',
          [{ text: 'OK', onPress: () => setIsForgotPassword(false) }]
        );
      }
    } catch (err) {
      Alert.alert('Reset Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSignUpMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setFocusedInput(null);
    setNeedsEmailVerification(false);
    setVerificationEmail('');
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setFocusedInput(null);
    setNeedsEmailVerification(false);
    setVerificationEmail('');
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const renderInput = (inputName: string, placeholder: string, value: string, onChangeText: (text: string) => void, secureTextEntry = false) => {
    const hasNeon = hasNeonEffect(inputName);
    
    if (hasNeon) {
      return (
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.neonBorderContainer}
        >
          <BlurView intensity={20} tint="dark" style={styles.glassInputNeon}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setFocusedInput(inputName)}
              onBlur={() => setFocusedInput(null)}
              secureTextEntry={secureTextEntry}
              keyboardType={inputName === 'email' ? 'email-address' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </BlurView>
        </LinearGradient>
      );
    }

    return (
      <BlurView intensity={20} tint="dark" style={styles.glassInput}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedInput(inputName)}
          onBlur={() => setFocusedInput(null)}
          secureTextEntry={secureTextEntry}
          keyboardType={inputName === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </BlurView>
    );
  };

  const renderPasswordInput = (inputName: string, placeholder: string, value: string, onChangeText: (text: string) => void, showPassword: boolean, setShowPassword: (show: boolean) => void) => {
    const hasNeon = hasNeonEffect(inputName);
    
    if (hasNeon) {
      return (
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.neonBorderContainer}
        >
          <BlurView intensity={20} tint="dark" style={styles.glassInputNeon}>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={placeholder}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setFocusedInput(inputName)}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </TouchableOpacity>
            </View>
          </BlurView>
        </LinearGradient>
      );
    }

    return (
      <BlurView intensity={20} tint="dark" style={styles.glassInput}>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocusedInput(inputName)}
            onBlur={() => setFocusedInput(null)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  return (
    <LinearGradient
      colors={['#0A0E1A', '#1A2332', '#0F1419']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      
      {/* Background Gradients - ElevenLabs-inspired blues */}
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.15)', 'rgba(147, 197, 253, 0.1)', 'rgba(96, 165, 250, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient1}
      />
      <LinearGradient
        colors={['rgba(96, 165, 250, 0.1)', 'rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.08)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient2}
      />
      
      {/* Background Image with overlay */}
      <Image
        source={require('../../assets/auth-bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.imageOverlay} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.formContainer}>
          {/* SoundBridge Logo */}
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/images/logos/logo-trans-lockup.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title and Description */}
          <Text style={styles.title}>
            {isForgotPassword ? 'Reset Password' : 
             isSignUp ? 'Create Account' : 'Welcome to SoundBridge'}
          </Text>
          <Text style={styles.subtitle}>
            {isForgotPassword 
              ? 'Enter your email to receive reset instructions.' :
              isSignUp 
              ? 'Sign up to start creating and sharing music.' 
              : 'Login or create an account to start listening.'
            }
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {renderInput('email', 'Email', email, setEmail)}
            
            {/* Email Verification Notice */}
            {needsEmailVerification && verificationEmail && (
              <View style={styles.verificationNotice}>
                <Ionicons name="mail-outline" size={20} color="#F59E0B" />
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationText}>
                    Verification email sent to {verificationEmail}
                  </Text>
                  <TouchableOpacity onPress={handleResendVerification}>
                    <Text style={styles.resendLink}>Resend Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {!isForgotPassword && renderPasswordInput('password', 'Password', password, setPassword, showPassword, setShowPassword)}
            
            {/* Password Strength Indicator (Sign Up Only) */}
            {isSignUp && !isForgotPassword && password && (
              <PasswordStrengthIndicator 
                password={password} 
                showSuggestions={true} 
              />
            )}
            
            {isSignUp && !isForgotPassword && renderPasswordInput('confirmPassword', 'Confirm Password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword)}

            {/* Legal Compliance - Login Screen (Mandatory Checkbox) */}
            {!isSignUp && !isForgotPassword && (
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.termsText}>
                    By checking this box and tapping continue, you acknowledge that you have read the{' '}
                    <Text style={styles.linkText} onPress={() => openLink('https://www.soundbridge.live/legal/privacy')}>
                      Privacy Policy
                    </Text>
                    {' '}and agree to the{' '}
                    <Text style={styles.linkText} onPress={() => openLink('https://www.soundbridge.live/legal/terms')}>
                      Terms of Service
                    </Text>
                    .
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Legal Compliance - Sign Up Screen (Text Only) */}
            {isSignUp && !isForgotPassword && (
              <View style={styles.termsContainer}>
                <Text style={styles.termsTextSignUp}>
                  By continuing to Sign Up, you acknowledge that you have read the{' '}
                  <Text style={styles.linkText} onPress={() => openLink('https://www.soundbridge.live/legal/privacy')}>
                    Privacy Policy
                  </Text>
                  {' '}and agree to the{' '}
                  <Text style={styles.linkText} onPress={() => openLink('https://www.soundbridge.live/legal/terms')}>
                    Terms of Service
                  </Text>
                  .
                </Text>
              </View>
            )}

            {/* Main Action Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isLoading || (!isSignUp && !isForgotPassword && !termsAccepted)) && styles.buttonDisabled,
              ]}
              onPress={isForgotPassword ? handleForgotPassword : 
                       isSignUp ? handleSignUp : handleLogin}
              disabled={isLoading || (!isSignUp && !isForgotPassword && !termsAccepted)}
            >
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isLoading 
                    ? (isForgotPassword ? 'Sending Reset Email...' :
                       isSignUp ? 'Creating Account...' : 'Signing In...') 
                    : (isForgotPassword ? 'Send Reset Email' :
                       isSignUp ? 'Sign Up' : 'Log In')
                  }
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Google Login Button (not shown for forgot password) */}
            {!isForgotPassword && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <BlurView intensity={20} tint="dark" style={styles.googleButtonBlur}>
                    <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </BlurView>
                </TouchableOpacity>
              </>
            )}

            {/* Navigation Links */}
            <View style={styles.signUpContainer}>
              {isForgotPassword ? (
                <Text style={styles.signUpText}>
                  Remember your password?{' '}
                  <Text style={styles.signUpLink} onPress={toggleForgotPassword}>
                    Back to Login
                  </Text>
                </Text>
              ) : (
                <>
                  <Text style={styles.signUpText}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <Text style={styles.signUpLink} onPress={toggleSignUpMode}>
                      {isSignUp ? 'Log in' : 'Sign up'}
                    </Text>
                  </Text>
                  
                  {!isSignUp && (
                    <Text style={[styles.signUpText, { marginTop: 16 }]}>
                      Forgot your password?{' '}
                      <Text style={styles.signUpLink} onPress={toggleForgotPassword}>
                        Reset it here
                      </Text>
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient1: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  backgroundGradient2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0.3,
  },
  imageOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(10, 14, 26, 0.6)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 4,
    marginTop: -40,
  },
  logo: {
    width: 420,
    height: 126,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  // Glassmorphic Input Styles - ElevenLabs-inspired
  glassInput: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 35, 50, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.2)',
  },
  glassInputNeon: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 35, 50, 0.5)',
  },
  neonBorderContainer: {
    borderRadius: 24,
    padding: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Terms & Legal Styles
  termsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  termsTextSignUp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    textAlign: 'center',
  },
  linkText: {
    color: '#EC4899',
    textDecorationLine: 'underline',
  },
  // Button Styles
  loginButton: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  googleButtonBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 35, 50, 0.4)',
    gap: 8,
    paddingHorizontal: 16,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  signUpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  signUpLink: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Email Verification Styles
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  verificationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  verificationText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 4,
  },
  resendLink: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
