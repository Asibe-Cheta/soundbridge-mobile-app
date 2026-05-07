import React, { useState } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  creatorUsername: string;
  creatorName: string;
  avatarUrl?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');
const QR_SIZE = Math.min(Math.round(SCREEN_W * 0.52), 210);
const LOGO_SRC = require('../../assets/images/logos/logo-trans-lockup.png');

export default function QRCodeModal({ visible, onClose, creatorUsername, creatorName, avatarUrl }: Props) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const profileUrl = `https://soundbridge.live/@${creatorUsername}`;

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Share.share({
        message: `Check out ${creatorName} on SoundBridge: ${profileUrl}`,
        url: profileUrl,
      });
    } catch {
      // user cancelled — no alert needed
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow access to your photo library to save the QR code.',
        );
        return;
      }
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(profileUrl)}&margin=20&color=000000&bgcolor=ffffff`;
      const response = await fetch(qrApiUrl);
      if (!response.ok) throw new Error('QR fetch failed');
      const blob = await response.blob();
      const dest = `${FileSystem.cacheDirectory}sb-profile-qr-${creatorUsername}.png`;
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await MediaLibrary.saveToLibraryAsync(dest);
      Alert.alert('Saved', 'Your QR code has been saved to your camera roll.');
    } catch {
      Alert.alert('Error', 'Could not save QR code. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView
          intensity={35}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? '#0e0b1f' : '#ffffff',
              borderColor: 'rgba(124,58,237,0.25)',
            },
          ]}
        >
          {/* Top accent strip */}
          <LinearGradient
            colors={['#7c3aed', '#a855f7', '#60a5fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topStrip}
          />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Avatar */}
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
            </View>
          )}

          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {creatorName}
          </Text>
          <Text style={[styles.username, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            @{creatorUsername}
          </Text>

          {/* QR code on white background so scanners work */}
          <View style={styles.qrWrapper}>
            <QRCode
              value={profileUrl}
              size={QR_SIZE}
              backgroundColor="#ffffff"
              color="#111111"
              logo={LOGO_SRC}
              logoSize={QR_SIZE * 0.16}
              logoBackgroundColor="#ffffff"
              logoBorderRadius={3}
              logoMargin={2}
            />
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Scan to visit my SoundBridge profile
          </Text>

          {/* SoundBridge logo watermark */}
          <Image source={LOGO_SRC} style={styles.sbLogo} resizeMode="contain" />

          {/* Buttons */}
          <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: theme.colors.border }]}
              onPress={handleShare}
              disabled={busy}
              activeOpacity={0.75}
            >
              {busy ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={theme.colors.text} />
                  <Text style={[styles.shareBtnText, { color: theme.colors.text }]}>Share</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownload}
              disabled={busy}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7c3aed', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.downloadGrad}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  topStrip: {
    height: 4,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginTop: 28,
    marginBottom: 10,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginTop: 28,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  username: {
    fontSize: 13,
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sbLogo: {
    width: 120,
    height: 28,
    marginBottom: 20,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  downloadBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  downloadGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
