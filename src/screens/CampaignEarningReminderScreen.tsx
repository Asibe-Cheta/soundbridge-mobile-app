import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const TIP_ROOM_TUTORIAL_URL = 'https://youtu.be/r-uSu6bWQm4?si=08Ehn5PHIu_Isyxe';
const PROFILE_SETUP_TUTORIAL_URL = 'https://youtu.be/Wrx1BENJjGo?si=p38y24dJ8tKnj-E7';

export default function CampaignEarningReminderScreen() {
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Start Earning</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(16,185,129,0.20)', 'rgba(16,185,129,0.04)']}
              style={styles.heroGlow}
            />
            <View style={styles.iconRing}>
              <Ionicons name="cash" size={40} color="#10B981" />
            </View>
            <Text style={[styles.eyebrow, { color: '#10B981' }]}>ALREADY HAPPENING</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              People are already earning. Don't sleep on it.
            </Text>
            <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
              Creators on SoundBridge are getting tipped right now. Two ways to make sure
              you're one of them. Have you used both yet?
            </Text>
          </View>

          {/* Tip Room */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>WAY #1</Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Have you used the Tip Room?</Text>
              <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>
                Set a minimum tip, share your link or QR code (it takes zero seconds to
                generate), and let your audience request songs and tip you in real time.
                No app required on their end.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('RequestRoomSetup' as never)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="qr-code-outline" size={17} color="#fff" />
                  <Text style={styles.primaryButtonText}>Open Tip Room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkButton, { borderColor: theme.colors.border }]}
                  onPress={() => Linking.openURL(TIP_ROOM_TUTORIAL_URL)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play-circle-outline" size={17} color={theme.colors.text} />
                  <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>Watch tutorial</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Digital Card */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>WAY #2</Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your SoundBridge Digital Card</Text>
              <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>
                Your card has its own QR code. Share it on Instagram, and when fans scan it
                they land on your fan page, where they can listen and join your community for
                $1 or more, or free.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Profile' as never, { openShareCard: true } as never)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="card-outline" size={17} color="#fff" />
                  <Text style={styles.primaryButtonText}>Share My Digital Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkButton, { borderColor: theme.colors.border }]}
                  onPress={() => Linking.openURL(PROFILE_SETUP_TUTORIAL_URL)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play-circle-outline" size={17} color={theme.colors.text} />
                  <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>Set up your profile</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
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
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 30,
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

  card: {
    borderRadius: 16,
    padding: 18,
  },
  cardTitle: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 8,
  },
  cardBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
  },
  primaryButtonText: {
    ...Typography.button,
    fontSize: 14,
    color: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1,
  },
  linkButtonText: {
    ...Typography.button,
    fontSize: 14,
  },
});
