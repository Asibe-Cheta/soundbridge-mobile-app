import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_W = Math.min(Math.round(SCREEN_W * 0.52), 210);
const PREVIEW_H = Math.round(PREVIEW_W * (1920 / 1080));

const LOGO_SRC = require('../../assets/images/logos/logo-trans-lockup.png');

const RING_COLORS: readonly [string, string, string, string] = ['#4facfe', '#a855f7', '#ec4899', '#dc2626'];
const PILL_COLORS: readonly [string, string, string] = ['#4facfe', '#7c3aed', '#ec4899'];
const BG_COLORS: readonly [string, string, string, string] = ['#060A1A', '#0D1B4B', '#1B0940', '#2A0312'];

interface Props {
  visible: boolean;
  creatorName: string;
  avatarUrl?: string;
  genres?: string[];
  onTryIt: () => void;
  onMaybeLater: () => void;
}

export default function CreatorTeaserModal({
  visible, creatorName, avatarUrl, genres, onTryIt, onMaybeLater,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const tiltAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      tiltAnim.setValue(0);
      glowAnim.setValue(0);
      slideUp.setValue(40);
      fadeIn.setValue(0);
      return;
    }

    // Card entrance
    Animated.parallel([
      Animated.spring(slideUp, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    // Subtle tilt oscillation
    Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(tiltAnim, { toValue: -1, duration: 2400, useNativeDriver: true }),
        Animated.timing(tiltAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1600, useNativeDriver: true }),
      ]),
    ).start();
  }, [visible]);

  const cardRotate = tiltAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-4deg', '-2deg', '0deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });

  const genreLabel = genres && genres.length > 0 ? genres.slice(0, 2).join(' · ') : '';
  const AV = PREVIEW_W * 0.46;
  const AV_INNER = AV - 5;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onMaybeLater}>
      <Pressable style={styles.overlay} onPress={onMaybeLater}>
        <BlurView
          intensity={isDark ? 50 : 70}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <Pressable style={styles.content} onPress={() => {}}>
          {/* Headline */}
          <Text style={[styles.headline, { color: theme.colors.text }]}>
            Your SoundBridge Card is ready
          </Text>
          <Text style={[styles.subheadline, { color: theme.colors.textSecondary }]}>
            Let your fans join your community and support you directly.
          </Text>

          {/* Card preview — tilted, glowing */}
          <Animated.View
            style={[
              styles.cardWrap,
              {
                transform: [{ rotate: cardRotate }, { translateY: slideUp }],
                opacity: fadeIn,
              },
            ]}
          >
            {/* Glow halo behind card */}
            <Animated.View style={[styles.glowHalo, { opacity: glowOpacity }]} />

            <View style={styles.previewCard} collapsable={false}>
              <LinearGradient colors={BG_COLORS} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.blob, styles.blobBlue]} />
              <View style={[styles.blob, styles.blobPink]} />

              {/* Logo top */}
              <Image source={LOGO_SRC} style={styles.logoTop} resizeMode="contain" />

              {/* Avatar ring */}
              <View style={{ marginTop: PREVIEW_H * 0.04 }}>
                <LinearGradient colors={RING_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: AV, height: AV, borderRadius: AV / 2, padding: 2.5, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ width: AV_INNER, height: AV_INNER, borderRadius: AV_INNER / 2, overflow: 'hidden', backgroundColor: '#1a1a2e' }}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: AV_INNER, height: AV_INNER }} />
                    ) : (
                      <View style={{ width: AV_INNER, height: AV_INNER, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person" size={AV * 0.38} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>

              {/* Name */}
              <Text style={styles.previewName} numberOfLines={1}>{creatorName}</Text>
              {genreLabel ? <Text style={styles.previewGenre}>{genreLabel}</Text> : null}

              {/* Tagline */}
              <Text style={styles.previewTagline}>Hear my music.{'\n'}Support me directly.</Text>

              {/* Support pill */}
              <LinearGradient colors={PILL_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.previewPill}>
                <Text style={styles.previewPillText}>Support me on SoundBridge</Text>
              </LinearGradient>

              {/* Logo bottom */}
              <Image source={LOGO_SRC} style={styles.logoBottom} resizeMode="contain" />
            </View>
          </Animated.View>

          {/* Try It */}
          <TouchableOpacity style={styles.tryBtn} onPress={onTryIt} activeOpacity={0.85}>
            <LinearGradient
              colors={['#4facfe', '#7c3aed', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tryBtnGrad}
            >
              <Text style={styles.tryBtnText}>Try It</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Maybe later */}
          <TouchableOpacity style={styles.laterBtn} onPress={onMaybeLater} activeOpacity={0.6}>
            <Text style={[styles.laterText, { color: theme.colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const PREVIEW_W_CALC = Math.min(Math.round(Dimensions.get('window').width * 0.52), 210);
const PREVIEW_H_CALC = Math.round(PREVIEW_W_CALC * (1920 / 1080));

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  cardWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  glowHalo: {
    position: 'absolute',
    width: PREVIEW_W_CALC + 60,
    height: PREVIEW_H_CALC + 60,
    borderRadius: 28,
    backgroundColor: '#4facfe',
    // shadow acts as glow on iOS
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  previewCard: {
    width: PREVIEW_W_CALC,
    height: PREVIEW_H_CALC,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: '#060A1A',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  blobBlue: {
    width: PREVIEW_W_CALC * 1.2,
    height: PREVIEW_W_CALC * 1.2,
    backgroundColor: '#4facfe',
    top: -PREVIEW_W_CALC * 0.3,
    left: -PREVIEW_W_CALC * 0.1,
  },
  blobPink: {
    width: PREVIEW_W_CALC * 0.9,
    height: PREVIEW_W_CALC * 0.9,
    backgroundColor: '#ec4899',
    bottom: -PREVIEW_W_CALC * 0.2,
    right: -PREVIEW_W_CALC * 0.2,
  },
  logoTop: {
    width: PREVIEW_W_CALC * 0.52,
    height: 22,
    marginTop: PREVIEW_H_CALC * 0.05,
    opacity: 0.7,
  },
  previewName: {
    color: '#fff',
    fontSize: PREVIEW_W_CALC * 0.088,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: PREVIEW_H_CALC * 0.02,
    paddingHorizontal: 8,
    letterSpacing: 0.3,
  },
  previewGenre: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: PREVIEW_W_CALC * 0.054,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: PREVIEW_W_CALC * 0.065,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: PREVIEW_W_CALC * 0.09,
    marginTop: PREVIEW_H_CALC * 0.035,
    paddingHorizontal: 8,
  },
  previewPill: {
    marginTop: PREVIEW_H_CALC * 0.04,
    paddingHorizontal: PREVIEW_W_CALC * 0.08,
    paddingVertical: PREVIEW_W_CALC * 0.025,
    borderRadius: 99,
  },
  previewPillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: PREVIEW_W_CALC * 0.05,
  },
  logoBottom: {
    width: PREVIEW_W_CALC * 0.38,
    height: 16,
    opacity: 0.4,
    position: 'absolute',
    bottom: PREVIEW_H_CALC * 0.025,
  },
  tryBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  laterBtn: {
    paddingVertical: 6,
  },
  laterText: {
    fontSize: 14,
  },
});
