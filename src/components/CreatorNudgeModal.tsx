import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  username: string;
  onShareLink: () => void;
  onShareCard: () => void;
  onMaybeLater: () => void;
}

export default function CreatorNudgeModal({ visible, username, onShareLink, onShareCard, onMaybeLater }: Props) {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const fanUrl = `https://soundbridge.live/${username}/home`;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onMaybeLater}>
      <Pressable style={styles.overlay} onPress={onMaybeLater}>
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#0e0b1f' : '#ffffff',
              borderColor: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.15)',
            },
          ]}
          onPress={() => {}}
        >
          {/* Top accent strip */}
          <LinearGradient
            colors={['#4facfe', '#7c3aed', '#ec4899', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topStrip}
          />

          {/* QR code */}
          <View style={[styles.qrWrap, { backgroundColor: '#ffffff' }]}>
            <QRCode value={fanUrl} size={72} backgroundColor="#ffffff" color="#111111" />
          </View>

          {/* Headline */}
          <Text style={[styles.headline, { color: theme.colors.text }]}>
            Share your Identity Card
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Anyone can join your community by tapping this card or scanning the QR code.
          </Text>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: isDark ? 'rgba(79,172,254,0.4)' : 'rgba(79,172,254,0.6)' }]}
              onPress={onShareLink}
              activeOpacity={0.82}
            >
              <Ionicons name="link-outline" size={16} color="#4facfe" />
              <Text style={[styles.btnText, { color: theme.colors.text }]}>Share My Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={onShareCard} activeOpacity={0.82}>
              <LinearGradient
                colors={['#4facfe', '#7c3aed', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Share My Card</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.laterBtn} onPress={onMaybeLater} activeOpacity={0.6}>
            <Text style={[styles.laterText, { color: theme.colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
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
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 28,
  },
  topStrip: { height: 4, width: '100%' },
  qrWrap: {
    marginTop: 24,
    padding: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headline: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 26,
    marginTop: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 22,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnText: { fontSize: 14, fontWeight: '700' },
  laterBtn: { marginTop: 16, paddingVertical: 4 },
  laterText: { fontSize: 14 },
});
