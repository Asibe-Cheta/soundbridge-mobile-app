/**
 * TalentCategoryModal
 *
 * One-time self-identification prompt (Part B of TALENT_DISCOVERY_ADDITIONS.MD).
 * Multi-select checklist so a user can pick every category that applies (backend
 * inference alone can't cover session musicians, backup vocalists, vocal coaches,
 * etc.). Includes an explicit "Skip for now" that never forces a selection.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ALL_TALENT_CATEGORIES, TALENT_CATEGORY_LABELS, TalentCategory } from '../utils/talentCategoryLabels';

interface Props {
  visible: boolean;
  onSubmit: (categories: TalentCategory[]) => Promise<void> | void;
  onSkip: () => Promise<void> | void;
}

export default function TalentCategoryModal({ visible, onSubmit, onSkip }: Props) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<TalentCategory[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (category: TalentCategory) => {
    setSelected((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const reset = () => setSelected([]);

  const handleSubmit = async () => {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    try {
      await onSubmit(selected);
    } finally {
      setBusy(false);
      reset();
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSkip();
    } finally {
      setBusy(false);
      reset();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.isDark ? '#1A2233' : '#FFFFFF' }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Help Us Improve Your Experience</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Are you a musician, podcaster, DJ, audio engineer, or something else? Select all that apply.
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {ALL_TALENT_CATEGORIES.map((category) => {
              const isChecked = selected.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.row}
                  onPress={() => toggle(category)}
                  activeOpacity={0.7}
                  disabled={busy}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: isChecked ? theme.colors.primary : theme.colors.border },
                      isChecked && { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.rowText, { color: theme.colors.text }]}>{TALENT_CATEGORY_LABELS[category]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: selected.length > 0 && !busy ? theme.colors.primary : theme.colors.border },
            ]}
            onPress={handleSubmit}
            disabled={selected.length === 0 || busy}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Save</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={busy}>
            <Text style={[styles.skipBtnText, { color: theme.colors.textSecondary }]}>None of the above / Skip for now</Text>
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
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
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
    alignItems: 'center',
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
    flexShrink: 0,
  },
  rowText: { flex: 1, fontSize: 14 },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skipBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  skipBtnText: { fontSize: 13, textDecorationLine: 'underline' },
});
