import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const AGREEMENT_ITEMS = [
  'I confirm that I own or have the rights to all content I will upload to SoundBridge. I understand that uploading content I do not have rights to may result in removal of that content and termination of my account.',
  'I understand that SoundBridge is a platform and marketplace. SoundBridge does not endorse, guarantee or take responsibility for my content, services or events.',
  'I confirm that any events I list on SoundBridge are my sole responsibility including their organisation, safety and delivery. SoundBridge is not liable for anything that occurs at my events.',
  'I confirm that any services I offer through the SoundBridge marketplace are provided by me as an independent contractor. I am not an employee or agent of SoundBridge.',
  'I have read and agree to the SoundBridge Terms of Service, Privacy Policy and Creator Rights Agreement.',
];

interface Props {
  visible: boolean;
  onAgreed: () => Promise<void> | void;
  onDismiss: () => void;
  submitting?: boolean;
}

export default function CreatorAgreementModal({ visible, onAgreed, onDismiss, submitting = false }: Props) {
  const { theme } = useTheme();
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allChecked = checked.every(Boolean);
  const busy = isSubmitting || submitting;

  const toggle = (i: number) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

  const handleAgree = async () => {
    if (!allChecked || busy) return;
    setIsSubmitting(true);
    try {
      await onAgreed();
    } finally {
      setIsSubmitting(false);
      setChecked([false, false, false, false, false]);
    }
  };

  const handleDismiss = () => {
    if (busy) return;
    setChecked([false, false, false, false, false]);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.isDark ? '#1A2233' : '#FFFFFF' }]}>

          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} disabled={busy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Creator Agreement</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Before you start uploading and earning on SoundBridge please confirm the following.
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {AGREEMENT_ITEMS.map((item, i) => (
              <TouchableOpacity key={i} style={styles.row} onPress={() => toggle(i)} activeOpacity={0.7}>
                <View style={[
                  styles.checkbox,
                  { borderColor: checked[i] ? theme.colors.primary : theme.colors.border },
                  checked[i] && { backgroundColor: theme.colors.primary },
                ]}>
                  {checked[i] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.rowText, { color: theme.colors.text }]}>
                  {i === 4 ? (
                    <>
                      {'I have read and agree to the SoundBridge '}
                      <Text style={{ color: theme.colors.primary }} onPress={() => Linking.openURL('https://www.soundbridge.live/legal/terms')}>Terms of Service</Text>
                      {', '}
                      <Text style={{ color: theme.colors.primary }} onPress={() => Linking.openURL('https://www.soundbridge.live/legal/privacy')}>Privacy Policy</Text>
                      {' and Creator Rights Agreement.'}
                    </>
                  ) : item}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              All five items must be individually confirmed.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.agreeBtn, { backgroundColor: allChecked && !busy ? theme.colors.primary : theme.colors.border }]}
            onPress={handleAgree}
            disabled={!allChecked || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                <Text style={styles.agreeBtnText}>I Agree — Start Creating</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    maxHeight: '88%',
    overflow: 'hidden',
    paddingBottom: 24,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  closeBtn: { padding: 4 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  rowText: { flex: 1, fontSize: 13, lineHeight: 19 },
  note: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  agreeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
