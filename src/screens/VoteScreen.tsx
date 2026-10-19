// "Vote for SoundBridge" campaign screen (VOTE_FOR_SOUNDBRIDGE.MD).
// Route: /vote (web) and the soundbridge://campaigns/vote deep link (push + in-app entry).
// All copy/timing lives in src/config/voteCampaign.ts — this file is layout/logic only.
import React, { useEffect, useRef, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { analyticsService } from '../services/analytics/analyticsService';
import { getVoteCountdown } from '../utils/voteCountdown';
import { VOTE_URL, VOTE_COPY, SHOW_EVENT_REWARDS_LINE } from '../config/voteCampaign';

export default function VoteScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [countdown, setCountdown] = useState(() => getVoteCountdown());
  const [showThankYou, setShowThankYou] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!viewTracked.current) {
      viewTracked.current = true;
      analyticsService.trackScreen('VoteCampaign');
    }
  }, []);

  // Under 48h the copy needs to update every minute; otherwise once an hour is plenty
  // (it only ever shows whole days until that point).
  useEffect(() => {
    const tick = () => setCountdown(getVoteCountdown());
    const intervalMs = countdown.useHours ? 60 * 1000 : 60 * 60 * 1000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [countdown.useHours]);

  const handleVoteNow = async () => {
    analyticsService.trackUserAction('vote_now_tapped', { source: 'vote_screen' });
    try {
      await WebBrowser.openBrowserAsync(VOTE_URL);
    } catch {}
    setShowThankYou(true);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(VOTE_URL);
    analyticsService.trackUserAction('vote_link_copied', { source: 'vote_screen' });
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Vote for SoundBridge, it's free and takes a minute: ${VOTE_URL}`, url: VOTE_URL });
      analyticsService.trackUserAction('vote_link_shared', { source: 'vote_screen' });
    } catch {}
  };

  const whatsNext = SHOW_EVENT_REWARDS_LINE
    ? VOTE_COPY.whatsNext
    : VOTE_COPY.whatsNext.filter(line => line !== 'Rewards for fans who show up to events');

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vote</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {!countdown.closed && (
            <View style={[styles.countdownPill, { backgroundColor: theme.colors.primary + '1A', borderColor: theme.colors.primary + '40' }]}>
              <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.countdownText, { color: theme.colors.primary }]}>
                {countdown.useHours
                  ? `${countdown.hours} hour${countdown.hours === 1 ? '' : 's'} left to vote`
                  : `${countdown.days} day${countdown.days === 1 ? '' : 's'} left to vote`}
              </Text>
            </View>
          )}

          {countdown.closed ? (
            <View style={styles.closedWrap}>
              <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.closedTitle, { color: theme.colors.text }]}>{VOTE_COPY.closedTitle}</Text>
              <Text style={[styles.closedBody, { color: theme.colors.textSecondary }]}>{VOTE_COPY.closedBody}</Text>
            </View>
          ) : showThankYou ? (
            <View style={styles.thankYouWrap}>
              <Text style={[styles.thankYouTitle, { color: theme.colors.text }]}>{VOTE_COPY.thankYouTitle}</Text>
              <Text style={[styles.thankYouBody, { color: theme.colors.textSecondary }]}>{VOTE_COPY.thankYouBody}</Text>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={17} color={theme.colors.text} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{VOTE_COPY.shareButton}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.headline, { color: theme.colors.text }]}>{VOTE_COPY.headline}</Text>
              <Text style={[styles.subhead, { color: theme.colors.textSecondary }]}>{VOTE_COPY.subhead}</Text>

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} onPress={handleVoteNow} activeOpacity={0.88}>
                <Text style={styles.primaryButtonText}>{VOTE_COPY.voteButton}</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity style={[styles.secondaryButton, styles.secondaryHalf, { borderColor: theme.colors.border }]} onPress={handleCopyLink} activeOpacity={0.85}>
                  <Ionicons name="link-outline" size={16} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{VOTE_COPY.copyLinkButton}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.secondaryHalf, { borderColor: theme.colors.border }]} onPress={handleShare} activeOpacity={0.85}>
                  <Ionicons name="share-outline" size={16} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{VOTE_COPY.shareButton}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.section, { borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{VOTE_COPY.whyItMattersTitle}</Text>
                <Text style={[styles.sectionIntro, { color: theme.colors.textSecondary }]}>{VOTE_COPY.whyItMattersIntro}</Text>
                {whatsNext.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.bulletText, { color: theme.colors.text }]}>{line}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.section, { borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{VOTE_COPY.howToVoteTitle}</Text>
                {VOTE_COPY.howToVoteSteps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {},
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  countdownPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  countdownText: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subhead: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  primaryButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  secondaryHalf: { flex: 1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600' },
  section: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  sectionIntro: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, paddingTop: 2 },
  closedWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  closedTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  closedBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20 },
  thankYouWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  thankYouTitle: { fontSize: 22, fontWeight: '700' },
  thankYouBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },
});
