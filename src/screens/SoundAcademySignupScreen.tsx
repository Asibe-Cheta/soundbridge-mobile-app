import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { referralService } from '../services/ReferralService';

const { width, height } = Dimensions.get('window');

export default function SoundAcademySignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords don\'t match', 'Please make sure both passwords are the same.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email.trim().toLowerCase(), password, {
        source: 'sound_academy',
      });

      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error?.message || 'An error occurred. Please try again.');
        return;
      }

      if (result.needsEmailVerification) {
        Alert.alert(
          'Check Your Email',
          'We\'ve sent a verification link to your email. Click it to confirm your account — your one year Premium access will activate automatically when you sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth') }]
        );
      } else {
        // Immediate session (email confirmation disabled) — grant now
        const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser());
        if (user) {
          await referralService.grantInstitutionalAccess(user.id, 'sound_academy');
        }
        Alert.alert(
          'Welcome to SoundBridge!',
          'Your one year Premium access is now active. Complete your profile to get started.',
          [{ text: 'Get Started' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0d0015', '#1a0030', '#0d0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* SA Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/sa-2.png')}
                style={styles.saLogo}
                resizeMode="contain"
              />
            </View>

            {/* Heading */}
            <Text style={styles.heading}>Welcome, Sound Academy student.</Text>
            <Text style={styles.subheading}>
              Create your free SoundBridge account to activate your one year Premium access.
            </Text>

            {/* Premium badge */}
            <View style={styles.premiumBadge}>
              <LinearGradient
                colors={['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumGradient}
              >
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.premiumTxt}>1 Year Premium — Free</Text>
              </LinearGradient>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <View style={[styles.inputWrap, focusedInput === 'email' && styles.inputWrapFocused]}>
                <Ionicons name="mail-outline" size={18} color={focusedInput === 'email' ? '#7c3aed' : 'rgba(255,255,255,0.4)'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, focusedInput === 'password' && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'password' ? '#7c3aed' : 'rgba(255,255,255,0.4)'} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={[styles.inputWrap, focusedInput === 'confirm' && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'confirm' ? '#7c3aed' : 'rgba(255,255,255,0.4)'} style={styles.inputIcon} />
                <TextInput
                  ref={confirmRef}
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  onFocus={() => setFocusedInput('confirm')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#EC4899', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="star" size={18} color="#fff" />
                      <Text style={styles.submitTxt}>Create Account & Activate Premium</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms note */}
              <Text style={styles.terms}>
                By creating an account you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>

              {/* Already have account */}
              <TouchableOpacity
                style={styles.loginRow}
                onPress={() => navigation.navigate('Auth')}
              >
                <Text style={styles.loginTxt}>
                  Already have an account?{' '}
                  <Text style={styles.loginLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  backBtn: { marginTop: 8, marginBottom: 4, alignSelf: 'flex-start' },

  logoWrap: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  saLogo: { width: width * 0.45, height: 80 },

  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  premiumBadge: { alignItems: 'center', marginBottom: 28 },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumTxt: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  form: { gap: 14 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  inputWrapFocused: {
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  inputIcon: {},
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    padding: 0,
  },

  submitBtn: { marginTop: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },

  terms: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: { color: 'rgba(124,58,237,0.8)' },

  loginRow: { alignItems: 'center', marginTop: 8 },
  loginTxt: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  loginLink: { color: '#7c3aed', fontWeight: '600' },
});
