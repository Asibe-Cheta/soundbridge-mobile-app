/**
 * Create Live Session Screen
 * Allows creators to create and schedule live audio sessions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';

export default function CreateLiveSessionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState<'broadcast' | 'interactive'>('broadcast');
  const [startNow, setStartNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 3600000)); // 1 hour from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxSpeakers, setMaxSpeakers] = useState('10');
  const [allowRecording, setAllowRecording] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setScheduledDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'Please enter a session title';
    }
    if (title.length < 3) {
      return 'Title must be at least 3 characters';
    }
    if (title.length > 200) {
      return 'Title must be less than 200 characters';
    }
    if (!startNow && scheduledDate < new Date()) {
      return 'Scheduled time must be in the future';
    }
    const maxSpeakersNum = parseInt(maxSpeakers);
    if (sessionType === 'interactive' && (isNaN(maxSpeakersNum) || maxSpeakersNum < 2 || maxSpeakersNum > 50)) {
      return 'Max speakers must be between 2 and 50';
    }
    return null;
  };

  const handleCreateSession = async () => {
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a session');
      return;
    }

    try {
      setIsCreating(true);

      // Generate Agora channel name (unique identifier)
      const channelName = `session_${Date.now()}_${user.id.slice(0, 8)}`;

      // Prepare session data
      const sessionData = {
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        session_type: sessionType,
        status: startNow ? 'live' : 'scheduled',
        scheduled_start_time: startNow ? null : scheduledDate.toISOString(),
        actual_start_time: startNow ? new Date().toISOString() : null,
        max_speakers: sessionType === 'interactive' ? parseInt(maxSpeakers) : 1,
        allow_recording: allowRecording,
        agora_channel_name: channelName,
        peak_listener_count: 0,
        total_tips_amount: 0,
        total_comments_count: 0,
      };

      console.log('📝 Creating session:', sessionData);

      // Create session in database
      const { data, error } = await supabase
        .from('live_sessions')
        .insert(sessionData)
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) throw error;

      console.log('✅ Session created:', data);

      // If starting now, navigate to session room
      if (startNow) {
        Alert.alert(
          '🎉 Session Created!',
          'Your live session is now active. Ready to go live?',
          [
            {
              text: 'Go Live',
              onPress: () => {
                navigation.replace('LiveSessionRoom', {
                  sessionId: data.id,
                  session: data,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '✅ Session Scheduled!',
          `Your session is scheduled for ${scheduledDate.toLocaleString()}. We'll notify your followers when it's time.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error creating session:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create session. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Live Session</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Session Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g., Live DJ Set, Q&A with Fans"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {title.length}/200 characters
            </Text>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholder="Tell your audience what this session is about..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {description.length}/500 characters
            </Text>
          </View>

          {/* Session Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Session Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  sessionType === 'broadcast' && styles.typeButtonActive,
                  sessionType === 'broadcast' && { borderColor: theme.colors.primary },
                ]}
                onPress={() => setSessionType('broadcast')}
              >
                <Ionicons
                  name="radio"
                  size={24}
                  color={sessionType === 'broadcast' ? theme.colors.primary : theme.colors.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: sessionType === 'broadcast' ? theme.colors.primary : theme.colors.text },
                  ]}
                >
                  Broadcast
                </Text>
                <Text style={[styles.typeButtonSubtext, { color: theme.colors.textSecondary }]}>
                  You speak, they listen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  sessionType === 'interactive' && styles.typeButtonActive,
                  sessionType === 'interactive' && { borderColor: theme.colors.primary },
                ]}
                onPress={() => setSessionType('interactive')}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={sessionType === 'interactive' ? theme.colors.primary : theme.colors.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: sessionType === 'interactive' ? theme.colors.primary : theme.colors.text },
                  ]}
                >
                  Interactive
                </Text>
                <Text style={[styles.typeButtonSubtext, { color: theme.colors.textSecondary }]}>
                  Invite others to speak
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Max Speakers (Interactive Only) */}
          {sessionType === 'interactive' && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Max Speakers</Text>
              <TextInput
                style={[styles.input, styles.numberInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="10"
                placeholderTextColor={theme.colors.textSecondary}
                value={maxSpeakers}
                onChangeText={setMaxSpeakers}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Maximum number of people who can speak (2-50)
              </Text>
            </View>
          )}

          {/* Start Time */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>When to Start</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="play-circle" size={20} color={theme.colors.text} />
                <Text style={[styles.switchText, { color: theme.colors.text }]}>Start Now</Text>
              </View>
              <Switch
                value={startNow}
                onValueChange={setStartNow}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {!startNow && (
              <View style={styles.scheduleSection}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: theme.colors.text }]}>
                    {scheduledDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: theme.colors.text }]}>
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Allow Recording */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="recording-outline" size={20} color={theme.colors.text} />
                <Text style={[styles.switchText, { color: theme.colors.text }]}>Allow Recording</Text>
              </View>
              <Switch
                value={allowRecording}
                onValueChange={setAllowRecording}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              Session will be recorded and available for playback
            </Text>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {startNow
                ? 'Your session will start immediately and appear in the "Live Now" tab.'
                : 'Your followers will be notified when your scheduled session starts.'}
            </Text>
          </View>
        </ScrollView>

        {/* Create Button */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.createButton, { opacity: isCreating ? 0.7 : 1 }]}
            onPress={handleCreateSession}
            disabled={isCreating}
          >
            <LinearGradient
              colors={[theme.colors.primary, '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={startNow ? 'play-circle' : 'calendar'} size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>{startNow ? 'Go Live Now' : 'Schedule Session'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  numberInput: {
    maxWidth: 100,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  typeButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 8,
  },
  dateTimeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

