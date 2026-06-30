import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onContinue: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const SECTIONS = [
  {
    title: 'What SoundBridge accesses',
    body: 'Only your free and busy times.',
    icon: 'checkmark-circle' as const,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
  },
  {
    title: 'What SoundBridge never accesses',
    body: 'Event names, descriptions, locations, attendees or any other details.',
    icon: 'close-circle' as const,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
  },
  {
    title: 'How we use it',
    body: 'To recommend events that fit your schedule and help artists plan performances when you are free.',
    icon: 'information-circle' as const,
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.1)',
    border: 'rgba(99,102,241,0.3)',
  },
];

export default function GoogleCalendarPrivacyModal({
  visible,
  onContinue,
  onCancel,
  loading = false,
}: Props) {
  const { theme } = useTheme();
  const sheetBg = theme.isDark ? '#131929' : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: sheetBg }]}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
            ]}
          />

          <View style={styles.headerRow}>
            <View style={styles.calIconWrap}>
              <Ionicons name="logo-google" size={22} color="#4285F4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Google Calendar</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Before connecting, here is exactly what SoundBridge can and cannot see.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View
                key={section.title}
                style={[styles.section, { backgroundColor: section.bg, borderColor: section.border }]}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name={section.icon} size={20} color={section.color} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {section.title}
                  </Text>
                </View>
                <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>
                  {section.body}
                </Text>
              </View>
            ))}

            <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
              You can disconnect at any time from Settings → Connected Apps.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtnWrap, { opacity: loading ? 0.7 : 1 }]}
            onPress={onContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>I understand, continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  calIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(66,133,244,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66,133,244,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    maxHeight: 320,
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 28,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  primaryBtnWrap: {
    marginTop: 20,
    borderRadius: 999,
    overflow: 'hidden',
  },
  primaryBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 999,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
