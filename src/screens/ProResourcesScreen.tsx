import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Static data ──────────────────────────────────────────────────────────────

const SA_STATS = [
  { value: '2,000+', label: 'Students Trained' },
  { value: '95%', label: 'Satisfaction' },
  { value: '75%', label: 'Employed in 3mo' },
  { value: '4.9/5', label: '580+ Reviews' },
];

export const SA_MODULES = [
  {
    id: 'sa-m1',
    moduleNumber: 1,
    title: 'Fundamentals of Recording & Mixing',
    subtitle: 'Beginner → Intermediate',
    description:
      'Master the foundations of professional audio production. Work hands-on with Pro Tools in a real studio — from initial setup through to your first premix.',
    duration: '1 month',
    format: 'Weekends · Sat & Sun · 10am–6pm',
    image: require('../../assets/fund.jpg') as number,
    overlayColors: ['rgba(232,82,26,0.48)', 'rgba(201,32,117,0.48)'] as [string, string],
    gradientColors: ['#E8521A', '#C92075'] as [string, string],
    subModules: [
      { number: 1, title: 'Introduction to DAW & Pro Tools', topics: ['Overview of DAWs and why Pro Tools', 'Basics of audio signal: frequency, amplitude, dynamics'] },
      { number: 2, title: 'Studio Setup & Installation', topics: ['Connecting and optimising audio equipment', 'Software settings: latency, buffer, sample rate'] },
      { number: 3, title: 'Session Management & Project Organisation', topics: ['Creating and managing Pro Tools sessions & templates', 'Input/output configuration, routing, and audio buses'] },
      { number: 4, title: 'Recording Techniques', topics: ['Microphone selection and placement in the studio', 'Take management and overdubbing (QuickPunch, Loop Record)'] },
      { number: 5, title: 'Introduction to Audio Editing', topics: ['Basic editing tools (cut, trim, fade, grab)', 'Organisation and management of audio clips & playlists'] },
      { number: 6, title: 'First Steps in Mixing', topics: ['Signal flow, pre-/post-fader management', 'Applying initial static balances'] },
      { number: 7, title: 'MIDI Integration in Pro Tools', topics: ['Creating MIDI tracks and virtual instruments', 'Timing management: Ticks vs Samples'] },
      { number: 8, title: 'Review & Preparation for Premix', topics: ['Independent work on complete sessions', 'Balancing & optimisation of the basic mix'] },
    ],
    certifications: ['Avid Pro Tools PT101'],
    ctaUrl: 'https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05',
    ctaLabel: 'Book an Appointment',
  },
  {
    id: 'sa-m2',
    moduleNumber: 2,
    title: 'Advanced Mixing Techniques',
    subtitle: 'Intermediate → Professional',
    description:
      'Push into professional mixing, mastering, and Dolby Atmos. Finish with a portfolio-ready final project and your Pro Tools certifications.',
    duration: '1 month',
    format: 'Weekends · Sat & Sun · 10am–6pm',
    image: require('../../assets/mix.jpg') as number,
    overlayColors: ['rgba(91,33,182,0.52)', 'rgba(201,32,117,0.52)'] as [string, string],
    gradientColors: ['#5B21B6', '#C92075'] as [string, string],
    subModules: [
      { number: 9,  title: 'Advanced Mixing', topics: ['Stereo placement, level management & advanced automation', 'Advanced equalisation & compression'] },
      { number: 10, title: 'Advanced Processing & Effects', topics: ['Mastery of reverb, delay, saturation & spatial effects', 'Effect automation for greater dynamics'] },
      { number: 11, title: 'Using VST Plugins', topics: ['Native vs third-party plugins, CPU optimisation', 'Parameter automation for a smoother workflow'] },
      { number: 12, title: 'Professional Mix Organisation', topics: ['Gain staging, routing & complex track management', 'CPU optimisation and final project preparation'] },
      { number: 13, title: 'Advanced Mastering', topics: ['Normalisation, EQ & compression techniques', 'Introduction to mastering with iZotope Ozone'] },
      { number: 14, title: 'Case Studies & Real-World Projects', topics: ['Applying techniques across different musical styles', 'Mix correction and refinement'] },
      { number: 15, title: 'Project Management & Final Export', topics: ['Exporting for digital, vinyl, and streaming formats', 'Project documentation and archiving'] },
      { number: 16, title: 'Certification & Validation of Skills', topics: ['Comprehensive review before the exam', 'Preparation for Pro Tools PT101 & PT110 certification'] },
    ],
    certifications: ['Avid Pro Tools PT101', 'Avid Pro Tools PT110', 'Dolby Atmos'],
    ctaUrl: 'https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05',
    ctaLabel: 'Book an Appointment',
  },
];

const T2D_SERVICES = [
  {
    id: 't2d-1',
    icon: 'people-outline' as const,
    title: 'Young People',
    subtitle: 'Ages 16–25',
    description: 'Helping young people break into creative and media industries. Practical guidance from someone who has lived it.',
    gradientColors: ['#064E3B', '#065F46'] as [string, string],
    ctaLabel: 'Get Started',
    ctaUrl: 'https://talk2dan.co.uk',
  },
  {
    id: 't2d-2',
    icon: 'school-outline' as const,
    title: 'Universities & Colleges',
    subtitle: 'Academic Partnerships',
    description: 'Bridging institutions and media employers to create clear pathways for students entering the industry.',
    gradientColors: ['#1E3A5F', '#1D4ED8'] as [string, string],
    ctaLabel: 'Partner With Us',
    ctaUrl: 'https://talk2dan.co.uk',
  },
  {
    id: 't2d-3',
    icon: 'tv-outline' as const,
    title: 'Media Companies',
    subtitle: 'Industry Consultancy',
    description: "Connecting companies with emerging talent. Dan has placed candidates at Sky, ITV, Channel 4 and more.",
    gradientColors: ['#3B0764', '#6D28D9'] as [string, string],
    ctaLabel: 'Work With Us',
    ctaUrl: 'https://talk2dan.co.uk',
  },
  {
    id: 't2d-4',
    icon: 'briefcase-outline' as const,
    title: 'Recruitment',
    subtitle: 'End-to-End Placement',
    description: 'Full recruitment support for creative and media roles — matching the right talent with the right opportunity.',
    gradientColors: ['#422006', '#B45309'] as [string, string],
    ctaLabel: 'Find Talent',
    ctaUrl: 'https://talk2dan.co.uk',
  },
];

// Inline requires so Metro static analysis always resolves both assets
const SA_MODULE_IMAGES: Record<string, any> = {
  'sa-m1': require('../../assets/fund.jpg'),
  'sa-m2': require('../../assets/mix.jpg'),
};

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = 'sound-academy' | 'talk2dan' | 'herts';
const TABS: { id: TabId; label: string }[] = [
  { id: 'sound-academy', label: 'Sound Academy' },
  { id: 'talk2dan',      label: 'Talk 2 Dan' },
  { id: 'herts',         label: 'Herts Uni' },
];

export default function ProResourcesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('sound-academy');

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      {/* Fixed header — never scrolls */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainHeader}>
        <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Pro{'\n'}Resources</Text>
        <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]}>
          Courses, coaching & career tools from our partners
        </Text>
      </View>

      <View style={[styles.tabsWrapper, { backgroundColor: theme.colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContentContainer}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.textTab}>
                <Text style={[
                  styles.textTabLabel,
                  { color: active ? theme.colors.text : (theme.isDark ? 'rgba(255,255,255,0.35)' : theme.colors.textSecondary) },
                  active && styles.textTabLabelActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable tab content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'sound-academy' && <SoundAcademyTab navigation={navigation} theme={theme} />}
        {activeTab === 'talk2dan'      && <Talk2DanTab theme={theme} />}
        {activeTab === 'herts'         && <HertsTab theme={theme} />}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sound Academy ────────────────────────────────────────────────────────────

function SoundAcademyTab({ navigation, theme }: any) {
  return (
    <View>
      {/* Partner badge row */}
      <View style={styles.partnerRow}>
        <Image source={require('../../assets/sa-2.png')} style={styles.partnerLogoSm} resizeMode="cover" />
        <View style={[styles.partnerBadge, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.35)' }]}>
          <View style={[styles.partnerDot, { backgroundColor: '#A78BFA' }]} />
          <Text style={[styles.partnerBadgeText, { color: '#C4B5FD' }]}>EDUCATION PARTNER · UK</Text>
        </View>
      </View>

      {/* Section: Sound Engineering Programme */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Sound Engineering</Text>
      </View>
      <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>
        2-month programme · Weekends · Official Avid Learning Partner
      </Text>

      {/* Module cards — horizontal scroll */}
      <FlatList
        horizontal
        data={SA_MODULES}
        keyExtractor={(m) => m.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardListContent}
        renderItem={({ item: mod, index }) => (
          <TouchableOpacity
            style={[styles.htmlCard, index === 0 && { marginLeft: 24 }]}
            onPress={() => navigation.navigate('CourseDetail', { module: mod })}
            activeOpacity={0.88}
          >
            <Image source={SA_MODULE_IMAGES[mod.id]} style={{ position: 'absolute', top: 0, left: 0, width: 280, height: 380 }} resizeMode="cover" />
            <LinearGradient colors={mod.overlayColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']} style={styles.htmlCardGradient} />

            {/* Badge */}
            <View style={styles.htmlBadge}>
              <Text style={styles.htmlBadgeText}>MODULE {mod.moduleNumber}</Text>
            </View>

            {/* Content */}
            <View style={styles.htmlCardContent}>
              <Text style={styles.htmlCardTitle} numberOfLines={2}>{mod.title}</Text>
              <Text style={styles.htmlCardArtist}>{mod.subtitle}</Text>
              <View style={styles.htmlCardMeta}>
                <Ionicons name="list-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.htmlCardMetaText}>{mod.subModules.length} units</Text>
                <View style={styles.htmlDot} />
                <Ionicons name="ribbon-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.htmlCardMetaText}>{mod.certifications.length} cert{mod.certifications.length > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Stats section */}
      <View style={[styles.sectionHeader, { marginTop: 32 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>By the Numbers</Text>
      </View>
      <View style={styles.statsGrid}>
        {SA_STATS.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.card, borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.saCtaWrap}
        onPress={() => Linking.openURL('https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtnGradient}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Book a Free Appointment</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Talk 2 Dan ───────────────────────────────────────────────────────────────

function Talk2DanTab({ theme }: any) {
  return (
    <View>
      {/* Partner badge row */}
      <View style={styles.partnerRow}>
        <Image source={require('../../assets/T2Dhome.png')} style={styles.partnerLogoSm} resizeMode="cover" />
        <View style={[styles.partnerBadge, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' }]}>
          <View style={[styles.partnerDot, { backgroundColor: '#34D399' }]} />
          <Text style={[styles.partnerBadgeText, { color: '#6EE7B7' }]}>INDUSTRY PARTNER · UK</Text>
        </View>
      </View>

      {/* Dan bio */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About Dan</Text>
      </View>
      <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>
        Dan founded Talk 2 Dan in 2017 from personal experience navigating the barriers of breaking into the creative industry. With a background spanning{' '}
        <Text style={[styles.bioHighlight, { color: theme.colors.text }]}>Sky, ITV, Channel 4</Text>
        {' '}and independent production companies, he bridges the gap between young talent and employers.
      </Text>

      {/* Services */}
      <View style={[styles.sectionHeader, { marginTop: 28 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Services</Text>
      </View>

      {/* Service cards — horizontal scroll */}
      <FlatList
        horizontal
        data={T2D_SERVICES}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardListContent}
        renderItem={({ item: svc, index }) => (
          <TouchableOpacity
            style={[styles.htmlCard, index === 0 && { marginLeft: 24 }]}
            onPress={() => Linking.openURL(svc.ctaUrl)}
            activeOpacity={0.88}
          >
            <LinearGradient colors={svc.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} style={styles.htmlCardGradient} />

            <View style={styles.htmlBadge}>
              <Text style={styles.htmlBadgeText}>{svc.subtitle.toUpperCase()}</Text>
            </View>

            <View style={[styles.htmlCardIconWrap]}>
              <Ionicons name={svc.icon} size={40} color="rgba(255,255,255,0.25)" />
            </View>

            <View style={styles.htmlCardContent}>
              <Text style={styles.htmlCardTitle} numberOfLines={2}>{svc.title}</Text>
              <Text style={styles.htmlCardArtist} numberOfLines={3}>{svc.description}</Text>
              <View style={styles.htmlCardMeta}>
                <Text style={[styles.htmlCardMetaText, { color: 'rgba(255,255,255,0.55)' }]}>{svc.ctaLabel} →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: '#059669', marginTop: 28 }]}
        onPress={() => Linking.openURL('https://talk2dan.co.uk')}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
        <Text style={styles.ctaBtnText}>Talk 2 Dan</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Herts (Coming Soon) ──────────────────────────────────────────────────────

function HertsTab({ theme }: any) {
  return (
    <View>
      <View style={styles.partnerRow}>
        <View style={[styles.hertsLogo, { borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border }]}>
          <Text style={styles.hertsLogoText}>UH</Text>
        </View>
        <View style={[styles.partnerBadge, { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.3)' }]}>
          <View style={[styles.partnerDot, { backgroundColor: '#93C5FD' }]} />
          <Text style={[styles.partnerBadgeText, { color: '#BFDBFE' }]}>ACADEMIC PARTNER · UK</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coming Soon</Text>
      </View>
      <Text style={[styles.bioText, { color: theme.colors.textSecondary, marginBottom: 32 }]}>
        We're finalising our partnership with the University of Hertfordshire. Course listings, degree details, and application pathways will appear here once the partnership is confirmed.
      </Text>

      {/* Placeholder card */}
      <FlatList
        horizontal
        data={[{ id: 'placeholder' }]}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardListContent}
        scrollEnabled={false}
        renderItem={() => (
          <View style={[styles.htmlCard, { marginLeft: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border, borderWidth: 1 }]}>
            <Ionicons name="hourglass-outline" size={48} color={theme.colors.primary} />
            <Text style={[styles.htmlCardTitle, { color: theme.colors.text, textAlign: 'center', marginTop: 16 }]}>
              Content{'\n'}Coming Soon
            </Text>
            <Text style={[styles.htmlCardArtist, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              University of Hertfordshire
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary, marginTop: 28 }]}
        onPress={() => Linking.openURL('https://www.herts.ac.uk')}
        activeOpacity={0.8}
      >
        <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.ctaBtnText, { color: theme.colors.primary }]}>Visit herts.ac.uk</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles — mirrors DiscoverScreen exactly ──────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topNav: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  mainHeader: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // Tab bar — exact copy of DiscoverScreen
  tabsWrapper: {
    paddingHorizontal: 24,
    marginBottom: 32,
    paddingBottom: 8,
  },
  tabsContentContainer: {
    paddingBottom: 8,
    alignItems: 'baseline',
  },
  textTab: {
    marginRight: 48,
  },
  textTabLabel: {
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  textTabLabelActive: {
    fontWeight: '600',
  },

  // Section headers — exact copy
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    ...Typography.label,
    fontSize: 13,
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  // Cards — exact copy of htmlCard
  cardListContent: {
    paddingRight: 24,
  },
  htmlCard: {
    width: 280,
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  htmlCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  htmlBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  htmlBadgeText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1.2,
  },
  htmlCardIconWrap: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -20 }],
    zIndex: 5,
  },
  htmlCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
  },
  htmlCardTitle: {
    ...Typography.headerMedium,
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  htmlCardArtist: {
    ...Typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  htmlCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  htmlCardMetaText: {
    ...Typography.label,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginLeft: 4,
  },
  htmlDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: 8,
    marginRight: 4,
  },

  // Stats grid (2×2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: (SCREEN_W - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.heading,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // CTA button
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    borderRadius: 32,
    paddingVertical: 15,
    marginBottom: 8,
  },
  saCtaWrap: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 32,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Partner badge row
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  partnerLogoSm: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  partnerDot: { width: 6, height: 6, borderRadius: 3 },
  partnerBadgeText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // T2D / Herts logo placeholders
  t2dLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  t2dLogoText: { color: '#EC4899', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  hertsLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hertsLogoText: { color: '#60A5FA', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  // Bio text
  bioText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  bioHighlight: {
    fontWeight: '600',
  },
});
