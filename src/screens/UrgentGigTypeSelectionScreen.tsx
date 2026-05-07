// src/screens/UrgentGigTypeSelectionScreen.tsx
// C2 — Entry point when tapping "Post a Gig".
// Lets the user choose: Planned Opportunity vs Urgent Gig.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';

export default function UrgentGigTypeSelectionScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={theme.isDark ? ['#0F0F1A', '#1A0A2E', '#0D1117'] : ['#F8F4FF', '#EEE8FF', '#F0EBFF']}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post a Gig</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            What kind of gig are you posting?
          </Text>

          {/* Planned Opportunity */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateOpportunity' as never)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardIconBox}>
                <Ionicons name="calendar" size={40} color="#fff" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Plan a Gig</Text>
                <Text style={styles.cardDesc}>
                  Post a collaboration, event slot, or job.{'\n'}Review applicants at your own pace.
                </Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Urgent Gig */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateUrgentGig' as never)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={['#DC2626', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardIconBox}>
                <Text style={{ fontSize: 40 }}>🔥</Text>
              </View>
              <View style={styles.cardText}>
                <View style={styles.urgentRow}>
                  <Text style={styles.cardTitle}>Urgent Gig</Text>
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>
                  Need someone right now.{'\n'}Last-minute, location-based. Usually fills in minutes.
                </Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info note */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Urgent gigs require upfront payment held in escrow. Released when both parties confirm completion.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  cardArrow: {
    marginLeft: 8,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  urgentBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
