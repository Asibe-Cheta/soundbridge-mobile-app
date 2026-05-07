import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { venueService, VenueDisplayItem } from '../services/VenueService';
import { SystemTypography as Typography } from '../constants/Typography';

interface Props {
  visible: boolean;
  venue: VenueDisplayItem;
  onClose: () => void;
  onPosted?: () => void;
}

export default function PostAvailabilityModal({ visible, venue, onClose, onPosted }: Props) {
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [hourlyRate, setHourlyRate] = useState(venue.hourly_rate ? String(venue.hourly_rate) : '');
  const [dailyRate, setDailyRate] = useState(venue.daily_rate ? String(venue.daily_rate) : '');
  const [note, setNote] = useState('');

  const reset = useCallback(() => {
    setAvailableFrom('');
    setAvailableTo('');
    setHourlyRate(venue.hourly_rate ? String(venue.hourly_rate) : '');
    setDailyRate(venue.daily_rate ? String(venue.daily_rate) : '');
    setNote('');
  }, [venue]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handlePost = useCallback(async () => {
    if (!availableFrom.trim()) {
      Alert.alert('Required', 'Please enter at least a start date or period.');
      return;
    }

    setSaving(true);
    try {
      const result = await venueService.postVenueAvailability(venue.id, {
        available_from: availableFrom.trim(),
        available_to: availableTo.trim() || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        note: note.trim() || null,
      });

      if (!result) {
        Alert.alert('Error', 'Failed to post availability. Please try again.');
        return;
      }

      Alert.alert(
        'Posted',
        'Your availability has been announced. Matched users will be notified.',
        [{ text: 'OK', onPress: () => { reset(); onPosted?.(); onClose(); } }]
      );
    } finally {
      setSaving(false);
    }
  }, [availableFrom, availableTo, hourlyRate, dailyRate, note, venue, reset, onPosted, onClose]);

  const inputStyle = [styles.input, {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post Availability</Text>
            <TouchableOpacity onPress={handlePost} style={styles.headerBtn} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Text style={[styles.saveText, { color: theme.colors.primary }]}>Post</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Venue name banner */}
            <View style={[styles.venueBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.venueName, { color: theme.colors.text }]} numberOfLines={1}>{venue.name}</Text>
            </View>

            {/* Dates */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Availability Period</Text>
              <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                Enter dates, days, or a description — e.g. "26 Apr 2026", "Weekends", "Mon–Fri from May"
              </Text>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>From *</Text>
              <TextInput
                style={inputStyle}
                value={availableFrom}
                onChangeText={setAvailableFrom}
                placeholder="e.g. 26 Apr 2026 or Weekends"
                placeholderTextColor={theme.colors.textSecondary}
                returnKeyType="next"
              />
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>To (optional)</Text>
              <TextInput
                style={inputStyle}
                value={availableTo}
                onChangeText={setAvailableTo}
                placeholder="e.g. 30 Apr 2026 or Ongoing"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Rates */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rates for This Period</Text>
              <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                Leave unchanged to use your listed rates
              </Text>
              <View style={styles.rateRow}>
                <View style={styles.rateField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Hourly (£/hr)</Text>
                  <TextInput
                    style={inputStyle}
                    value={hourlyRate}
                    onChangeText={setHourlyRate}
                    placeholder="e.g. 40"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.rateSep} />
                <View style={styles.rateField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Daily package (£/day)</Text>
                  <TextInput
                    style={inputStyle}
                    value={dailyRate}
                    onChangeText={setDailyRate}
                    placeholder="e.g. 250"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Note */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Message (optional)</Text>
              <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                Any extra details — equipment included, parking, booking link, etc.
              </Text>
              <TextInput
                style={[inputStyle, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Full PA system included. DM to book."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handlePost}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <>
                    <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.postBtnText}>Announce Availability</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
              onPress={handleClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 56, alignItems: 'flex-start' },
  headerTitle: { ...Typography.button, flex: 1, textAlign: 'center', fontSize: 18 },
  saveText: { ...Typography.button, fontSize: 16 },
  content: { padding: 16, paddingBottom: 40 },
  venueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  venueName: { ...Typography.button, fontSize: 16, flex: 1 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { ...Typography.headerMedium, fontSize: 17, marginBottom: 4 },
  sublabel: { ...Typography.body, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  fieldLabel: { ...Typography.label, fontSize: 12, marginBottom: 6 },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  noteInput: { minHeight: 96 },
  rateRow: { flexDirection: 'row', alignItems: 'flex-end' },
  rateField: { flex: 1 },
  rateSep: { width: 12 },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  postBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 16 },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  cancelBtnText: { ...Typography.button, fontSize: 16 },
});
