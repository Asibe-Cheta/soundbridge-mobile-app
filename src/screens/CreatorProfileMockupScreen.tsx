import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import VerifiedBadge from '../components/VerifiedBadge';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const { width: W } = Dimensions.get('window');

const BANNER_BG = require('../../assets/luc-cover-banner.png');
const PROFILE_PIC = require('../../assets/loud-profile-pic.jpg');

const SONG_TIPS = [
  { city: 'Lagos, Nigeria', flag: '🇳🇬', amount: '$189.50', plays: '1,420 plays', pct: 100 },
  { city: 'London, UK', flag: '🇬🇧', amount: '$156.20', plays: '1,182 plays', pct: 82 },
  { city: 'Atlanta, USA', flag: '🇺🇸', amount: '$98.70', plays: '748 plays', pct: 52 },
  { city: 'New York, USA', flag: '🇺🇸', amount: '$87.40', plays: '661 plays', pct: 46 },
  { city: 'Toronto, Canada', flag: '🇨🇦', amount: '$65.30', plays: '493 plays', pct: 34 },
  { city: 'Accra, Ghana', flag: '🇬🇭', amount: '$43.80', plays: '331 plays', pct: 23 },
  { city: 'Manchester, UK', flag: '🇬🇧', amount: '$38.20', plays: '289 plays', pct: 20 },
  { city: 'Houston, USA', flag: '🇺🇸', amount: '$31.50', plays: '239 plays', pct: 17 },
];

const EVENT_TIPS = [
  { event: 'Living Loud — The Concert', date: 'Feb 20, 2026', location: 'National Theatre, Abuja', amount: '$445.00', tippers: 34, topTip: '$40' },
  { event: 'AJOYO × Loud Urban Choir', date: 'Jan 10, 2026', location: 'Accra Theatre, Accra', amount: '$287.50', tippers: 22, topTip: '$25' },
];

type Tab = 'overview' | 'earnings' | 'settings';

export default function CreatorProfileMockupScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Profile Header — exact mirror of ProfileScreen */}
          <View style={styles.profileBannerContainer}>
            {/* Banner photo / gradient fallback */}
            <Image source={BANNER_BG} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            {/* Dark overlay — bottom 60%, matching ProfileScreen */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { top: '35%' }]}
              pointerEvents="none"
            />

            {/* Back button — top left */}
            <View style={styles.backButtonWrap}>
              <BackButton style={{ borderWidth: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => navigation.goBack()} />
            </View>

            {/* Camera icon — top right */}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>

            {/* Fan page icon — below camera */}
            <View style={styles.fanPageBtn}>
              <Ionicons name="people" size={17} color="rgba(255,255,255,0.92)" />
            </View>

            {/* Profile content overlaid at bottom of banner */}
            <View style={styles.profileContentOverlay}>
              {/* Name row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.displayName}>Loud Urban Choir</Text>
                <VerifiedBadge size={16} />
              </View>

              <Text style={styles.usernameText}>@loudurbanchoir</Text>
              <Text style={styles.headlineText}>Official page of Loud Urban Choir</Text>
              <Text style={styles.bioText}>Contemporary Choir | Afro-Fusion</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.bioText, { marginBottom: 0, marginLeft: 3 }]}>Lagos, Nigeria</Text>
              </View>

              {/* Instagram external link */}
              <View style={{ marginBottom: 16 }}>
                <View style={styles.socialIconCircle}>
                  <Ionicons name="logo-instagram" size={18} color={theme.colors.primary} />
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>193K</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>12</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>2</Text>
                  <Text style={styles.statLabel}>Tracks</Text>
                </View>
              </View>

              <Text style={styles.joinDate}>Joined January 10, 2025</Text>
            </View>
          </View>

          {/* Tabs — pill style matching ProfileScreen exactly */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.tabsInner, { backgroundColor: theme.colors.card }]}>
              {(['overview', 'earnings', 'settings'] as Tab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.colors.textSecondary }, activeTab === tab && styles.activeTabText]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tab content */}
          {activeTab === 'overview' && <OverviewTab theme={theme} />}
          {activeTab === 'earnings' && <EarningsTab theme={theme} />}
          {activeTab === 'settings' && <SettingsTab theme={theme} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function OverviewTab({ theme }: { theme: any }) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>PROFESSIONAL PROFILE</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {[
          { icon: 'eye-outline', label: 'Profile Views this month', value: '18,240', color: '#8B5CF6' },
          { icon: 'musical-note-outline', label: 'Track Streams', value: '41,800', color: '#F59E0B' },
          { icon: 'star-outline', label: 'Rating', value: 'New', color: '#EC4899' },
          { icon: 'calendar-outline', label: 'Events Hosted', value: '3', color: '#10B981' },
        ].map((row, i, arr) => (
          <View key={i} style={[styles.overviewRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
            <View style={[styles.overviewIcon, { backgroundColor: row.color + '18' }]}>
              <Ionicons name={row.icon as any} size={16} color={row.color} />
            </View>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.overviewValue, { color: theme.colors.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>RECENT DROPS</Text>
      {[
        { text: 'Official page of Loud Urban Choir', time: '5d ago' },
        { text: 'Living Loud — The Concert was INCREDIBLE. Thank you Abuja!', time: '2w ago' },
      ].map((drop, i) => (
        <View key={i} style={[styles.dropCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Image source={PROFILE_PIC} style={styles.dropAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dropAuthor, { color: theme.colors.text }]}>Loud Urban Choir</Text>
            <Text style={[styles.dropText, { color: theme.colors.textSecondary }]}>{drop.text}</Text>
            <Text style={[styles.dropTime, { color: theme.colors.textSecondary }]}>{drop.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function EarningsTab({ theme }: { theme: any }) {
  const songTotal = SONG_TIPS.reduce((s, r) => s + parseFloat(r.amount.replace('$', '')), 0);
  const eventTotal = EVENT_TIPS.reduce((s, r) => s + parseFloat(r.amount.replace('$', '')), 0);

  return (
    <View style={{ padding: 16 }}>
      <LinearGradient
        colors={['#7C3AED', '#9D4EDD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalCard}
      >
        <Text style={styles.totalLabel}>Total Tips Received</Text>
        <Text style={styles.totalAmount}>${(songTotal + eventTotal).toFixed(2)}</Text>
        <Text style={styles.totalSub}>from song plays + events · last 90 days</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalPill}>
            <Ionicons name="musical-note-outline" size={12} color="#fff" />
            <Text style={styles.totalPillText}>${songTotal.toFixed(2)} streams</Text>
          </View>
          <View style={styles.totalPill}>
            <Ionicons name="ticket-outline" size={12} color="#fff" />
            <Text style={styles.totalPillText}>${eventTotal.toFixed(2)} events</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>FROM SONG PLAYS — BY LOCATION</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {SONG_TIPS.map((row, i) => (
          <View key={i} style={[styles.tipRow, i < SONG_TIPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
            <Text style={styles.tipFlag}>{row.flag}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.tipMeta}>
                <Text style={[styles.tipCity, { color: theme.colors.text }]}>{row.city}</Text>
                <Text style={[styles.tipAmount, { color: '#10B981' }]}>{row.amount}</Text>
              </View>
              <View style={styles.tipBarRow}>
                <View style={[styles.tipBarBg, { backgroundColor: theme.colors.border }]}>
                  <View style={[styles.tipBarFill, { width: `${row.pct}%`, backgroundColor: '#10B981' }]} />
                </View>
                <Text style={[styles.tipPlays, { color: theme.colors.textSecondary }]}>{row.plays}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>FROM EVENTS</Text>
      {EVENT_TIPS.map((ev, i) => (
        <View key={i} style={[styles.eventTipCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.eventTipHeader}>
            <Text style={[styles.eventTipName, { color: theme.colors.text }]}>{ev.event}</Text>
            <Text style={[styles.eventTipAmount, { color: '#EC4899' }]}>{ev.amount}</Text>
          </View>
          <View style={styles.eventTipMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{ev.date}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{ev.location}</Text>
            </View>
          </View>
          <View style={styles.eventTipStats}>
            <View style={[styles.eventTipStat, { backgroundColor: '#EC489920' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#EC4899' }]}>{ev.tippers}</Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>tippers</Text>
            </View>
            <View style={[styles.eventTipStat, { backgroundColor: '#8B5CF620' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#8B5CF6' }]}>{ev.topTip}</Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>top tip</Text>
            </View>
            <View style={[styles.eventTipStat, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#10B981' }]}>
                ${(parseFloat(ev.amount.replace('$', '')) / ev.tippers).toFixed(2)}
              </Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>avg tip</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function SettingsTab({ theme }: { theme: any }) {
  const rows = [
    { icon: 'person-outline', label: 'Edit Profile', color: '#8B5CF6' },
    { icon: 'musical-notes-outline', label: 'Manage Tracks', color: '#F59E0B' },
    { icon: 'calendar-outline', label: 'Manage Availability', color: '#10B981' },
    { icon: 'link-outline', label: 'External Links', color: '#06B6D4' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#EC4899' },
    { icon: 'notifications-outline', label: 'Notification Settings', color: '#8B5CF6' },
  ];

  return (
    <View style={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>ACCOUNT</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {rows.map((row, i) => (
          <View
            key={i}
            style={[
              styles.settingsRow,
              i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={[styles.settingsIcon, { backgroundColor: row.color + '18' }]}>
              <Ionicons name={row.icon as any} size={16} color={row.color} />
            </View>
            <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>PROFESSIONAL PROFILE</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {[
          { icon: 'star-outline', label: 'Tier', value: 'Early Adopter', color: '#7C3AED' },
          { icon: 'lock-open-outline', label: 'Creator Status', value: 'Active', color: '#10B981' },
          { icon: 'card-outline', label: 'Creator Card', value: 'Published', color: '#F59E0B' },
        ].map((row, i, arr) => (
          <View key={i} style={[styles.settingsRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
            <View style={[styles.settingsIcon, { backgroundColor: row.color + '18' }]}>
              <Ionicons name={row.icon as any} size={16} color={row.color} />
            </View>
            <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{row.label}</Text>
            <Text style={[{ color: row.color, fontSize: 12, fontWeight: '600' }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Banner — exact match to ProfileScreen
  profileBannerContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  backButtonWrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  cameraBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fanPageBtn: {
    position: 'absolute',
    top: 62,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  profileContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
  },

  // Text overlays
  displayName: {
    ...Typography.headerLarge,
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  earlyBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
  },
  earlyBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  usernameText: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headlineText: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bioText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  socialIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 12,
    gap: 24,
  },
  statItem: { alignItems: 'flex-start' },
  statNumber: {
    ...Typography.headerMedium,
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  joinDate: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Tabs — exact mirror of ProfileScreen pill tabs
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  tabsInner: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  activeTab: {},
  tabText: { ...Typography.label, fontSize: 14, fontWeight: '500' },
  activeTabText: { fontWeight: '700' },

  sectionTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: { borderRadius: 14, overflow: 'hidden' },

  // Overview
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  overviewIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  overviewLabel: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', flex: 1 },
  overviewValue: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '600', letterSpacing: -0.3 },
  dropCard: { flexDirection: 'row', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  dropAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  dropAuthor: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  dropText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', lineHeight: 18, marginBottom: 3 },
  dropTime: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '300' },

  // Earnings
  totalCard: { borderRadius: 16, padding: 20 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', letterSpacing: 0.5, marginBottom: 4 },
  totalAmount: { color: '#fff', fontSize: 40, fontWeight: '700', letterSpacing: -1, marginBottom: 4 },
  totalSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '300', marginBottom: 14 },
  totalRow: { flexDirection: 'row', gap: 10 },
  totalPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  totalPillText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  tipFlag: { fontSize: 18, marginTop: 1 },
  tipMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  tipCity: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.3 },
  tipAmount: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '600', letterSpacing: -0.3 },
  tipBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipBarBg: { flex: 1, height: 3, borderRadius: 2 },
  tipBarFill: { height: 3, borderRadius: 2 },
  tipPlays: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '300', width: 62, textAlign: 'right' },
  eventTipCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  eventTipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTipName: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.3, flex: 1, paddingRight: 8 },
  eventTipAmount: { fontFamily: Typography.body.fontFamily, fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  eventTipMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },
  eventTipStats: { flexDirection: 'row', gap: 8 },
  eventTipStat: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  eventTipStatVal: { fontFamily: Typography.body.fontFamily, fontSize: 16, fontWeight: '600', letterSpacing: -0.3, marginBottom: 2 },
  eventTipStatLabel: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '300' },

  // Settings
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingsIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '300', flex: 1 },
});
