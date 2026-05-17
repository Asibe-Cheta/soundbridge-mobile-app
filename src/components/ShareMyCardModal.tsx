import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  Clipboard,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as ExpoSharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_W = Math.min(Math.round(SCREEN_W * 0.68), 270);
const CARD_H = Math.round(CARD_W * (16 / 9));

// Orbital cluster dimensions
const AV_D = Math.round(CARD_W * 0.26);
const ORBIT_R = Math.round(CARD_W * 0.22);
const MINI_D = Math.round(CARD_W * 0.078);
const CLUSTER_SIZE = 2 * (ORBIT_R + Math.round(MINI_D / 2));
const N_ORBIT = 8;

const QR_SIZE = Math.round(CARD_W * 0.27);

const LOGO_SRC = require('../../assets/images/logos/logo-trans-lockup.png');

const BRAND_RING: [string, string, string, string] = ['#4facfe', '#a855f7', '#ec4899', '#dc2626'];

const PLACEHOLDER_GRADS: [string, string][] = [
  ['#4facfe', '#7c3aed'],
  ['#ec4899', '#dc2626'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#3b82f6'],
  ['#8b5cf6', '#ec4899'],
  ['#f97316', '#ef4444'],
  ['#06b6d4', '#3b82f6'],
  ['#a855f7', '#6366f1'],
];

interface Props {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  username: string;
  avatarUrl?: string;
  genres?: string[];
  followerAvatars?: string[];
  onShared: () => void;
}

export default function ShareMyCardModal({
  visible, onClose, creatorName, username, avatarUrl, genres, followerAvatars = [], onShared,
}: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const fanUrl = `soundbridge.live/${username}/home`;
  const fullFanUrl = `https://${fanUrl}`;
  const genreLabel = genres && genres.length > 0 ? genres.slice(0, 2).join(' · ') : '';

  // Build N_ORBIT slots: real follower avatars, then placeholder gradients
  const orbitSlots = Array.from({ length: N_ORBIT }, (_, i) => ({
    uri: followerAvatars[i] ?? null,
    grad: PLACEHOLDER_GRADS[i % PLACEHOLDER_GRADS.length],
  }));

  const captureCard = async (): Promise<string | null> => {
    if (!captureRef) {
      Alert.alert(
        'App update required',
        'Card image capture requires a newer version of the app. You can still copy your link and share it.',
      );
      return null;
    }
    if (!cardRef.current) return null;
    try {
      return await captureRef(cardRef.current, { format: 'png', quality: 1, result: 'tmpfile' });
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to save your card.');
        return;
      }
      const uri = await captureCard();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('Your Identity Card saved. Share it and let your community find you.', 'success', 4000);
      onShared();
    } catch {
      showToast('Could not save card. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleShareCard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        await Share.share({ message: `Join my community on SoundBridge\n${fullFanUrl}`, url: fullFanUrl });
        onShared();
        return;
      }
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Your Identity Card' });
        showToast('Your Identity Card is ready. Let your community find you.', 'success', 4000);
        onShared();
      } else {
        await Share.share({ url: uri, message: 'Join my community on SoundBridge' });
        onShared();
      }
    } catch {
      showToast('Could not share card. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(fullFanUrl);
    showToast('Link copied!', 'success', 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <LinearGradient colors={['#060A1A', '#0D1B4B', '#1a0628']} style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Identity Card</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Card — captured by ViewShot */}
          <View style={styles.cardShadow}>
            <View ref={cardRef} style={styles.card} collapsable={false}>
              {/* Background gradient */}
              <LinearGradient
                colors={['#060A1A', '#0D1B4B', '#1B0940', '#2A0312']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Ambient glow blobs */}
              <View style={[styles.blob, styles.blobBlue]} />
              <View style={[styles.blob, styles.blobPink]} />

              {/* Top: SoundBridge logo */}
              <Image source={LOGO_SRC} style={styles.logoTop} resizeMode="contain" />

              {/* "I AM ON SOUNDBRIDGE" badge */}
              <View style={styles.onSbBadge}>
                <Text style={styles.onSbText}>I AM ON SOUNDBRIDGE</Text>
              </View>

              {/* Avatar cluster with orbiting followers */}
              <View style={styles.cluster}>
                {/* Orbiting follower avatars */}
                {orbitSlots.map((slot, i) => {
                  const angle = (i / N_ORBIT) * Math.PI * 2 - Math.PI / 2;
                  const cx = CLUSTER_SIZE / 2 + Math.cos(angle) * ORBIT_R;
                  const cy = CLUSTER_SIZE / 2 + Math.sin(angle) * ORBIT_R;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.followerAvWrap,
                        { left: cx - MINI_D / 2, top: cy - MINI_D / 2, width: MINI_D, height: MINI_D, borderRadius: MINI_D / 2 },
                      ]}
                    >
                      {slot.uri ? (
                        <Image source={{ uri: slot.uri }} style={{ width: MINI_D, height: MINI_D }} />
                      ) : (
                        <LinearGradient colors={slot.grad} style={{ flex: 1 }} />
                      )}
                    </View>
                  );
                })}

                {/* Main creator avatar — centered in cluster */}
                <View style={styles.avCenter}>
                  <LinearGradient
                    colors={BRAND_RING}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avRingGrad}
                  >
                    <View style={styles.avInner}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avImage} />
                      ) : (
                        <View style={[styles.avImage, styles.avFallback]}>
                          <Ionicons name="person" size={AV_D * 0.44} color="rgba(255,255,255,0.55)" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </View>

              {/* Creator name */}
              <Text style={styles.name} numberOfLines={2}>{creatorName}</Text>

              {/* Genre */}
              {genreLabel ? <Text style={styles.genre}>{genreLabel}</Text> : null}

              {/* "Join my community" headline */}
              <Text style={styles.joinHeadline}>Join my community</Text>

              {/* Subtext */}
              <Text style={styles.subtext}>
                Be part of my journey.{'\n'}Where we can know one another deeply.
              </Text>

              {/* QR code */}
              <View style={styles.qrWrap}>
                <QRCode value={fullFanUrl} size={QR_SIZE} backgroundColor="#ffffff" color="#111111" />
              </View>

              {/* Fan URL */}
              <Text style={styles.fanUrl}>{fanUrl}</Text>

              {/* Bottom watermark logo */}
              <Image source={LOGO_SRC} style={styles.logoBottom} resizeMode="contain" />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={busy} activeOpacity={0.8}>
              <LinearGradient colors={['#4facfe', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGrad}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.actionText}>Download Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShareCard} disabled={busy} activeOpacity={0.8}>
              <LinearGradient colors={['#ec4899', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGrad}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.actionText}>Share Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink} disabled={busy} activeOpacity={0.8}>
              <Ionicons name="link-outline" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.copyText}>Copy My Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  closeBtn: { position: 'absolute', right: 20, top: Platform.OS === 'ios' ? 54 : 34, padding: 4 },
  scrollContent: { alignItems: 'center', paddingBottom: 40 },

  cardShadow: {
    borderRadius: 20,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: '#060A1A',
  },

  blob: { position: 'absolute', borderRadius: 999, opacity: 0.15 },
  blobBlue: {
    width: CARD_W * 1.1,
    height: CARD_W * 1.1,
    backgroundColor: '#4facfe',
    top: -CARD_W * 0.25,
    left: -CARD_W * 0.05,
  },
  blobPink: {
    width: CARD_W * 0.8,
    height: CARD_W * 0.8,
    backgroundColor: '#ec4899',
    bottom: -CARD_W * 0.15,
    right: -CARD_W * 0.15,
  },

  logoTop: {
    width: CARD_W * 0.44,
    height: 20,
    marginTop: Math.round(CARD_H * 0.045),
    opacity: 0.7,
  },

  onSbBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(79,172,254,0.35)',
    backgroundColor: 'rgba(79,172,254,0.08)',
  },
  onSbText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: Math.round(CARD_W * 0.038),
    fontWeight: '700',
    letterSpacing: 1.8,
  },

  // Cluster
  cluster: {
    width: CLUSTER_SIZE,
    height: CLUSTER_SIZE,
    marginTop: Math.round(CARD_H * 0.032),
  },
  avCenter: {
    position: 'absolute',
    left: CLUSTER_SIZE / 2 - AV_D / 2,
    top: CLUSTER_SIZE / 2 - AV_D / 2,
  },
  avRingGrad: {
    width: AV_D,
    height: AV_D,
    borderRadius: AV_D / 2,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avInner: {
    width: AV_D - 5,
    height: AV_D - 5,
    borderRadius: (AV_D - 5) / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  avImage: { width: AV_D - 5, height: AV_D - 5 },
  avFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },

  followerAvWrap: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  name: {
    color: '#ffffff',
    fontSize: Math.round(CARD_W * 0.088),
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Math.round(CARD_H * 0.022),
    paddingHorizontal: 10,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(79,172,254,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  genre: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: Math.round(CARD_W * 0.050),
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },

  joinHeadline: {
    color: '#ffffff',
    fontSize: Math.round(CARD_W * 0.082),
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Math.round(CARD_H * 0.038),
    letterSpacing: 0.2,
    textShadowColor: 'rgba(236,72,153,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtext: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: Math.round(CARD_W * 0.052),
    textAlign: 'center',
    marginTop: 5,
    lineHeight: Math.round(CARD_W * 0.073),
    paddingHorizontal: 12,
  },

  qrWrap: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    marginTop: Math.round(CARD_H * 0.032),
  },

  fanUrl: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: Math.round(CARD_W * 0.045),
    marginTop: 6,
    letterSpacing: 0.2,
  },

  logoBottom: {
    width: CARD_W * 0.34,
    height: 16,
    opacity: 0.35,
    position: 'absolute',
    bottom: Math.round(CARD_H * 0.025),
  },

  // Actions
  actions: { width: CARD_W, marginTop: 24, gap: 10 },
  actionBtn: { borderRadius: 13, overflow: 'hidden' },
  actionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 13,
  },
  copyText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
});
