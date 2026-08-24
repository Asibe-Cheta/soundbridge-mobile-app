import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const INSTAGRAM_URL = 'https://instagram.com/soundbridge_live';

// Fri 4 Sep 2026, 7:30–8:30 PM BST (UTC+1)
const EVENT_START_UTC = '20260904T183000Z';
const EVENT_END_UTC = '20260904T193000Z';

function buildGoogleCalendarUrl(): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'SoundBridge Live on Instagram: How Creators Get Discovered & Paid',
    dates: `${EVENT_START_UTC}/${EVENT_END_UTC}`,
    details:
      "There's a solution that's been hidden from creators, until now. A new way to get discovered, get paid, and finally earn what your craft deserves. No fees. No gatekeepers. 100% free.\n\nWatch live: " +
      INSTAGRAM_URL,
    location: INSTAGRAM_URL,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function CampaignIGLiveScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Live on Instagram</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(228,64,95,0.20)', 'rgba(228,64,95,0.04)']}
              style={styles.heroGlow}
            />
            <View style={styles.iconRing}>
              <Ionicons name="logo-instagram" size={40} color="#E4405F" />
            </View>
            <Text style={[styles.eyebrow, { color: '#E4405F' }]}>LIVE ON INSTAGRAM</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              How Creators Get Discovered & Paid
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                Friday, 4 September · 7:30 PM
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.bodyCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                There's a solution that's been hidden from creators, until now. A new way to
                get discovered, get paid, and finally earn what your craft deserves. No fees.
                No gatekeepers. 100% free.
              </Text>
            </View>
          </View>

          <View style={[styles.section, styles.buttonGroup]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Linking.openURL(INSTAGRAM_URL)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-instagram" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Watch on Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => Linking.openURL(buildGoogleCalendarUrl())}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Add to Calendar</Text>
            </TouchableOpacity>
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

  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
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
    backgroundColor: 'rgba(228,64,95,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(228,64,95,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    ...Typography.label,
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: 10,
    fontWeight: '700',
  },
  title: {
    ...Typography.headerLarge,
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  bodyCard: {
    borderRadius: 16,
    padding: 18,
  },
  bodyText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 23,
  },

  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E4405F',
    paddingVertical: 15,
    borderRadius: 28,
  },
  primaryButtonText: {
    ...Typography.button,
    fontSize: 15,
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 28,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...Typography.button,
    fontSize: 15,
  },
});
