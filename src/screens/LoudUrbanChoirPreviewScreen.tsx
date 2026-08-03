import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import VerifiedBadge from '../components/VerifiedBadge';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const COVER_PHOTO = require('../../assets/luc-cover-banner.png');
const PROFILE_PIC = require('../../assets/loud-profile-pic.jpg');
const RISE_COVER = require('../../assets/loud-rise-cover.jpg');
const SOMEWHERE_COVER = require('../../assets/loud-somewhere-cover.jpg');

const PORTFOLIO_IMAGES = [
  require('../../assets/images/luc/Frame-1000003451.png'),
  require('../../assets/images/luc/Frame-1000003452-2.png'),
  require('../../assets/images/luc/Frame-1000003451-5.png'),
  require('../../assets/images/luc/Frame-1000003451-3.png'),
  require('../../assets/images/luc/Frame-1000003451-4.png'),
  require('../../assets/images/luc/Frame-1000003451-7.png'),
  require('../../assets/images/luc/Frame-1000003451-9.png'),
  require('../../assets/images/luc/Frame-1000003451-10.png'),
  require('../../assets/images/luc/Frame-1000003452-5.png'),
  require('../../assets/images/luc/Frame-1000003452-6.png'),
  require('../../assets/images/luc/Frame-1000003452-8.png'),
  require('../../assets/images/luc/Frame-1000003452-9.png'),
  require('../../assets/images/luc/Frame-1000003452-10.png'),
];

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_ITEM = (SCREEN_W - 6) / 3;

const MOCK_TRACKS = [
  { id: '1', title: 'RISE', subtitle: 'Released Oct 2025', cover: RISE_COVER },
  { id: '2', title: 'Somewhere', subtitle: 'Debut single', cover: SOMEWHERE_COVER },
];

const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Lagos Fashion Weekend',
    date: 'Dec 15, 2025',
    time: '7:00 PM',
    venue: 'Eko Hall',
    location: 'Lagos, Nigeria',
    status: 'past',
  },
  {
    id: '2',
    title: 'AJOYO X Loud Urban Choir',
    date: 'Jan 10, 2026',
    time: '6:00 PM',
    venue: 'Accra Theatre',
    location: 'Accra, Ghana',
    status: 'past',
  },
  {
    id: '3',
    title: 'Living Loud — The Concert',
    date: 'Feb 20, 2026',
    time: '8:00 PM',
    venue: 'National Theatre',
    location: 'Abuja, Nigeria',
    status: 'past',
  },
  {
    id: '4',
    title: 'Canada Tour',
    date: 'TBA',
    time: '',
    venue: 'Toronto · Vancouver · Montreal',
    location: 'Canada',
    status: 'upcoming',
  },
  {
    id: '5',
    title: 'UK Tour',
    date: 'TBA',
    time: '',
    venue: 'London · Manchester · Birmingham',
    location: 'United Kingdom',
    status: 'upcoming',
  },
];

type Tab = 'drops' | 'releases' | 'events' | 'photos' | 'about';

export default function LoudUrbanChoirPreviewScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('drops');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'drops', label: 'Drops' },
    { key: 'releases', label: 'Releases' },
    { key: 'events', label: 'Events' },
    { key: 'photos', label: 'Portfolio' },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
          <BackButton style={[styles.headerButton, { borderWidth: 0 }]} onPress={() => navigation.goBack()} />
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Loud Urban Choir</Text>
            <VerifiedBadge size={14} />
          </View>
          <View style={styles.headerActionsRow} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            {/* Banner */}
            <View style={styles.bannerContainer}>
              <Image source={COVER_PHOTO} style={styles.bannerImage} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              {/* Floating action buttons — matches CreatorProfileScreen */}
              <View style={styles.bannerActions}>
                <TouchableOpacity style={styles.bannerIconBtn} activeOpacity={0.8}>
                  <Ionicons name="people-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.bannerIconBtn} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#9333EA', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradientRing}
              >
                <Image source={PROFILE_PIC} style={styles.avatarInner} resizeMode="cover" />
              </LinearGradient>
            </View>

            {/* Name section */}
            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: theme.colors.text }]}>Loud Urban Choir</Text>
                <VerifiedBadge size={16} />
              </View>
              <Text style={[styles.professionalHeadline, { color: theme.colors.textSecondary }]}>
                Official page of Loud Urban Choir
              </Text>
              <Text style={[styles.username, { color: theme.colors.textSecondary }]}>@loudurbanchoir</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>Lagos, Nigeria</Text>
                </View>
                <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.genreText, { color: theme.colors.primary }]}>Contemporary Choir | Afro-Fusion</Text>
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>193K</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>12</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Following</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>2</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tracks</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>3</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Events</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>New</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Rating</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
            {TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.tab, activeTab === key && styles.activeTab, activeTab === key && { borderBottomColor: theme.colors.primary }]}
                onPress={() => setActiveTab(key)}
              >
                <Text style={[styles.tabText, { color: activeTab === key ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'drops' && <DropsTab theme={theme} />}
            {activeTab === 'releases' && <ReleasesTab theme={theme} />}
            {activeTab === 'events' && <EventsTab theme={theme} />}
            {activeTab === 'photos' && <PortfolioTab theme={theme} />}
            {activeTab === 'about' && <AboutTab theme={theme} />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DropsTab({ theme }: { theme: any }) {
  return (
    <View style={{ padding: 16 }}>
      <View style={[styles.dropCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Image source={PROFILE_PIC} style={styles.dropAvatar} />
        <View style={styles.dropBody}>
          <Text style={[styles.dropAuthor, { color: theme.colors.text }]}>Loud Urban Choir · You</Text>
          <Text style={[styles.dropText, { color: theme.colors.textSecondary }]}>Official page of Loud Urban Choir</Text>
          <Text style={[styles.dropTime, { color: theme.colors.textSecondary }]}>5d ago</Text>
        </View>
      </View>
    </View>
  );
}

function ReleasesTab({ theme }: { theme: any }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      {MOCK_TRACKS.map((track) => (
        <View key={track.id} style={[styles.trackRow, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.trackCover, { backgroundColor: theme.colors.surface }]}>
            <Image source={track.cover} style={styles.trackImage} resizeMode="cover" />
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.colors.text }]}>{track.title}</Text>
            <Text style={[styles.trackSub, { color: theme.colors.textSecondary }]}>{track.subtitle}</Text>
          </View>
          <Ionicons name="play-circle-outline" size={28} color={theme.colors.primary} />
        </View>
      ))}
    </View>
  );
}

function EventsTab({ theme }: { theme: any }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {MOCK_EVENTS.map((event) => (
        <View
          key={event.id}
          style={[
            styles.eventCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            event.status === 'upcoming' && { borderColor: theme.colors.primary + '40' },
          ]}
        >
          <View style={styles.eventDateBadge}>
            <Text style={[styles.eventDateText, { color: theme.colors.primary }]}>{event.date}</Text>
            {event.time ? <Text style={[styles.eventTimeText, { color: theme.colors.textSecondary }]}>{event.time}</Text> : null}
          </View>
          <View style={styles.eventInfo}>
            <View style={styles.eventTitleRow}>
              <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
              {event.status === 'upcoming' && (
                <View style={[styles.upcomingBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.upcomingText, { color: theme.colors.primary }]}>Coming Soon</Text>
                </View>
              )}
            </View>
            <Text style={[styles.eventVenue, { color: theme.colors.textSecondary }]}>{event.venue}</Text>
            <View style={styles.eventLocationRow}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]}>{event.location}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function PortfolioTab({ theme }: { theme: any }) {
  return (
    <View style={styles.portfolioGrid}>
      {PORTFOLIO_IMAGES.map((img, index) => (
        <View key={index} style={styles.portfolioItem}>
          <Image source={img} style={styles.portfolioImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            start={{ x: 0, y: 0.6 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </View>
      ))}
    </View>
  );
}

function AboutTab({ theme }: { theme: any }) {
  return (
    <View style={styles.aboutSection}>
      <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>About</Text>
        <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
          An alliance of individually talented and uniquely gifted, established artists with the mutual aim of creating contemporary choral music experiences that highlight and celebrate our rich, diverse roots. Our mission is to transcend musical boundaries, creating immersive experiences for audiences. The vision is to be a global force in genre-blending music, driven by creativity and innovation. Core values such as authenticity, collaboration, and artistic expression form the foundation of LUC's identity.
        </Text>
      </View>
      <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.aboutRow}>
          <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>Lagos, Nigeria</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="musical-notes-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>Contemporary Choir · Afro-Fusion</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="logo-instagram" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>@loudurbanchoir · 193K followers</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerButton: { padding: 8 },
  headerActionsRow: { width: 40 },
  headerTitle: {
    fontFamily: Typography.headerMedium.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },

  scrollView: { flex: 1, backgroundColor: 'transparent' },
  profileSection: { paddingBottom: 8 },

  bannerContainer: { width: '100%', height: 160, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 160 },
  bannerActions: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
    flexDirection: 'column',
    alignItems: 'center',
  },
  bannerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarWrapper: { alignSelf: 'center', marginTop: -50, marginBottom: 12 },
  avatarGradientRing: { width: 106, height: 106, borderRadius: 53, padding: 3, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 100, height: 100, borderRadius: 50 },

  nameSection: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  displayName: {
    fontFamily: Typography.headerMedium.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  professionalHeadline: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  username: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '300',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: Typography.body.fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '300', letterSpacing: -0.4 },
  genreTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  genreText: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  statLabel: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '300', letterSpacing: -0.4, lineHeight: 16 },

  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontFamily: Typography.body.fontFamily, fontSize: 13, lineHeight: 22, fontWeight: '300', letterSpacing: -0.4 },
  tabContent: { flex: 1 },

  // Drops
  dropCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  dropAvatar: { width: 42, height: 42, borderRadius: 21 },
  dropBody: { flex: 1 },
  dropAuthor: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  dropText: { fontFamily: Typography.body.fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '300', marginBottom: 4 },
  dropTime: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },

  // Releases
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    marginBottom: 8,
    borderRadius: 8,
  },
  trackCover: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  trackImage: { width: '100%', height: '100%', borderRadius: 8 },
  trackInfo: { flex: 1 },
  trackTitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, lineHeight: 18, fontWeight: '300', letterSpacing: -0.4, marginBottom: 3 },
  trackSub: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },

  // Events
  eventCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  eventDateBadge: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  eventDateText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  eventTimeText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 11,
    fontWeight: '300',
    marginTop: 2,
    textAlign: 'center',
  },
  eventInfo: { flex: 1 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  eventTitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.3, flex: 1 },
  upcomingBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  upcomingText: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '600' },
  eventVenue: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.3, marginBottom: 4 },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eventLocation: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },

  // Portfolio grid
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  portfolioItem: { width: GRID_ITEM, height: GRID_ITEM, margin: 1, position: 'relative', overflow: 'hidden' },
  portfolioImage: { width: '100%', height: '100%' },

  // About
  aboutSection: { padding: 16 },
  aboutCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  aboutTitle: { fontFamily: Typography.body.fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '300', letterSpacing: -0.4, marginBottom: 12 },
  aboutText: { fontFamily: Typography.body.fontFamily, fontSize: 14, lineHeight: 22, fontWeight: '300', letterSpacing: -0.4 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
});
