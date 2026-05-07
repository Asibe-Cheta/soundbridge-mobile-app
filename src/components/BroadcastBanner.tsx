import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

// ─── Config ──────────────────────────────────────────────────────────────────
// Bump BROADCAST_ID to force the banner to re-appear for all users.
const BROADCAST_ID = 'broadcast_location_notifications_v1';
const RESHOW_DAYS = 7;

const TITLE = 'Action Required — Keep Your Location & Notifications On';

// Segments: empty strings become View spacers; lines starting with '—' are bolded bullets.
const BODY_SEGMENTS = [
  'To get the most out of SoundBridge, you need to keep both your location and notifications turned on for this app.',
  '',
  'Everything SoundBridge does for you depends on these being active — from getting discovered by fans nearby, to receiving event recommendations, to being matched with collaboration opportunities, to getting tipped in real time, to your AI Career Adviser knowing where to point your career.',
  '',
  'Think of it like Uber. Uber cannot work without location and notifications. Neither can SoundBridge.',
  '',
  "You don't need to turn on location for every app — but for this one, it is essential.",
  '',
  "Here's what you miss without it:",
  '— You won\'t appear in local event discovery',
  '— Fans nearby won\'t find your music',
  '— You won\'t receive gig or collaboration alerts',
  '— Your AI Career Adviser won\'t be able to give you location-based direction',
  '— You\'ll miss real-time tip notifications',
  '',
  "Go to your phone Settings → SoundBridge → turn on Location (set to 'Always' or 'While Using') and Notifications.",
  '',
  "We'll keep reminding you because we want SoundBridge to work fully for you.",
  '',
  '— The SoundBridge Team',
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = `@soundbridge/${BROADCAST_ID}`;

interface DismissalRecord {
  dismissedAt: string;
  nextShowAt: string | null; // null = permanently dismissed
}

async function getDismissalRecord(): Promise<DismissalRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveDismissal(permanent: boolean): Promise<void> {
  try {
    const now = new Date();
    const record: DismissalRecord = {
      dismissedAt: now.toISOString(),
      nextShowAt: permanent
        ? null
        : new Date(now.getTime() + RESHOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Non-critical — worst case the banner re-appears next launch
  }
}

async function shouldShowBanner(): Promise<boolean> {
  const record = await getDismissalRecord();

  // Never seen
  if (!record) return true;

  // Permanently dismissed
  if (record.nextShowAt === null) return false;

  // Not yet time to re-show
  if (new Date() < new Date(record.nextShowAt)) return false;

  // Time to potentially re-show — only if location permission is still off
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status !== 'granted';
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BroadcastBanner() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const dismissingRef = useRef(false);

  // Decide whether to show — runs once on mount
  useEffect(() => {
    shouldShowBanner().then(show => {
      if (show) setVisible(true);
    });
  }, []);

  // Start slide-in animation only after the Modal is actually in the tree
  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(SCREEN_H); // reset to fully off-screen
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const dismiss = async (permanent: boolean) => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;

    // Save to AsyncStorage first so we never show it again if the app is killed mid-animation
    await saveDismissal(permanent);

    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      dismissingRef.current = false;
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss(true)}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={40}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.isDark
                ? 'rgba(10,4,28,0.97)'
                : 'rgba(255,255,255,0.97)',
              borderColor: 'rgba(168,85,247,0.3)',
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top accent strip */}
          <LinearGradient
            colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topStrip}
          />

          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGrad}
            >
              <Ionicons name="alert-circle" size={22} color="#fff" />
            </LinearGradient>
            <View style={styles.headerText}>
              <Text style={[styles.from, { color: '#a855f7' }]}>SoundBridge</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {TITLE}
              </Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {BODY_SEGMENTS.map((line, i) =>
              line === '' ? (
                <View key={i} style={styles.spacer} />
              ) : (
                <Text
                  key={i}
                  style={[
                    styles.bodyLine,
                    { color: theme.colors.textSecondary },
                    line.startsWith('—') && styles.bulletLine,
                    line.startsWith('—') && { color: theme.colors.text },
                    line === '— The SoundBridge Team' && styles.signOff,
                  ]}
                >
                  {line}
                </Text>
              )
            )}
          </ScrollView>

          {/* Actions */}
          <View
            style={[
              styles.actions,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.remindBtn,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => dismiss(false)}
              activeOpacity={0.75}
            >
              <Text style={[styles.remindText, { color: theme.colors.textSecondary }]}>
                Remind me in {RESHOW_DAYS} days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gotItBtn}
              onPress={() => dismiss(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#a855f7', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gotItGrad}
              >
                <Text style={styles.gotItText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: SCREEN_H * 0.82,
    overflow: 'hidden',
  },
  topStrip: {
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  iconGrad: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  from: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  bodyScroll: {
    maxHeight: SCREEN_H * 0.46,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  bodyLine: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletLine: {
    fontWeight: '600',
  },
  signOff: {
    fontWeight: '700',
    fontStyle: 'italic',
  },
  spacer: {
    height: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  remindBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  remindText: {
    ...Typography.label,
    fontSize: 13,
    fontWeight: '600',
  },
  gotItBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gotItGrad: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  gotItText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
