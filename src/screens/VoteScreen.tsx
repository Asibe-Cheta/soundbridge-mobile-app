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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import { analyticsService } from '../services/analytics/analyticsService';
import { voteBannerService } from '../services/VoteBannerService';
import { getVoteCountdown } from '../utils/voteCountdown';
import { VOTE_URL, VOTE_COPY, SHOW_EVENT_REWARDS_LINE } from '../config/voteCampaign';

const SHORTLIST_CARD = require('../../assets/vote1.PNG');
const HOW_TO_VOTE_CARD = require('../../assets/vote2.PNG');

export default function VoteScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [countdown, setCountdown] = useState(() => getVoteCountdown());
  const [showThankYou, setShowThankYou] = useState(false);
  const [voted, setVoted] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!viewTracked.current) {
      viewTracked.current = true;
      analyticsService.trackScreen('VoteCampaign');
    }
    voteBannerService.hasVoted().then(setVoted);
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
    // expo-clipboard is a native module added after the currently-shipped native
    // binary was built (see CLAUDE.md/OTA notes) — a static top-level import calls
    // requireNativeModule at module-eval time, which throws for any user still on
    // an older binary before OTA has a chance to deliver a native module it can't
    // add. Deferred + guarded here so that failure can't take down the whole app;
    // it just means copy silently doesn't work until the next native build.
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(VOTE_URL);
      analyticsService.trackUserAction('vote_link_copied', { source: 'vote_screen' });
    } catch (e) {
      console.warn('Clipboard unavailable on this build:', e);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Vote for SoundBridge, it's free and takes a minute: ${VOTE_URL}`, url: VOTE_URL });
      analyticsService.trackUserAction('vote_link_shared', { source: 'vote_screen' });
    } catch {}
  };

  const handleMarkVoted = () => {
    analyticsService.trackUserAction('vote_marked_voted', { source: 'vote_screen' });
    voteBannerService.markVoted();
    setVoted(true);
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
          <Text style={[Typography.headerMedium, styles.headerTitle, { color: theme.colors.text }]}>Vote</Text>
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
              <Text style={[Typography.headerMedium, styles.closedTitle, { color: theme.colors.text }]}>{VOTE_COPY.closedTitle}</Text>
              <Text style={[Typography.body, styles.closedBody, { color: theme.colors.textSecondary }]}>{VOTE_COPY.closedBody}</Text>
            </View>
          ) : voted ? (
            <View style={styles.thankYouWrap}>
              <Ionicons name="checkmark-circle" size={40} color={theme.colors.primary} />
              <Text style={[Typography.headerMedium, { color: theme.colors.text }]}>{VOTE_COPY.votedTitle}</Text>
              <Text style={[Typography.body, styles.thankYouBody, { color: theme.colors.textSecondary }]}>{VOTE_COPY.votedBody}</Text>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={17} color={theme.colors.text} />
                <Text style={[Typography.button, { color: theme.colors.text }]}>{VOTE_COPY.shareButton}</Text>
              </TouchableOpacity>
            </View>
          ) : showThankYou ? (
            <View style={styles.thankYouWrap}>
              <Text style={[Typography.headerMedium, { color: theme.colors.text }]}>{VOTE_COPY.thankYouTitle}</Text>
              <Text style={[Typography.body, styles.thankYouBody, { color: theme.colors.textSecondary }]}>{VOTE_COPY.thankYouBody}</Text>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={17} color={theme.colors.text} />
                <Text style={[Typography.button, { color: theme.colors.text }]}>{VOTE_COPY.shareButton}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMarkVoted} activeOpacity={0.7}>
                <Text style={[Typography.label, { color: theme.colors.primary }]}>{VOTE_COPY.markVotedButton}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Image source={SHORTLIST_CARD} style={styles.heroImage} resizeMode="cover" />

              <Text style={[Typography.headerLarge, styles.headline, { color: theme.colors.text }]}>{VOTE_COPY.headline}</Text>
              <Text style={[Typography.body, styles.subhead, { color: theme.colors.textSecondary }]}>{VOTE_COPY.subhead}</Text>

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} onPress={handleVoteNow} activeOpacity={0.88}>
                <Text style={[Typography.button, styles.primaryButtonText]}>{VOTE_COPY.voteButton}</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity style={[styles.secondaryButton, styles.secondaryHalf, { borderColor: theme.colors.border }]} onPress={handleCopyLink} activeOpacity={0.85}>
                  <Ionicons name="link-outline" size={16} color={theme.colors.text} />
                  <Text style={[Typography.label, { color: theme.colors.text }]}>{VOTE_COPY.copyLinkButton}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.secondaryHalf, { borderColor: theme.colors.border }]} onPress={handleShare} activeOpacity={0.85}>
                  <Ionicons name="share-outline" size={16} color={theme.colors.text} />
                  <Text style={[Typography.label, { color: theme.colors.text }]}>{VOTE_COPY.shareButton}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleMarkVoted} activeOpacity={0.7} style={styles.markVotedLink}>
                <Text style={[Typography.label, { color: theme.colors.primary }]}>{VOTE_COPY.markVotedButton}</Text>
              </TouchableOpacity>

              <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[Typography.headerMedium, styles.sectionTitle, { color: theme.colors.text }]}>{VOTE_COPY.whyItMattersTitle}</Text>
                <Text style={[Typography.label, styles.sectionIntro, { color: theme.colors.textSecondary }]}>{VOTE_COPY.whyItMattersIntro}</Text>
                {whatsNext.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[Typography.label, styles.bulletText, { color: theme.colors.text }]}>{line}</Text>
                  </View>
                ))}
              </View>

              <Image source={HOW_TO_VOTE_CARD} style={styles.heroImage} resizeMode="cover" />
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
  headerTitle: {},
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
  heroImage: { width: '100%', aspectRatio: 944 / 2048, borderRadius: 16, marginBottom: 20 },
  headline: { marginBottom: 6 },
  subhead: { marginBottom: 20 },
  primaryButton: { borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#fff' },
  secondaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  secondaryHalf: { flex: 1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
  },
  markVotedLink: { alignSelf: 'center', marginTop: -12, marginBottom: 20 },
  section: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 20 },
  sectionTitle: { marginBottom: 8 },
  sectionIntro: { marginBottom: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1 },
  closedWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  closedTitle: { textAlign: 'center' },
  closedBody: { textAlign: 'center', paddingHorizontal: 20 },
  thankYouWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  thankYouBody: { textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },
});
