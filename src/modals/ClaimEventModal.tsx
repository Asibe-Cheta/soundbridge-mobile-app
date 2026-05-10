import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/apiClient';
import type { ExternalEvent } from '../components/ExternalEventCard';

interface Props {
  event: ExternalEvent | null;
  visible: boolean;
  onClose: () => void;
  onClaimed: (eventId: string) => void;
}

export default function ClaimEventModal({ event, visible, onClose, onClaimed }: Props) {
  const { theme } = useTheme();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep a snapshot so the slide-out animation has content to render
  const [snapshot, setSnapshot] = React.useState<ExternalEvent | null>(null);
  React.useEffect(() => { if (event) setSnapshot(event); }, [event]);
  const display = event ?? snapshot;

  const handleClaim = async () => {
    if (!session || !display) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>(
        `/api/events/external/${display.id}/claim`,
        { method: 'POST', session }
      );
      if (result?.success === false) {
        setError(result.message || 'Failed to claim event. Please try again.');
        return;
      }
      onClaimed(display.id);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email ||
    'you';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.isDark
                ? 'rgba(18, 8, 36, 0.98)'
                : 'rgba(255,255,255,0.98)',
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={[styles.heading, { color: theme.colors.text }]}>
            Claim This Event
          </Text>

          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Claim{' '}
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
              {display?.title}
            </Text>{' '}
            as{' '}
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {displayName}
            </Text>
            ?{'\n\n'}
            Once claimed, this event will appear on your profile and your
            followers will be notified.
          </Text>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.claimBtn,
              { backgroundColor: theme.colors.primary },
              loading && styles.claimBtnDisabled,
            ]}
            onPress={handleClaim}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimBtnText}>Claim Event</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
  },
  error: {
    fontSize: 13,
    color: '#f87171',
    marginBottom: 14,
  },
  claimBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  claimBtnDisabled: {
    opacity: 0.7,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
