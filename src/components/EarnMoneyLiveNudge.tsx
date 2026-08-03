import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const NUDGE_KEY = 'sb_earn_live_nudge_v1';
const CADENCE_DAYS = 7;

function getCopyVariant(): string {
  const day = new Date().getDate();
  if (day === 1) return 'Happy new month! Earn money live this month';
  if (day <= 7) return 'Earn money live this month';
  return 'Earn money live this week';
}

async function shouldShowNudge(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(NUDGE_KEY);
    if (!raw) return true;
    const daysSince = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
    return daysSince >= CADENCE_DAYS;
  } catch {
    return false;
  }
}

interface Props {
  isCreator: boolean;
}

export default function EarnMoneyLiveNudge({ isCreator }: Props) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-140)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = getCopyVariant();

  useEffect(() => {
    if (!isCreator) return;
    // Delay so the feed renders first
    const checkTimer = setTimeout(async () => {
      const show = await shouldShowNudge();
      if (!show) return;
      // Record before showing so back-to-back app opens don't double-show
      try { await AsyncStorage.setItem(NUDGE_KEY, String(Date.now())); } catch {}
      setVisible(true);
      slideAnim.setValue(-140);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
      dismissTimer.current = setTimeout(dismiss, 12000);
    }, 3000);
    return () => clearTimeout(checkTimer);
  }, [isCreator]);

  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  const dismiss = () => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -140, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const handleTipRoom = () => {
    dismiss();
    navigation.navigate('LiveSessions', { initialTab: 'tip_room' });
  };

  const handleAdvisor = () => {
    dismiss();
    navigation.navigate('AICareerAdvisor', {
      initialPrompt: 'I want to start earning money from live performances. Can you help me understand the best ways to use my Tip Room QR code at gigs and events?',
    });
  };

  if (!visible) return null;

  const content = (
    <>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{copy}</Text>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Show your Tip Room QR code at gigs, events, and meetups — fans can tip instantly, no app needed.
      </Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={handleTipRoom} activeOpacity={0.85}>
          <Ionicons name="qr-code-outline" size={13} color="#fff" />
          <Text style={styles.btnTextLight}>Open Tip Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost, { borderColor: theme.colors.border }]} onPress={handleAdvisor} activeOpacity={0.8}>
          <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>Not sure where to start?</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}
      pointerEvents="box-none"
    >
      {Platform.OS === 'ios' ? (
        <ExpoBlurView
          intensity={50}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[styles.card, { borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)', 'transparent']}
            style={styles.glassSheen}
          />
          {content}
        </ExpoBlurView>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? 'rgba(20,12,40,0.95)' : 'rgba(248,244,255,0.97)',
              borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {content}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 72,
    left: 16,
    right: 16,
    zIndex: 200,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  btnGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnTextLight: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
