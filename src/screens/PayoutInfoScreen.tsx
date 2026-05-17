import React, { useMemo, useEffect } from 'react';
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
import { deepLinkingService } from '../services/DeepLinkingService';
import { nudgeService } from '../services/NudgeService';

const HOW_TO_TIPS = [
  { icon: 'logo-instagram' as const, text: 'Share your profile on Instagram so your followers can listen and add to your play count.' },
  { icon: 'chatbubble-ellipses-outline' as const, text: 'Send your SoundBridge link on WhatsApp. Every contact who hits play counts toward this month\'s payout.' },
  { icon: 'megaphone-outline' as const, text: 'Tell your fans your music is on SoundBridge. A simple post or story can drive hundreds of plays.' },
  { icon: 'cloud-upload-outline' as const, text: 'Upload more tracks. More songs means more chances to accumulate plays across your catalogue.' },
];

export default function PayoutInfoScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();

  const profileLink = useMemo(() => {
    if (userProfile?.username) {
      return deepLinkingService.generateProfileLink(userProfile.username);
    }
    if (user?.id) {
      return deepLinkingService.generateProfileUrl(user.id);
    }
    return '';
  }, [user?.id, userProfile?.username]);

  const displayName = userProfile?.display_name || userProfile?.username || 'my profile';

  useEffect(() => {
    if (user?.id) nudgeService.markTappedForScreen('PayoutInfo', user.id);
  }, [user?.id]);

  const handleShareProfile = async () => {
    if (!profileLink) return;
    try {
      await Share.share({
        message: `Listen to ${displayName} on SoundBridge:\n${profileLink}`,
        url: profileLink,
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Monthly Payout</Text>
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
              <Ionicons name="cash-outline" size={38} color="#DC2626" />
            </View>
            <Text style={[styles.heroHeadline, { color: theme.colors.text }]}>
              Get Paid by SoundBridge Every Month
            </Text>
            <Text style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
              SoundBridge pays out directly to the creator with the highest plays each month. The more people listen to your music on SoundBridge, the higher your chance of winning.
            </Text>
          </View>

          {/* How it works */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              HOW TO INCREASE YOUR PLAYS
            </Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              {HOW_TO_TIPS.map((tip, i) => (
                <View
                  key={i}
                  style={[
                    styles.tipRow,
                    i < HOW_TO_TIPS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.tipIcon}>
                    <Ionicons name={tip.icon} size={20} color="#DC2626" />
                  </View>
                  <Text style={[styles.tipText, { color: theme.colors.text }]}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleShareProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Share My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('Upload')}
              activeOpacity={0.75}
            >
              <Ionicons name="cloud-upload-outline" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Upload a Track</Text>
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
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
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
