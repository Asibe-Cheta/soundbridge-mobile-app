// src/screens/ProviderAvailabilityScreen.tsx
// B2 — Urgent Gig Availability settings screen
// Sections: master toggle, location mode, radius, rates, weekly schedule,
//           notification limit, DND window, save.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { availabilityService } from '../services/AvailabilityService';
import type {
  UserAvailability,
  AvailabilitySchedule,
  DayAvailability,
} from '../types/availability.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS: Array<{ key: keyof AvailabilitySchedule; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  monday:    { available: true,  hours: '09:00-17:00' },
  tuesday:   { available: true,  hours: '09:00-17:00' },
  wednesday: { available: true,  hours: '09:00-17:00' },
  thursday:  { available: true,  hours: '09:00-17:00' },
  friday:    { available: true,  hours: '09:00-17:00' },
  saturday:  { available: false, hours: 'all_day' },
  sunday:    { available: false, hours: 'all_day' },
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseHours(hours: string): { start: string; end: string } {
  if (!hours || hours === 'all_day') return { start: '09:00', end: '17:00' };
  const parts = hours.split('-');
  return { start: parts[0] ?? '09:00', end: parts[1] ?? '17:00' };
}

function formatDisplayTime(time: string): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM';
  const hour12 = (h ?? 0) % 12 || 12;
  return `${hour12}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Picker field identifiers
// ---------------------------------------------------------------------------

type PickerField =
  | { type: 'dnd_start' }
  | { type: 'dnd_end' }
  | { type: 'day_start'; day: keyof AvailabilitySchedule }
  | { type: 'day_end'; day: keyof AvailabilitySchedule };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProviderAvailabilityScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // ---- loading / saving ----
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // ---- master toggle ----
  const [available, setAvailable] = useState(false);

  // ---- location mode: 'gps' | 'area' ----
  const [locationMode, setLocationMode] = useState<'gps' | 'area'>('gps');
  const [areaText, setAreaText] = useState('');
  const [areaGeocoded, setAreaGeocoded] = useState(false);
  const geocodedCoords = useRef<{ lat: number; lng: number } | null>(null);

  // ---- radius ----
  const [radiusKm, setRadiusKm] = useState(20);

  // ---- rates ----
  const [hourlyRate, setHourlyRate] = useState('');
  const [perGigRate, setPerGigRate] = useState('');
  const [rateNegotiable, setRateNegotiable] = useState(false);

  // ---- weekly schedule ----
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(DEFAULT_SCHEDULE);

  // ---- notification limit ----
  const [maxNotifications, setMaxNotifications] = useState(5);

  // ---- DND ----
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('23:00');
  const [dndEnd, setDndEnd] = useState('08:00');

  // ---- time picker ----
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [showIosPicker, setShowIosPicker] = useState(false);

  // ---------------------------------------------------------------------------
  // Load on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const data = await availabilityService.getMyAvailability();
        applyData(data);
      } catch {
        // New user — defaults are fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function applyData(data: UserAvailability) {
    setAvailable(data.available_for_urgent_gigs);
    setRadiusKm(data.max_radius_km ?? 20);
    setHourlyRate(data.hourly_rate != null ? String(data.hourly_rate) : '');
    setPerGigRate(data.per_gig_rate != null ? String(data.per_gig_rate) : '');
    setRateNegotiable(data.rate_negotiable ?? false);
    if (data.availability_schedule) {
      setSchedule(data.availability_schedule);
    }
    setMaxNotifications(data.max_notifications_per_day ?? 5);
    if (data.dnd_start) {
      setDndEnabled(true);
      setDndStart(data.dnd_start);
      setDndEnd(data.dnd_end ?? '08:00');
    }
    if (data.general_area) {
      setLocationMode('area');
      setAreaText(data.general_area);
      if (data.general_area_lat != null && data.general_area_lng != null) {
        geocodedCoords.current = {
          lat: data.general_area_lat,
          lng: data.general_area_lng,
        };
        setAreaGeocoded(true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Master toggle handler
  // ---------------------------------------------------------------------------

  const handleAvailableToggle = useCallback((value: boolean) => {
    setAvailable(value);
    if (value) {
      availabilityService.startLocationTracking();
    } else {
      availabilityService.stopLocationTracking();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Geocode handler
  // ---------------------------------------------------------------------------

  const handleGeocode = useCallback(async () => {
    if (!areaText.trim()) return;
    setGeocoding(true);
    try {
      const coords = await availabilityService.geocodeArea(areaText.trim());
      if (coords) {
        geocodedCoords.current = coords;
        setAreaGeocoded(true);
        Alert.alert('Location found', `"${areaText.trim()}" was located successfully.`);
      } else {
        Alert.alert('Not found', 'Could not locate that area. Try a more specific name.');
      }
    } finally {
      setGeocoding(false);
    }
  }, [areaText]);

  // ---------------------------------------------------------------------------
  // Schedule helpers
  // ---------------------------------------------------------------------------

  const updateDay = useCallback((
    day: keyof AvailabilitySchedule,
    patch: Partial<DayAvailability>
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  }, []);

  const toggleDayAvailable = useCallback((day: keyof AvailabilitySchedule, value: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], available: value },
    }));
  }, []);

  const toggleAllDay = useCallback((day: keyof AvailabilitySchedule, value: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], hours: value ? 'all_day' : '09:00-17:00' },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Time picker
  // ---------------------------------------------------------------------------

  function openPicker(field: PickerField) {
    let timeStr = '09:00';
    if (field.type === 'dnd_start') timeStr = dndStart;
    else if (field.type === 'dnd_end') timeStr = dndEnd;
    else if (field.type === 'day_start' || field.type === 'day_end') {
      const day = schedule[field.day];
      const { start, end } = parseHours(day.hours ?? '09:00-17:00');
      timeStr = field.type === 'day_start' ? start : end;
    }
    setPickerDate(timeStringToDate(timeStr));
    setActivePicker(field);
    if (Platform.OS === 'ios') setShowIosPicker(true);
  }

  function applyPickerValue(date: Date) {
    const timeStr = dateToTimeString(date);
    if (!activePicker) return;

    if (activePicker.type === 'dnd_start') {
      setDndStart(timeStr);
    } else if (activePicker.type === 'dnd_end') {
      setDndEnd(timeStr);
    } else if (activePicker.type === 'day_start') {
      const day = schedule[activePicker.day];
      const { end } = parseHours(day.hours ?? '09:00-17:00');
      updateDay(activePicker.day, { hours: `${timeStr}-${end}` });
    } else if (activePicker.type === 'day_end') {
      const day = schedule[activePicker.day];
      const { start } = parseHours(day.hours ?? '09:00-17:00');
      updateDay(activePicker.day, { hours: `${start}-${timeStr}` });
    }
  }

  function onPickerChange(_: any, date?: Date) {
    if (!date) return;
    setPickerDate(date);
    if (Platform.OS === 'android') {
      applyPickerValue(date);
      setActivePicker(null);
    }
  }

  function confirmIosPicker() {
    applyPickerValue(pickerDate);
    setActivePicker(null);
    setShowIosPicker(false);
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    const payload: Partial<UserAvailability> = {
      available_for_urgent_gigs: available,
      max_radius_km: radiusKm,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      per_gig_rate: perGigRate ? parseFloat(perGigRate) : undefined,
      rate_negotiable: rateNegotiable,
      availability_schedule: schedule,
      max_notifications_per_day: maxNotifications,
      dnd_start: dndEnabled ? dndStart : undefined,
      dnd_end: dndEnabled ? dndEnd : undefined,
    };

    if (locationMode === 'area') {
      payload.general_area = areaText.trim() || undefined;
      if (geocodedCoords.current) {
        payload.general_area_lat = geocodedCoords.current.lat;
        payload.general_area_lng = geocodedCoords.current.lng;
      }
    }

    setSaving(true);
    try {
      await availabilityService.updateAvailability(payload);
      Alert.alert('Saved', 'Your urgent gig availability has been updated.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    available, radiusKm, hourlyRate, perGigRate, rateNegotiable,
    schedule, maxNotifications, dndEnabled, dndStart, dndEnd,
    locationMode, areaText,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const s = styles(theme);

  if (loading) {
    return (
      <LinearGradient
        colors={theme.isDark ? ['#0F0F1A', '#1A0A2E'] : ['#F8F4FF', '#EEE8FF']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.isDark ? ['#0F0F1A', '#1A0A2E', '#0D1117'] : ['#F8F4FF', '#EEE8FF', '#F0EBFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <BackButton />
          <Text style={s.headerTitle}>Urgent Gig Availability</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Section A: Master Toggle ─────────────────────────────── */}
            <View style={s.card}>
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <View style={[s.iconBox, { backgroundColor: available ? '#10B98120' : theme.colors.border }]}>
                    <Ionicons
                      name={available ? 'flash' : 'flash-outline'}
                      size={22}
                      color={available ? '#10B981' : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={s.rowText}>
                    <Text style={[s.rowLabel, { color: theme.colors.text }]}>Available for Urgent Gigs</Text>
                    <Text style={[s.rowSub, { color: theme.colors.textSecondary }]}>
                      {available ? 'You appear in nearby gig searches' : 'You are hidden from urgent gig searches'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={available}
                  onValueChange={handleAvailableToggle}
                  trackColor={{ false: theme.colors.border, true: '#10B98160' }}
                  thumbColor={available ? '#10B981' : theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* ── Section B: Location Mode ────────────────────────────── */}
            <SectionHeader title="Location" icon="location" theme={theme} />
            <View style={s.card}>
              {/* GPS */}
              <TouchableOpacity
                style={s.radioRow}
                onPress={() => setLocationMode('gps')}
                activeOpacity={0.7}
              >
                <View style={[s.radio, locationMode === 'gps' && s.radioSelected]}>
                  {locationMode === 'gps' && <View style={s.radioDot} />}
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: theme.colors.text }]}>GPS Auto-detect</Text>
                  <Text style={[s.rowSub, { color: theme.colors.textSecondary }]}>
                    Use your device's GPS for accurate location
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[s.divider, { backgroundColor: theme.colors.border }]} />

              {/* General Area */}
              <TouchableOpacity
                style={s.radioRow}
                onPress={() => setLocationMode('area')}
                activeOpacity={0.7}
              >
                <View style={[s.radio, locationMode === 'area' && s.radioSelected]}>
                  {locationMode === 'area' && <View style={s.radioDot} />}
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: theme.colors.text }]}>General Area</Text>
                  <Text style={[s.rowSub, { color: theme.colors.textSecondary }]}>
                    Enter a city or neighbourhood name
                  </Text>
                </View>
              </TouchableOpacity>

              {locationMode === 'area' && (
                <View style={s.areaInputRow}>
                  <TextInput
                    style={[s.areaInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    placeholder="e.g. Luton, North London"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={areaText}
                    onChangeText={(t) => { setAreaText(t); setAreaGeocoded(false); }}
                    returnKeyType="search"
                    onSubmitEditing={handleGeocode}
                  />
                  <TouchableOpacity
                    style={[s.geocodeBtn, { backgroundColor: areaGeocoded ? '#10B981' : theme.colors.primary }]}
                    onPress={handleGeocode}
                    disabled={geocoding || !areaText.trim()}
                  >
                    {geocoding
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name={areaGeocoded ? 'checkmark' : 'search'} size={18} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Section C: Travel Radius ────────────────────────────── */}
            <SectionHeader title="Travel Radius" icon="map" theme={theme} />
            <View style={s.card}>
              <Text style={[s.rowSub, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                Maximum distance you're willing to travel for a gig
              </Text>
              <View style={s.radiusRow}>
                {RADIUS_OPTIONS.map(km => (
                  <TouchableOpacity
                    key={km}
                    style={[
                      s.radiusPill,
                      {
                        backgroundColor: radiusKm === km
                          ? theme.colors.primary
                          : theme.colors.card,
                        borderColor: radiusKm === km
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => setRadiusKm(km)}
                  >
                    <Text
                      style={[
                        s.radiusPillText,
                        { color: radiusKm === km ? '#fff' : theme.colors.textSecondary },
                      ]}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Section D: Rates ────────────────────────────────────── */}
            <SectionHeader title="Your Rates" icon="cash" theme={theme} />
            <View style={s.card}>
              <View style={s.inputRow}>
                <Text style={[s.inputLabel, { color: theme.colors.textSecondary }]}>Hourly rate (£)</Text>
                <TextInput
                  style={[s.rateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                />
              </View>
              <View style={[s.divider, { backgroundColor: theme.colors.border }]} />
              <View style={s.inputRow}>
                <Text style={[s.inputLabel, { color: theme.colors.textSecondary }]}>Per-gig rate (£)</Text>
                <TextInput
                  style={[s.rateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={perGigRate}
                  onChangeText={setPerGigRate}
                />
              </View>
              <View style={[s.divider, { backgroundColor: theme.colors.border }]} />
              <View style={s.row}>
                <Text style={[s.rowLabel, { color: theme.colors.text }]}>Rate is negotiable</Text>
                <Switch
                  value={rateNegotiable}
                  onValueChange={setRateNegotiable}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                  thumbColor={rateNegotiable ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* ── Section E: Weekly Schedule ──────────────────────────── */}
            <SectionHeader title="Weekly Availability" icon="calendar" theme={theme} />
            <View style={s.card}>
              {DAYS.map(({ key, label }, idx) => {
                const day = schedule[key];
                const isAllDay = day.hours === 'all_day';
                const { start, end } = parseHours(day.hours ?? '09:00-17:00');
                return (
                  <View key={key}>
                    {idx > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
                    {/* Day header row */}
                    <View style={s.dayRow}>
                      <Text style={[s.dayLabel, { color: theme.colors.text }]}>{label}</Text>
                      <Switch
                        value={day.available}
                        onValueChange={(v) => toggleDayAvailable(key, v)}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                        thumbColor={day.available ? theme.colors.primary : theme.colors.textSecondary}
                      />
                    </View>
                    {/* Time range row (only when available) */}
                    {day.available && (
                      <View style={s.dayTimeRow}>
                        <View style={s.allDayRow}>
                          <Text style={[s.rowSub, { color: theme.colors.textSecondary }]}>All day</Text>
                          <Switch
                            value={isAllDay}
                            onValueChange={(v) => toggleAllDay(key, v)}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                            thumbColor={isAllDay ? theme.colors.primary : theme.colors.textSecondary}
                          />
                        </View>
                        {!isAllDay && (
                          <View style={s.timeRangeRow}>
                            <TouchableOpacity
                              style={[s.timePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                              onPress={() => openPicker({ type: 'day_start', day: key })}
                            >
                              <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                              <Text style={[s.timePillText, { color: theme.colors.text }]}>
                                {formatDisplayTime(start)}
                              </Text>
                            </TouchableOpacity>
                            <Text style={[s.toText, { color: theme.colors.textSecondary }]}>to</Text>
                            <TouchableOpacity
                              style={[s.timePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                              onPress={() => openPicker({ type: 'day_end', day: key })}
                            >
                              <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                              <Text style={[s.timePillText, { color: theme.colors.text }]}>
                                {formatDisplayTime(end)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Section F: Notification Limit ───────────────────────── */}
            <SectionHeader title="Notification Limit" icon="notifications" theme={theme} />
            <View style={s.card}>
              <Text style={[s.rowSub, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                Max urgent gig alerts you'll receive per day
              </Text>
              <View style={s.stepperRow}>
                <TouchableOpacity
                  style={[s.stepperBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setMaxNotifications(v => Math.max(1, v - 1))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[s.stepperValue, { color: theme.colors.text }]}>{maxNotifications}</Text>
                <TouchableOpacity
                  style={[s.stepperBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setMaxNotifications(v => Math.min(10, v + 1))}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Section G: Do Not Disturb ────────────────────────────── */}
            <SectionHeader title="Do Not Disturb" icon="moon" theme={theme} />
            <View style={s.card}>
              <View style={s.row}>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: theme.colors.text }]}>Enable DND window</Text>
                  <Text style={[s.rowSub, { color: theme.colors.textSecondary }]}>
                    No urgent gig alerts during these hours
                  </Text>
                </View>
                <Switch
                  value={dndEnabled}
                  onValueChange={setDndEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                  thumbColor={dndEnabled ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
              {dndEnabled && (
                <>
                  <View style={[s.divider, { backgroundColor: theme.colors.border }]} />
                  <View style={s.dndTimeRow}>
                    <View style={s.dndTimeBlock}>
                      <Text style={[s.rowSub, { color: theme.colors.textSecondary, marginBottom: 6 }]}>From</Text>
                      <TouchableOpacity
                        style={[s.timePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                        onPress={() => openPicker({ type: 'dnd_start' })}
                      >
                        <Ionicons name="moon-outline" size={14} color={theme.colors.primary} />
                        <Text style={[s.timePillText, { color: theme.colors.text }]}>
                          {formatDisplayTime(dndStart)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.toText, { color: theme.colors.textSecondary, alignSelf: 'flex-end', marginBottom: 10 }]}>to</Text>
                    <View style={s.dndTimeBlock}>
                      <Text style={[s.rowSub, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Until</Text>
                      <TouchableOpacity
                        style={[s.timePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                        onPress={() => openPicker({ type: 'dnd_end' })}
                      >
                        <Ionicons name="sunny-outline" size={14} color={theme.colors.primary} />
                        <Text style={[s.timePillText, { color: theme.colors.text }]}>
                          {formatDisplayTime(dndEnd)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* ── Save Button ─────────────────────────────────────────── */}
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6C63FF', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.saveBtnText}>Save Availability</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Android DateTimePicker (renders when active) ─────────────── */}
      {Platform.OS === 'android' && activePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour
          display="default"
          onChange={onPickerChange}
        />
      )}

      {/* ── iOS DateTimePicker Modal ─────────────────────────────────── */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showIosPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIosPicker(false)}
        >
          <View style={s.iosPickerOverlay}>
            <View style={[s.iosPickerContainer, { backgroundColor: theme.colors.card }]}>
              <View style={s.iosPickerHeader}>
                <TouchableOpacity onPress={() => { setActivePicker(null); setShowIosPicker(false); }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[s.iosPickerTitle, { color: theme.colors.text }]}>Select Time</Text>
                <TouchableOpacity onPress={confirmIosPicker}>
                  <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour
                display="spinner"
                onChange={onPickerChange}
                style={{ height: 200 }}
                textColor={theme.colors.text}
              />
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Section header sub-component
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  icon,
  theme,
}: {
  title: string;
  icon: string;
  theme: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8, paddingHorizontal: 16 }}>
      <Ionicons name={icon as any} size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = (theme: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    rowSub: {
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: -16,
    },
    // Radio
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: theme.colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    areaInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 12,
    },
    areaInput: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    geocodeBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Radius
    radiusRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      paddingBottom: 12,
    },
    radiusPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    radiusPillText: {
      fontSize: 14,
      fontWeight: '500',
    },
    // Rates
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    inputLabel: {
      fontSize: 14,
      flex: 1,
    },
    rateInput: {
      width: 100,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      fontSize: 14,
      textAlign: 'right',
    },
    // Day schedule
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    dayLabel: {
      fontSize: 15,
      fontWeight: '500',
    },
    dayTimeRow: {
      paddingBottom: 10,
    },
    allDayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      marginBottom: 6,
    },
    timeRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'flex-end',
    },
    timePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    timePillText: {
      fontSize: 13,
      fontWeight: '500',
    },
    toText: {
      fontSize: 12,
    },
    // Stepper
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingBottom: 12,
    },
    stepperBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      fontSize: 24,
      fontWeight: '700',
      minWidth: 32,
      textAlign: 'center',
    },
    // DND time
    dndTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
    },
    dndTimeBlock: {
      flex: 1,
    },
    // Save
    saveBtn: {
      marginTop: 24,
      borderRadius: 16,
      overflow: 'hidden',
    },
    saveBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    // iOS picker modal
    iosPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    iosPickerContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 30,
    },
    iosPickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    iosPickerTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
