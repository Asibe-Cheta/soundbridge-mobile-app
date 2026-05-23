import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { STORE_URL_IOS, STORE_URL_ANDROID } from '../constants/storeUrls';

interface FeatureUnavailablePromptProps {
  featureName?: string;
}

export default function FeatureUnavailablePrompt({
  featureName,
}: FeatureUnavailablePromptProps) {
  const { theme } = useTheme();

  const handleUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
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

      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {featureName ? `${featureName} Requires Update` : 'Update Required'}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          This feature is available in a newer version of SoundBridge. Update your app to access it.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleUpdate}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#EC4899', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Update Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
    maxWidth: 360,
  },
  icon: {
    fontSize: 52,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
