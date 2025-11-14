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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
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
  const { signIn, signUp, signInWithGoogle, resetPassword, error } = useAuth();

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

  const hasNeonEffect = (inputName: string) => {
    return focusedInput === inputName;
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
      const { success, error } = await signIn(email, password);
      
      if (!success) {
        Alert.alert('Login Failed', error?.message || 'An error occurred during login');
      }
      // Success is handled by auth state change
    } catch (err) {
      Alert.alert('Login Error', 'An unexpected error occurred');
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
      const { success, error } = await signUp(email, password);
      
      if (!success) {
        Alert.alert('Sign Up Failed', error?.message || 'An error occurred during sign up');
      } else {
        Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTermsAccepted(false);
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
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setFocusedInput(null);
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
            
            {!isForgotPassword && renderPasswordInput('password', 'Password', password, setPassword, showPassword, setShowPassword)}
            
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
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.2)',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 360,
    height: 108,
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
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 35, 50, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.2)',
  },
  glassInputNeon: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 35, 50, 0.5)',
  },
  neonBorderContainer: {
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
});
