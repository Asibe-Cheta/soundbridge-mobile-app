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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoSharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

// Graceful fallback if native module not yet in build
let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Card preview dimensions — 9:16 ratio, fits within modal
const CARD_W = Math.min(Math.round(SCREEN_W * 0.68), 280);
const CARD_H = Math.round(CARD_W * (1920 / 1080));

const LOGO_SRC = require('../../assets/images/logos/logo-trans-lockup.png');

// SoundBridge brand colours
const BRAND = {
  blue: '#4facfe',
  pink: '#ec4899',
  red: '#dc2626',
  darkBg: ['#060A1A', '#0D1B4B', '#2A0A3A'] as const,
  ring: ['#4facfe', '#a855f7', '#ec4899', '#dc2626'] as const,
  pill: ['#4facfe', '#7c3aed', '#ec4899'] as const,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  username: string;
  avatarUrl?: string;
  genres?: string[];
  onShared: () => void;
}

export default function ShareMyCardModal({
  visible, onClose, creatorName, username, avatarUrl, genres, onShared,
}: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const fanUrl = `soundbridge.live/${username}/home`;
  const fullFanUrl = `https://${fanUrl}`;
  const genreLabel = genres && genres.length > 0 ? genres.slice(0, 2).join(' · ') : '';

  const captureCard = async (): Promise<string | null> => {
    if (!captureRef) {
      Alert.alert(
        'App update required',
        'Card image download requires a newer version of the app. You can still copy your link and share it.',
      );
      return null;
    }
    if (!cardRef.current) return null;
    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      return uri;
    } catch (err) {
      console.error('Card capture failed:', err);
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
      showToast('Your card is ready to share. Let your audience find you 🙏🏾', 'success', 4000);
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
        // Fallback: share link when capture unavailable
        await Share.share({
          message: `Discover my content and support me directly on SoundBridge\n${fullFanUrl}`,
          url: fullFanUrl,
        });
        onShared();
        return;
      }

      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Your SoundBridge Card',
        });
        showToast('Your card is ready to share. Let your audience find you 🙏🏾', 'success', 4000);
        onShared();
      } else {
        // iOS: use RN Share with url
        await Share.share({
          url: uri,
          message: 'Discover my content and support me directly on SoundBridge',
        });
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
      <LinearGradient
        colors={['#060A1A', '#0D1B4B', '#1a0628']}
        style={styles.screen}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your SoundBridge Card</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Card — captured by ViewShot */}
          <View style={styles.cardShadowWrap}>
            <View ref={cardRef} style={styles.card} collapsable={false}>
              {/* Card gradient background */}
              <LinearGradient
                colors={['#060A1A', '#0D1B4B', '#1B0940', '#2A0312']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Subtle radial accent blobs */}
              <View style={[styles.blob, styles.blobBlue]} />
              <View style={[styles.blob, styles.blobPink]} />

              {/* SoundBridge logo — top */}
              <Image source={LOGO_SRC} style={styles.logoTop} resizeMode="contain" />

              {/* Avatar with glowing ring */}
              <View style={styles.avatarRingOuter}>
                <LinearGradient
                  colors={BRAND.ring}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRingGradient}
                >
                  <View style={styles.avatarInner}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarImage, styles.avatarFallback]}>
                        <Ionicons name="person" size={CARD_W * 0.22} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>

              {/* Creator name */}
              <Text style={styles.creatorName} numberOfLines={2}>{creatorName}</Text>

              {/* Genre */}
              {genreLabel ? (
                <Text style={styles.genreLabel}>{genreLabel}</Text>
              ) : null}

              {/* Tagline */}
              <View style={styles.taglineWrap}>
                <Text style={styles.tagline}>Hear my music.</Text>
                <Text style={styles.tagline}>Support me directly.</Text>
              </View>

              {/* Support pill — graphic only, not tappable */}
              <LinearGradient
                colors={BRAND.pill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.supportPill}
              >
                <Text style={styles.supportPillText}>Support me on SoundBridge</Text>
              </LinearGradient>

              {/* Fan URL */}
              <Text style={styles.fanUrl}>{fanUrl}</Text>

              {/* QR code */}
              <View style={styles.qrContainer}>
                <QRCode
                  value={fullFanUrl}
                  size={CARD_W * 0.28}
                  backgroundColor="#ffffff"
                  color="#111111"
                />
              </View>

              {/* SoundBridge logo — bottom watermark */}
              <Image source={LOGO_SRC} style={styles.logoBottom} resizeMode="contain" />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Download */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDownload}
              disabled={busy}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4facfe', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGrad}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Download Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleShareCard}
              disabled={busy}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ec4899', '#dc2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGrad}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Share Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Copy link */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.copyBtn]}
              onPress={handleCopyLink}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Ionicons name="link-outline" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.copyBtnText}>Copy My Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const AV = CARD_W * 0.46; // avatar diameter (ring outer)
const AV_INNER = AV - 6;  // avatar image diameter (inside ring)

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 54 : 34,
    padding: 4,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  cardShadowWrap: {
    borderRadius: 20,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
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
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  blobBlue: {
    width: CARD_W * 1.2,
    height: CARD_W * 1.2,
    backgroundColor: '#4facfe',
    top: -CARD_W * 0.3,
    left: -CARD_W * 0.1,
  },
  blobPink: {
    width: CARD_W * 0.9,
    height: CARD_W * 0.9,
    backgroundColor: '#ec4899',
    bottom: -CARD_W * 0.2,
    right: -CARD_W * 0.2,
  },
  logoTop: {
    width: CARD_W * 0.48,
    height: 28,
    marginTop: CARD_H * 0.05,
    opacity: 0.75,
  },
  avatarRingOuter: {
    marginTop: CARD_H * 0.05,
  },
  avatarRingGradient: {
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: AV_INNER,
    height: AV_INNER,
    borderRadius: AV_INNER / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  avatarImage: {
    width: AV_INNER,
    height: AV_INNER,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  creatorName: {
    color: '#ffffff',
    fontSize: CARD_W * 0.092,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: CARD_H * 0.025,
    paddingHorizontal: 12,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(79,172,254,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  genreLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: CARD_W * 0.056,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  taglineWrap: {
    marginTop: CARD_H * 0.04,
    alignItems: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: CARD_W * 0.07,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: CARD_W * 0.095,
  },
  supportPill: {
    marginTop: CARD_H * 0.045,
    paddingHorizontal: CARD_W * 0.09,
    paddingVertical: CARD_W * 0.03,
    borderRadius: 99,
  },
  supportPillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: CARD_W * 0.057,
    letterSpacing: 0.2,
  },
  fanUrl: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: CARD_W * 0.048,
    marginTop: CARD_H * 0.015,
    letterSpacing: 0.3,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    marginTop: CARD_H * 0.025,
  },
  logoBottom: {
    width: CARD_W * 0.36,
    height: 20,
    opacity: 0.45,
    position: 'absolute',
    bottom: CARD_H * 0.025,
  },
  actions: {
    width: CARD_W,
    marginTop: 24,
    gap: 10,
  },
  actionBtn: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  actionBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
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
  copyBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
});
