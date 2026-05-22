import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

export default function CourseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { module: mod } = route.params as { module: any };

  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed gradient hero — mirrors Discover card aesthetic */}
      <LinearGradient colors={mod.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>MODULE {mod.moduleNumber} · SOUND ACADEMY UK</Text>
        </View>
        <Text style={styles.heroTitle}>{mod.title}</Text>
        <Text style={styles.heroSubtitle}>{mod.subtitle}</Text>

        {/* Meta row */}
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroMetaText}>{mod.duration}</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroMetaText}>{mod.format}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About this module</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>{mod.description}</Text>
        </View>

        {/* Certifications */}
        {mod.certifications?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Certifications Awarded</Text>
            <View style={[styles.certBox, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.colors.card, borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border }]}>
              {mod.certifications.map((cert: string) => (
                <View key={cert} style={styles.certRow}>
                  <Ionicons name="ribbon" size={16} color="#F59E0B" />
                  <Text style={[styles.certText, { color: theme.colors.text }]}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Units */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {mod.subModules.length} Units
          </Text>
          {mod.subModules.map((unit: any) => {
            const expanded = expandedUnit === unit.number;
            return (
              <TouchableOpacity
                key={unit.number}
                style={[styles.unitRow, { borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border }]}
                onPress={() => setExpandedUnit(expanded ? null : unit.number)}
                activeOpacity={0.7}
              >
                <View style={[styles.unitNumBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.unitNum, { color: theme.colors.primary }]}>{unit.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.unitTitle, { color: theme.colors.text }]}>{unit.title}</Text>
                  {expanded && (
                    <View style={styles.topicList}>
                      {unit.topics.map((t: string, i: number) => (
                        <View key={i} style={styles.topicRow}>
                          <View style={[styles.topicDot, { backgroundColor: theme.colors.primary }]} />
                          <Text style={[styles.topicText, { color: theme.colors.textSecondary }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.saCtaWrap}
          onPress={() => Linking.openURL(mod.ctaUrl)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtnGradient}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>{mod.ctaLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={[styles.ctaNote, { color: theme.colors.textSecondary }]}>
          Free 30-min consultation · No obligation
        </Text>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero — full bleed gradient matching the card it came from
  hero: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  heroBadgeText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 6,
  },
  heroSubtitle: {
    ...Typography.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  heroMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroMetaText: {
    ...Typography.label,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  // Scroll content
  scroll: { paddingTop: 0 },

  section: { paddingHorizontal: 24, paddingTop: 28, marginBottom: 0 },
  sectionTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  bodyText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 23,
  },

  // Certs
  certBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  certText: { ...Typography.body, fontSize: 14, fontWeight: '500' },

  // Units — Discover list-row style
  unitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  unitNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  unitNum: { ...Typography.label, fontSize: 13, fontWeight: '700' },
  unitTitle: { ...Typography.body, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  topicList: { marginTop: 10, gap: 7 },
  topicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topicDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7, flexShrink: 0 },
  topicText: { ...Typography.label, flex: 1, fontSize: 13, lineHeight: 19 },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    borderRadius: 32,
    paddingVertical: 15,
    marginTop: 32,
    marginBottom: 8,
  },
  saCtaWrap: {
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 32,
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 32,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  ctaNote: { ...Typography.label, fontSize: 12, textAlign: 'center' },
});
