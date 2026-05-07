import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';
import { getAudioLogs, clearAudioLogs } from '../lib/audioDebugLog';

const features = [
  { icon: 'musical-notes-outline', title: 'Discover Music', description: 'Explore tracks from independent artists worldwide.' },
  { icon: 'people-outline', title: 'Connect', description: 'Follow artists, send messages, engage with content.' },
  { icon: 'cloud-upload-outline', title: 'Upload', description: 'Share your music with a global audience.' },
  { icon: 'wallet-outline', title: 'Earn', description: 'Receive tips, sell music, and manage payouts.' },
];

export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionTap = useCallback(async () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      const logs = await getAudioLogs();
      if (logs.length === 0) {
        Alert.alert('Audio Debug Log', 'No entries yet — play a track first.');
        return;
      }
      const last30 = logs.slice(-30).join('\n');
      Alert.alert(
        'Audio Debug Log',
        last30,
        [
          { text: 'Clear', style: 'destructive', onPress: () => clearAudioLogs() },
          { text: 'OK' },
        ],
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>About</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(220,38,38,0.18)', 'rgba(220,38,38,0.04)']}
              style={styles.heroGlow}
            />
            <View style={styles.iconRing}>
              <Ionicons name="radio" size={40} color="#DC2626" />
            </View>
            <Text style={[styles.wordmark, { color: theme.colors.text }]}>SoundBridge</Text>
            <TouchableOpacity style={styles.versionBadge} onPress={handleVersionTap} activeOpacity={1}>
              <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
            </TouchableOpacity>
            <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
              The social platform for music creators and listeners.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => Linking.openURL('https://soundbridge.live')}
              activeOpacity={0.85}
            >
              <Ionicons name="globe-outline" size={17} color="#fff" />
              <Text style={styles.ctaText}>Visit SoundBridge.live</Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>WHAT WE OFFER</Text>
            <View style={[styles.featureGrid, { backgroundColor: theme.colors.surface }]}>
              {features.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    i < features.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon as any} size={20} color="#DC2626" />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{f.title}</Text>
                    <Text style={[styles.featureDesc, { color: theme.colors.textSecondary }]}>{f.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Social */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>FOLLOW US</Text>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: theme.colors.surface }]}
                onPress={() => Linking.openURL('https://x.com/Soundbridge_ltd')}
              >
                <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
                <Text style={[styles.socialLabel, { color: theme.colors.text }]}>X (Twitter)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: theme.colors.surface }]}
                onPress={() => Linking.openURL('https://instagram.com/soundbridge_live')}
              >
                <Ionicons name="logo-instagram" size={18} color="#E4405F" />
                <Text style={[styles.socialLabel, { color: theme.colors.text }]}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: theme.colors.surface }]}
                onPress={() => Linking.openURL('https://www.tiktok.com/@soundbridge7/')}
              >
                <Ionicons name="logo-tiktok" size={18} color={theme.colors.text} />
                <Text style={[styles.socialLabel, { color: theme.colors.text }]}>TikTok</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>LEGAL & SUPPORT</Text>
            <View style={[styles.legalGroup, { backgroundColor: theme.colors.surface }]}>
              {[
                { icon: 'document-text-outline', label: 'Terms of Service', url: 'https://soundbridge.live/legal/terms' },
                { icon: 'shield-checkmark-outline', label: 'Privacy Policy', url: 'https://soundbridge.live/legal/privacy' },
                { icon: 'mail-outline', label: 'Contact Support', url: 'mailto:contact@soundbridge.live' },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.legalRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                  onPress={() => Linking.openURL(item.url)}
                >
                  <Ionicons name={item.icon as any} size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.legalLabel, { color: theme.colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              © 2026 SoundBridge Live Ltd. All rights reserved.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    width: 260,
    height: 260,
    borderRadius: 130,
    alignSelf: 'center',
  },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  wordmark: {
    ...Typography.headerLarge,
    fontSize: 36,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  versionText: {
    ...Typography.label,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 28,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
  },
  ctaText: {
    ...Typography.button,
    fontSize: 15,
    color: '#fff',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Features
  featureGrid: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  featureDesc: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },

  // Social
  socialRow: {
    gap: 10,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  socialLabel: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '500',
  },

  // Legal
  legalGroup: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  legalLabel: {
    ...Typography.body,
    flex: 1,
    fontSize: 15,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  footerText: {
    ...Typography.label,
    fontSize: 12,
    textAlign: 'center',
  },
});
