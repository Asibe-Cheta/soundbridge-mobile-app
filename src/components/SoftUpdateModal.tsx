import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { STORE_URL_IOS, STORE_URL_ANDROID } from '../constants/storeUrls';

interface SoftUpdateModalProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export default function SoftUpdateModal({ visible, message, onDismiss }: SoftUpdateModalProps) {
  const { theme } = useTheme();

  const handleUpdateNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
    onDismiss();
  };

  const handleMaybeLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleMaybeLater}
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

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.header}>
              <Text style={styles.iconEmoji}>🆕</Text>
              <Text style={[styles.headline, { color: theme.colors.text }]}>
                New Version Available
              </Text>
            </View>

            {/* Message from Supabase */}
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              {message}
            </Text>

            {/* Update Now */}
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

            {/* Maybe Later */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleMaybeLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                Maybe Later
              </Text>
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
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  primaryGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
