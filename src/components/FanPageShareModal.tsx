import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

interface FanPageShareModalProps {
  visible: boolean;
  username: string;
  onClose: () => void;
}

export default function FanPageShareModal({ visible, username, onClose }: FanPageShareModalProps) {
  const { theme } = useTheme();
  const { showToast } = useToast();

  const fanUrl = `https://soundbridge.live/${username}/home`;
  const displayUrl = `soundbridge.live/${username}/home`;

  const handleCopy = () => {
    Clipboard.setString(fanUrl);
    showToast('Link copied to clipboard', 'success', 2500);
    onClose();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Listen to my music and support me directly on SoundBridge:\n${fanUrl}`,
        url: fanUrl,
      });
    } catch (_) {}
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View
            style={[styles.sheet, { backgroundColor: theme.isDark ? '#0F0A1E' : '#F5F5FA', borderColor: theme.colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Share My Fan Page</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Icon + body */}
            <View style={styles.body}>
              <LinearGradient
                colors={[theme.colors.primary + '28', theme.colors.primary + '10']}
                style={styles.iconCircle}
              >
                <Ionicons name="people" size={28} color={theme.colors.primary} />
              </LinearGradient>

              <Text style={[styles.bodyTitle, { color: theme.colors.text }]}>
                Grow your fan base & income
              </Text>
              <Text style={[styles.bodyDesc, { color: theme.colors.textSecondary }]}>
                Turn your social media attention into real support. Share your fan page link so people can join your community, follow your drops, and back you directly. Converting followers into fans who fund your work.
              </Text>

              {/* URL pill — tap to copy */}
              <TouchableOpacity
                style={[styles.urlPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={14} color={theme.colors.primary} />
                <Text style={[styles.urlText, { color: theme.colors.primary }]} numberOfLines={1}>
                  {displayUrl}
                </Text>
                <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: theme.colors.border }]}
                onPress={handleCopy}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="copy-outline" size={20} color={theme.colors.text} />
                </View>
                <View style={styles.actionLabel}>
                  <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Copy Link</Text>
                  <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>Copy to clipboard</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleShare}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="share-social-outline" size={20} color={theme.colors.text} />
                </View>
                <View style={styles.actionLabel}>
                  <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Share</Text>
                  <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>Open share sheet</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  bodyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  bodyDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  urlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    borderTopWidth: 1,
    paddingTop: 4,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionSub: {
    fontSize: 12,
    marginTop: 1,
  },
});
