import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { STORE_URL_IOS, STORE_URL_ANDROID } from '../constants/storeUrls';

interface ForceUpdateModalProps {
  visible: boolean;
  message: string;
}

export default function ForceUpdateModal({ visible, message }: ForceUpdateModalProps) {
  const { theme } = useTheme();

  const handleUpdateNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
    // Modal stays visible — user must update before continuing
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      // No onRequestClose — this modal cannot be dismissed by back button
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logos/logo-white-lockup.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Icon ring */}
            <View style={[styles.iconRing, { borderColor: '#EC4899' }]}>
              <Text style={styles.iconEmoji}>⬆️</Text>
            </View>

            {/* Headline */}
            <Text style={[styles.headline, { color: theme.colors.text }]}>
              Update Required
            </Text>

            {/* Message from Supabase */}
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              {message}
            </Text>

            {/* Update Now button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpdateNow}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryButtonText}>Update Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 40,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 32,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
