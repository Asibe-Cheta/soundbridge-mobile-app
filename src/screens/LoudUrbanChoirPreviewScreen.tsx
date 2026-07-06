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

// Replace these placeholder files with real Loud Urban Choir assets
const COVER_PHOTO = require('../../assets/loud-cover-photo.jpg');
const PROFILE_PIC = require('../../assets/loud-profile-pic.jpg');
const RISE_COVER = require('../../assets/loud-rise-cover.jpg');
const SOMEWHERE_COVER = require('../../assets/loud-somewhere-cover.jpg');
const MEMBER_1 = require('../../assets/loud-member-1.jpg');
const MEMBER_2 = require('../../assets/loud-member-2.jpg');
const MEMBER_3 = require('../../assets/loud-member-3.jpg');

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_ITEM = (SCREEN_W - 4) / 3;

const MOCK_TRACKS = [
  { id: '1', title: 'RISE', subtitle: 'Released Oct 2025', cover: RISE_COVER },
  { id: '2', title: 'Somewhere', subtitle: 'Debut single', cover: SOMEWHERE_COVER },
];

const MOCK_MEMBERS = [
  { id: '1', image: MEMBER_1, name: 'Shimmer' },
  { id: '2', image: MEMBER_2, name: 'Angelika Belle' },
  { id: '3', image: MEMBER_3, name: 'SpiritVibes' },
];

type Tab = 'drops' | 'tracks' | 'albums' | 'photos' | 'about';

export default function LoudUrbanChoirPreviewScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('drops');

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

        {/* Admin preview ribbon */}
        <View style={styles.previewRibbon}>
          <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.previewRibbonText}>ADMIN PREVIEW — Not visible to users</Text>
        </View>

        {/* Header — matches CreatorProfileScreen exactly */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton style={styles.headerButton} onPress={() => navigation.goBack()} />
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
                colors={['transparent', 'rgba(0,0,0,0.45)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
            </View>

            {/* Avatar — centered, overlaps banner */}
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
            {(['drops', 'tracks', 'albums', 'photos', 'about'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab, activeTab === tab && { borderBottomColor: theme.colors.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {tab === 'photos' ? 'Portfolio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'drops' && <DropsTab theme={theme} />}
            {activeTab === 'tracks' && <TracksTab theme={theme} />}
            {activeTab === 'albums' && <EmptyTab theme={theme} icon="disc-outline" message="No albums yet" />}
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

function TracksTab({ theme }: { theme: any }) {
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

function EmptyTab({ theme, icon, message }: { theme: any; icon: any; message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

function PortfolioTab({ theme }: { theme: any }) {
  return (
    <View style={styles.portfolioGrid}>
      {MOCK_MEMBERS.map((m) => (
        <View key={m.id} style={styles.portfolioItem}>
          <Image source={m.image} style={styles.portfolioImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <Text style={styles.portfolioLabel}>{m.name}</Text>
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
        <View style={[styles.aboutRow]}>
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

  previewRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(220,38,38,0.75)',
    paddingVertical: 4,
  },
  previewRibbonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

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

  bannerContainer: { width: '100%', height: 150, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 150 },

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
  tabText: { fontFamily: Typography.body.fontFamily, fontSize: 15, lineHeight: 22, fontWeight: '300', letterSpacing: -0.4 },
  tabContent: { flex: 1 },

  // Drops
  dropCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  dropAvatar: { width: 42, height: 42, borderRadius: 21 },
  dropBody: { flex: 1 },
  dropAuthor: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  dropText: { fontFamily: Typography.body.fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '300', marginBottom: 4 },
  dropTime: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },

  // Tracks
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

  // Empty
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: Typography.body.fontFamily, fontSize: 16, lineHeight: 22, fontWeight: '300', marginTop: 16 },

  // Portfolio grid
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  portfolioItem: { width: GRID_ITEM, height: GRID_ITEM, margin: 1, position: 'relative', overflow: 'hidden' },
  portfolioImage: { width: '100%', height: '100%' },
  portfolioLabel: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // About
  aboutSection: { padding: 16 },
  aboutCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  aboutTitle: { fontFamily: Typography.body.fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '300', letterSpacing: -0.4, marginBottom: 12 },
  aboutText: { fontFamily: Typography.body.fontFamily, fontSize: 14, lineHeight: 22, fontWeight: '300', letterSpacing: -0.4 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
});
