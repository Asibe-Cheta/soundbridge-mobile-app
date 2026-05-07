import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { useTheme } from '../contexts/ThemeContext';
import { venueService, VenueNotificationPreferences, VENUE_TYPES } from '../services/VenueService';
import { SystemTypography as Typography } from '../constants/Typography';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const DEFAULT_PREFS: VenueNotificationPreferences = {
  notifications_enabled: true,
  min_budget: null,
  max_budget: null,
  preferred_venue_types: [],
  preferred_location_lat: null,
  preferred_location_lng: null,
  preferred_location_name: null,
  notification_radius_km: 10,
};

export default function VenuePreferencesModal({ visible, userId, onClose, onSaved }: Props) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<VenueNotificationPreferences>(DEFAULT_PREFS);
  const [minBudgetText, setMinBudgetText] = useState('');
  const [maxBudgetText, setMaxBudgetText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    venueService.getVenuePreferences(userId).then((saved) => {
      const resolved = saved ?? DEFAULT_PREFS;
      setPrefs(resolved);
      setMinBudgetText(resolved.min_budget != null ? String(resolved.min_budget) : '');
      setMaxBudgetText(resolved.max_budget != null ? String(resolved.max_budget) : '');
      setLoading(false);
    });
  }, [visible, userId]);

  const toggleType = useCallback((type: string) => {
    setPrefs((p) => {
      const current = p.preferred_venue_types ?? [];
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...p, preferred_venue_types: next };
    });
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    const loc = await venueService.requestLocation();
    if (!loc) return;
    setPrefs((p) => ({
      ...p,
      preferred_location_lat: loc.lat,
      preferred_location_lng: loc.lng,
      preferred_location_name: 'Current location',
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const minBudget = minBudgetText ? parseFloat(minBudgetText) : null;
    const maxBudget = maxBudgetText ? parseFloat(maxBudgetText) : null;
    const finalPrefs: VenueNotificationPreferences = {
      ...prefs,
      min_budget: isNaN(minBudget as number) ? null : minBudget,
      max_budget: isNaN(maxBudget as number) ? null : maxBudget,
    };
    await venueService.saveVenuePreferences(userId, finalPrefs);
    setSaving(false);
    onSaved?.();
    onClose();
  }, [prefs, minBudgetText, maxBudgetText, userId, onSaved, onClose]);

  const inputStyle = [styles.input, {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Venue Preferences</Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {/* Notifications toggle */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
                    <View style={styles.toggleTextWrap}>
                      <Text style={[styles.label, { color: theme.colors.text }]}>Venue notifications</Text>
                      <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                        Get notified when a new venue matches your preferences
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={prefs.notifications_enabled}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, notifications_enabled: v }))}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Budget range */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hourly Rate Range</Text>
                <Text style={[styles.sublabel, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  Notify me about venues within this hourly rate — leave blank to match any price
                </Text>
                <View style={styles.budgetRow}>
                  <View style={styles.budgetField}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Min (£/hr)</Text>
                    <TextInput
                      style={inputStyle}
                      value={minBudgetText}
                      onChangeText={setMinBudgetText}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.budgetSep}>
                    <Text style={[{ color: theme.colors.textSecondary, fontSize: 18 }]}>–</Text>
                  </View>
                  <View style={styles.budgetField}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Max (£/hr)</Text>
                    <TextInput
                      style={inputStyle}
                      value={maxBudgetText}
                      onChangeText={setMaxBudgetText}
                      placeholder="Any"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Venue types */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Venue Types</Text>
                <Text style={[styles.sublabel, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  Leave blank to match all types
                </Text>
                <View style={styles.chipsWrap}>
                  {VENUE_TYPES.map((type) => {
                    const selected = (prefs.preferred_venue_types ?? []).includes(type);
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => toggleType(type)}
                        style={[
                          styles.chip,
                          selected
                            ? { backgroundColor: theme.colors.primary }
                            : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.colors.text }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Location */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Search Location</Text>
                <Text style={[styles.sublabel, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  Match venues near this location
                </Text>
                <TouchableOpacity
                  style={[styles.locationBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={handleUseCurrentLocation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.locationBtnText, { color: theme.colors.primary }]}>Use current location</Text>
                </TouchableOpacity>
                {prefs.preferred_location_name && (
                  <View style={styles.locationSet}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={[styles.locationSetText, { color: '#059669' }]}>
                      {prefs.preferred_location_name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Radius */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.radiusHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Radius</Text>
                  <Text style={[styles.radiusValue, { color: theme.colors.primary }]}>
                    {prefs.notification_radius_km} km
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={50}
                  step={1}
                  value={prefs.notification_radius_km}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, notification_radius_km: v }))}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>1 km</Text>
                  <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>50 km</Text>
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.saveBtnText}>Save Preferences</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          )}
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
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 12 },
  toggleTextWrap: { marginLeft: 10, flex: 1 },
  label: { ...Typography.button, fontSize: 16 },
  sublabel: { ...Typography.body, fontSize: 14, lineHeight: 20, marginTop: 2 },
  sectionTitle: { ...Typography.headerMedium, fontSize: 18, marginBottom: 4 },
  fieldLabel: { ...Typography.label, fontSize: 12, marginBottom: 4 },
  budgetRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  budgetField: { flex: 1 },
  budgetSep: { paddingBottom: 12, paddingHorizontal: 4 },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: { ...Typography.label, fontSize: 13 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationBtnText: { ...Typography.button, fontSize: 14 },
  locationSet: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  locationSetText: { ...Typography.label, fontSize: 13 },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  radiusValue: { ...Typography.button, fontSize: 18 },
  slider: { width: '100%', marginVertical: 4 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { ...Typography.label, fontSize: 12 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 16 },
});
