import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { signIn, signUp, signInWithGoogle, resetPassword, error } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
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
        setIsSignUp(false); // Switch back to login mode
        setEmail('');
        setPassword('');
        setConfirmPassword('');
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
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <LinearGradient
      colors={['#000000', '#0D0D0D', '#1A0A0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.content}>
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
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password (not shown for forgot password) */}
            {!isForgotPassword && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Confirm Password (only for sign up) */}
            {isSignUp && !isForgotPassword && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Main Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={isForgotPassword ? handleForgotPassword : 
                       isSignUp ? handleSignUp : handleLogin}
              disabled={isLoading}
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
                  <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 438,
    height: 113,
  },
  title: {
    fontSize: 20,
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
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginButton: {
    height: 48,
    borderRadius: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
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