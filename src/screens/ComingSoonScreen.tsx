import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';
import { supabase } from '../lib/supabase';
import { nudgeService } from '../services/NudgeService';

const MILESTONE = 2000;

const SECTIONS = [
  {
    icon: 'trophy-outline' as const,
    title: 'Event Sponsorship',
    body: 'SoundBridge will sponsor live music events across the UK and Nigeria. Your next show could be supported by us.',
  },
  {
    icon: 'ribbon-outline' as const,
    title: 'Music Competitions',
    body: 'We are building competitions where creators compete, fans vote, and winners earn real prizes. Coming soon.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'AI Career Adviser',
    body: 'Your personal AI adviser that analyses your data and tells you exactly what to do next to grow your music career. Unlocks at 2,000 users.',
  },
];

export default function ComingSoonScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        setUserCount(count ?? 0);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (user?.id) nudgeService.markTappedForScreen('ComingSoon', user.id);
  }, [user?.id]);

  const progress = userCount !== null ? Math.min(userCount / MILESTONE, 1) : null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'SoundBridge is the music platform for independent artists. Join us: https://soundbridge.live',
        url: 'https://soundbridge.live',
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
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
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Coming Soon</Text>
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
              <Ionicons name="rocket-outline" size={38} color="#DC2626" />
            </View>
            <Text style={[styles.heroHeadline, { color: theme.colors.text }]}>
              Big Things Are Coming to SoundBridge
            </Text>
            <Text style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
              The bigger this community gets, the more powerful it becomes for every creator here. Help us grow it.
            </Text>
          </View>

          {/* Upcoming features */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              WHAT'S COMING
            </Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              {SECTIONS.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    i < SECTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.featureIcon}>
                    <Ionicons name={s.icon} size={20} color="#DC2626" />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{s.title}</Text>
                    <Text style={[styles.featureBody, { color: theme.colors.textSecondary }]}>{s.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              COMMUNITY MILESTONE
            </Text>
            <View style={[styles.progressCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
                  {userCount !== null ? userCount.toLocaleString() : '...'} users
                </Text>
                <Text style={[styles.progressTarget, { color: theme.colors.textSecondary }]}>
                  Goal: {MILESTONE.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: progress !== null ? `${Math.round(progress * 100)}%` : '0%' },
                  ]}
                />
              </View>
              <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>
                AI Career Adviser unlocks at 2,000 users. Share SoundBridge to help us get there.
              </Text>
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Share SoundBridge Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('ShareProfile')}
              activeOpacity={0.75}
            >
              <Ionicons name="person-add-outline" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Invite a Friend</Text>
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
    paddingBottom: 56,
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
    marginBottom: 20,
  },
  heroHeadline: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  heroBody: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: Typography.label.fontFamily,
    fontWeight: '300',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  featureBody: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 13,
    letterSpacing: -0.4,
    lineHeight: 19,
  },

  // Progress bar
  progressCard: {
    borderRadius: 16,
    padding: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
  },
  progressTarget: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 13,
    letterSpacing: -0.4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  progressCaption: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 12,
    letterSpacing: -0.4,
    lineHeight: 17,
  },

  ctaSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 28,
  },
  primaryButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
  },
});
