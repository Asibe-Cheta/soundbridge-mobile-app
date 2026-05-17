import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';
import { nudgeService } from '../services/NudgeService';

const WHY_IT_WORKS = [
  { icon: 'location-outline' as const, text: 'Location matched to your event venue so only nearby fans are notified.' },
  { icon: 'musical-note-outline' as const, text: 'Genre matched to your audience so fans already care about your style of music.' },
  { icon: 'notifications-outline' as const, text: 'Fans opted in for your event category and receive direct push notifications, not just a feed post.' },
  { icon: 'pricetag-outline' as const, text: 'Free for all creators on SoundBridge. No ad spend, no hidden fees.' },
];

export default function EventPromotionInfoScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) nudgeService.markTappedForScreen('EventPromotionInfo', user.id);
  }, [user?.id]);

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Promotion</Text>
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
              <Ionicons name="megaphone-outline" size={38} color="#DC2626" />
            </View>
            <Text style={[styles.heroHeadline, { color: theme.colors.text }]}>
              Free Event Promotion. No Ads. No Spend.
            </Text>
            <Text style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
              When you create an event on SoundBridge, we automatically send push notifications to users in your area who have opted in for your genre. No Facebook ads. No Instagram spend. Just targeted promotion to the right people.
            </Text>
          </View>

          {/* Why it works */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              WHY IT WORKS
            </Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              {WHY_IT_WORKS.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.reasonRow,
                    i < WHY_IT_WORKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.reasonIcon}>
                    <Ionicons name={item.icon} size={20} color="#DC2626" />
                  </View>
                  <Text style={[styles.reasonText, { color: theme.colors.text }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CreateEvent')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Create My Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('AllEvents')}
              activeOpacity={0.75}
            >
              <Ionicons name="list-outline" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>See My Upcoming Events</Text>
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
    maxWidth: 320,
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
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 13,
    letterSpacing: -0.4,
    lineHeight: 19,
    flex: 1,
    paddingTop: 2,
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
