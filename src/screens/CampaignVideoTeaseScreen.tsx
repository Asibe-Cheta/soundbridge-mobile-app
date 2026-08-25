import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const POINTS = [
  {
    icon: 'film-outline',
    title: 'Up to 3 videos per profile',
    description: "It's launching small on purpose. Make each one count.",
  },
  {
    icon: 'time-outline',
    title: '1 minute per video',
    description: "We'll raise both limits as the feature scales.",
  },
  {
    icon: 'person-outline',
    title: 'Lives on your Portfolio tab',
    description: 'On your profile, not the main Feed. Built for professionals checking out what you can do.',
  },
  {
    icon: 'cash-outline',
    title: 'Tip right on the spot',
    description: 'Someone loves your video? They can tip you in the moment, no extra steps.',
  },
];

export default function CampaignVideoTeaseScreen() {
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Video Content</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(220,38,38,0.20)', 'rgba(220,38,38,0.04)']}
              style={styles.heroGlow}
            />
            <View style={styles.iconRing}>
              <Ionicons name="videocam" size={40} color="#DC2626" />
            </View>
            <Text style={[styles.eyebrow, { color: '#DC2626' }]}>COMING SOON</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Your Videos. Real-Time Tips.
            </Text>
            <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
              Imagine someone tipping you right there, in the moment, because they loved your
              video content. That's coming to your profile. Look out for it.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>WHAT TO EXPECT</Text>
            <View style={[styles.pointsGrid, { backgroundColor: theme.colors.surface }]}>
              {POINTS.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.pointRow,
                    i < POINTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.pointIconWrap}>
                    <Ionicons name={p.icon as any} size={20} color="#DC2626" />
                  </View>
                  <View style={styles.pointText}>
                    <Text style={[styles.pointTitle, { color: theme.colors.text }]}>{p.title}</Text>
                    <Text style={[styles.pointDesc, { color: theme.colors.textSecondary }]}>{p.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.ctaCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.ctaText, { color: theme.colors.text }]}>
                Since it's launching with just 3 slots, put your best work forward when it lands.
              </Text>
              <Text style={[styles.ctaText, { color: theme.colors.text, marginTop: 10 }]}>
                People are already earning on SoundBridge. Don't sleep on it. Start sharing now.
              </Text>
            </View>
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
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
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
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },

  pointsGrid: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  pointIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1 },
  pointTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  pointDesc: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },

  ctaCard: {
    borderRadius: 16,
    padding: 18,
  },
  ctaText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
