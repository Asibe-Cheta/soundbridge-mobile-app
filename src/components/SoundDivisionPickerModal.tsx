/**
 * SoundDivisionPickerModal (NSO_1B.MD)
 *
 * Self-service tagging UI for an artist recognised as belonging to a sound
 * movement (currently NSO/Dan RicHee, built generally). Lets them assign one
 * or more Sound Divisions to one of their own tracks. Deliberately separate
 * from genre — genre is unaffected by this modal.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  visible: boolean;
  movementName: string;
  divisions: Division[];
  initialSelectedIds: string[];
  onSave: (divisionIds: string[]) => Promise<boolean>;
  onClose: () => void;
}

export default function SoundDivisionPickerModal({
  visible,
  movementName,
  divisions,
  initialSelectedIds,
  onSave,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setSelected(initialSelectedIds);
  }, [visible, initialSelectedIds]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onSave(selected);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.isDark ? '#1A2233' : '#FFFFFF' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Sound Division</Text>
            <TouchableOpacity onPress={onClose} disabled={busy}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Tag this track into one or more {movementName} Sound Divisions. This is separate from
            the track's genre, which stays unchanged.
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {divisions.map((division) => {
              const isChecked = selected.includes(division.id);
              return (
                <TouchableOpacity
                  key={division.id}
                  style={styles.row}
                  onPress={() => toggle(division.id)}
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
                  <Text style={[styles.rowText, { color: theme.colors.text }]}>{division.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: busy ? theme.colors.border : theme.colors.primary }]}
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
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
    maxHeight: '80%',
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  list: { paddingHorizontal: 20 },
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
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
