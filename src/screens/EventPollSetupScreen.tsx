import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';

interface CombinedOption {
  label: string;
  date: string;
  location: string;
}

const MAX_DATES = 4;
const MAX_LOCATIONS = 3;
const MAX_COMBINATIONS = 6;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function generateCombinations(dates: string[], locations: string[]): CombinedOption[] {
  const combos: CombinedOption[] = [];
  for (const loc of locations) {
    for (const date of dates) {
      if (loc.trim() && date) {
        combos.push({ label: `${loc.trim()} — ${date}`, date, location: loc.trim() });
      }
    }
  }
  return combos.slice(0, MAX_COMBINATIONS);
}

export default function EventPollSetupScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { session, userProfile } = useAuth();

  const interestedCount: number = route?.params?.interestedCount ?? 0;
  const trackTitle: string = route?.params?.trackTitle ?? 'your track';
  const creatorName: string =
    (userProfile as any)?.display_name || (userProfile as any)?.username || 'me';

  const subscriptionTier = (userProfile as any)?.subscription_tier;
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'unlimited';

  const [sending, setSending] = useState(false);
  const [messageBody, setMessageBody] = useState(
    `Hey, you mentioned you wanted to hear ${trackTitle} live. I am thinking of making it happen. Help me pick the best date and place.\n\n${creatorName}`
  );

  // Date options
  const [dates, setDates] = useState<Date[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);

  // Location options
  const [locations, setLocations] = useState<string[]>(['']);

  const combinations = generateCombinations(
    dates.map(formatDate),
    locations.filter(l => l.trim())
  );

  // ─── Tier gate ────────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient?.start ?? '#0a0a0a', theme.colors.backgroundGradient?.end ?? '#1a1a2e']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Poll</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.upgradeContainer}>
            <Ionicons name="radio-outline" size={48} color="#8B5CF6" style={{ marginBottom: 16 }} />
            <Text style={[styles.upgradeTitle, { color: theme.colors.text }]}>
              Send a Poll to Your Listeners
            </Text>
            <Text style={[styles.upgradeBody, { color: theme.colors.textSecondary }]}>
              Send a poll to your interested listeners and find out exactly when and where to perform. Available on Premium and Unlimited.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('UpgradeScreen')}
            >
              <Text style={styles.upgradeBtnText}>Access Premium</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Date handlers ────────────────────────────────────────────────────────
  const openDatePicker = (index: number) => {
    setPickerTargetIndex(index);
    setShowDatePicker(true);
  };

  const onDateChange = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;
    if (pickerTargetIndex === null) return;
    setDates(prev => {
      const next = [...prev];
      next[pickerTargetIndex] = selected;
      return next;
    });
    setPickerTargetIndex(null);
  };

  const addDateSlot = () => {
    if (dates.length >= MAX_DATES) return;
    openDatePicker(dates.length);
    setDates(prev => [...prev, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)]);
  };

  const removeDate = (index: number) => {
    setDates(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Location handlers ────────────────────────────────────────────────────
  const addLocation = () => {
    if (locations.length >= MAX_LOCATIONS) return;
    setLocations(prev => [...prev, '']);
  };

  const updateLocation = (index: number, value: string) => {
    setLocations(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeLocation = (index: number) => {
    setLocations(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Send poll ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!session) return;

    const filledDates = dates.filter(Boolean);
    const filledLocations = locations.filter(l => l.trim());

    if (filledDates.length === 0) {
      Alert.alert('Add a Date', 'Please add at least one date option.');
      return;
    }
    if (filledLocations.length === 0) {
      Alert.alert('Add a Location', 'Please add at least one location.');
      return;
    }
    if (!messageBody.trim()) {
      Alert.alert('Empty Message', 'Please write a message for your listeners.');
      return;
    }

    Alert.alert(
      `Send Poll to ${interestedCount} Listeners`,
      `This will send a DM to all ${interestedCount} listeners who expressed live interest. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const dateStrings = filledDates.map(formatDate);
              const combinedOptions = generateCombinations(dateStrings, filledLocations);

              const { data, error } = await supabase.rpc('dispatch_poll_campaign', {
                p_creator_id: session.user.id,
                p_message_body: messageBody.trim(),
                p_date_options: dateStrings,
                p_location_options: filledLocations,
                p_combined_options: combinedOptions,
              });

              if (error) throw error;

              Alert.alert(
                'Poll Sent',
                'Your poll has been sent. Check back to see the responses.',
                [
                  {
                    text: 'View Results',
                    onPress: () => navigation.replace('PollResults', { campaignId: data }),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send poll. Please try again.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient?.start ?? '#0a0a0a', theme.colors.backgroundGradient?.end ?? '#1a1a2e']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ask Your Audience</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Subheader */}
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="people-outline" size={24} color="#8B5CF6" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {interestedCount} listeners want to hear you live
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              Send them a poll to find the best date and location.
            </Text>
          </View>

          {/* Message preview */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Message Preview</Text>
          <View style={[styles.messageBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.messageInput, { color: theme.colors.text }]}
              value={messageBody}
              onChangeText={setMessageBody}
              multiline
              placeholderTextColor={theme.colors.textSecondary}
            />
            <View style={[styles.pollPreviewBox, { backgroundColor: theme.colors.background + 'CC' }]}>
              <Text style={[styles.pollPreviewLabel, { color: theme.colors.textSecondary }]}>
                📊 Poll options will appear here
              </Text>
              {combinations.map((c, i) => (
                <Text key={i} style={[styles.pollPreviewOption, { color: theme.colors.text }]}>
                  {String.fromCharCode(65 + i)}. {c.label}
                </Text>
              ))}
            </View>
          </View>

          {/* Date options */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Add up to {MAX_DATES} date options
          </Text>
          {dates.map((date, i) => (
            <View key={i} style={[styles.optionRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openDatePicker(i)}>
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{formatDate(date)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeDate(i)}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {dates.length < MAX_DATES && (
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: '#8B5CF6' }]}
              onPress={addDateSlot}
            >
              <Ionicons name="add" size={18} color="#8B5CF6" />
              <Text style={[styles.addBtnText, { color: '#8B5CF6' }]}>Add Date</Text>
            </TouchableOpacity>
          )}

          {/* Date picker */}
          {showDatePicker && pickerTargetIndex !== null && (
            <DateTimePicker
              value={dates[pickerTargetIndex] ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
              mode="date"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {/* Location options */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Add up to {MAX_LOCATIONS} location options
          </Text>
          {locations.map((loc, i) => (
            <View key={i} style={[styles.optionRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="location-outline" size={18} color="#8B5CF6" />
              <TextInput
                style={[styles.locationInput, { color: theme.colors.text }]}
                value={loc}
                onChangeText={v => updateLocation(i, v)}
                placeholder="City or venue name"
                placeholderTextColor={theme.colors.textSecondary}
              />
              {locations.length > 1 && (
                <TouchableOpacity onPress={() => removeLocation(i)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {locations.length < MAX_LOCATIONS && (
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: '#8B5CF6' }]}
              onPress={addLocation}
            >
              <Ionicons name="add" size={18} color="#8B5CF6" />
              <Text style={[styles.addBtnText, { color: '#8B5CF6' }]}>Add Location</Text>
            </TouchableOpacity>
          )}

          {/* Combinations preview */}
          {combinations.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                Poll Options ({combinations.length} combinations)
              </Text>
              <View style={[styles.combinationsBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {combinations.map((c, i) => (
                  <View key={i} style={[styles.comboRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.comboLetter}>
                      <Text style={styles.comboLetterText}>{String.fromCharCode(65 + i)}</Text>
                    </View>
                    <Text style={[styles.comboLabel, { color: theme.colors.text }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Recipients count */}
          <View style={[styles.recipientsBox, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]}>
            <Ionicons name="send-outline" size={16} color="#8B5CF6" />
            <Text style={[styles.recipientsText, { color: theme.colors.textSecondary }]}>
              This poll will be sent as a DM to{' '}
              <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>{interestedCount} listeners</Text>
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: sending ? 0.6 : 1 }]}
            onPress={handleSend}
            disabled={sending}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtnGradient}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>
                    Send Poll to {interestedCount} Listeners
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...Typography.headerMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSub: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionLabel: {
    ...Typography.button,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  messageBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  messageInput: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pollPreviewBox: {
    padding: 12,
    gap: 6,
  },
  pollPreviewLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  pollPreviewOption: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  optionText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  locationInput: {
    ...Typography.body,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  addBtnText: {
    ...Typography.button,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  combinationsBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
  },
  comboLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboLetterText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  comboLabel: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  recipientsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  recipientsText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  sendBtnText: {
    color: '#fff',
    ...Typography.button,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  upgradeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  upgradeTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  upgradeBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  upgradeBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  upgradeBtnText: {
    color: '#fff',
    ...Typography.button,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
