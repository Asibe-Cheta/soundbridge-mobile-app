import React, { useState, useCallback } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService, NotificationPreferences } from '../services/NotificationService';
import { SystemTypography as Typography } from '../constants/Typography';

// Event genres from database
const EVENT_GENRES = [
  'Music Concert',
  'Birthday Party',
  'Carnival',
  'Get Together',
  'Music Karaoke',
  'Comedy Night',
  'Gospel Concert',
  'Instrumental',
  'Jazz Room',
  'Workshop',
  'Conference',
  'Festival',
  'Other',
];

// Time options for picker
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}));

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preferences state
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  // Type toggles
  const [eventNotifs, setEventNotifs] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [tipNotifs, setTipNotifs] = useState(true);
  const [collaborationNotifs, setCollaborationNotifs] = useState(true);
  const [walletNotifs, setWalletNotifs] = useState(true);
  const [urgentGigNotifs, setUrgentGigNotifs] = useState(true);
  const [urgentGigActionButtons, setUrgentGigActionButtons] = useState(true);
  const [commentsOnPosts, setCommentsOnPosts] = useState(true);
  const [likesOnPosts, setLikesOnPosts] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [contentSales, setContentSales] = useState(true);

  // UI state
  const [showTimeWindow, setShowTimeWindow] = useState(false);
  const [showGenres, setShowGenres] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.refreshPreferences();

      if (prefs) {
        setMasterEnabled(prefs.notificationsEnabled);
        setStartHour(prefs.notificationStartHour);
        setEndHour(prefs.notificationEndHour);
        setSelectedGenres(prefs.preferredEventGenres || []);
        setEventNotifs(prefs.eventNotificationsEnabled);
        setMessageNotifs(prefs.messageNotificationsEnabled);
        setTipNotifs(prefs.tipNotificationsEnabled);
        setCollaborationNotifs(prefs.collaborationNotificationsEnabled);
        setWalletNotifs(prefs.walletNotificationsEnabled);
        setUrgentGigNotifs(prefs.urgentGigNotificationsEnabled);
        setUrgentGigActionButtons(prefs.urgentGigActionButtonsEnabled);
        setCommentsOnPosts(prefs.commentsOnPosts ?? true);
        setLikesOnPosts(prefs.likesOnPosts ?? true);
        setNewFollowers(prefs.newFollowers ?? true);
        setContentSales(prefs.contentSales ?? true);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload saved preferences from Supabase every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPreferences();
    setRefreshing(false);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      const updates: Partial<NotificationPreferences> = {
        notificationsEnabled: masterEnabled,
        notificationStartHour: startHour,
        notificationEndHour: endHour,
        preferredEventGenres: selectedGenres,
        eventNotificationsEnabled: eventNotifs,
        messageNotificationsEnabled: messageNotifs,
        tipNotificationsEnabled: tipNotifs,
        collaborationNotificationsEnabled: collaborationNotifs,
        walletNotificationsEnabled: walletNotifs,
        urgentGigNotificationsEnabled: urgentGigNotifs,
        urgentGigActionButtonsEnabled: urgentGigActionButtons,
        commentsOnPosts,
        likesOnPosts,
        newFollowers,
        contentSales,
      };

      const success = await notificationService.updatePreferences(updates);
      
      if (success) {
        Alert.alert('Success', 'Notification preferences updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'An error occurred while saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleMasterToggle = (value: boolean) => {
    setMasterEnabled(value);
    if (!value) {
      Alert.alert(
        'Notifications Disabled',
        'You will not receive any notifications until you re-enable this setting.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatTimeRange = () => {
    const start = TIME_OPTIONS.find(t => t.value === startHour)?.label || '8 AM';
    const end = TIME_OPTIONS.find(t => t.value === endHour)?.label || '10 PM';
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading preferences...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} style={styles.headerButton} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={[styles.masterCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.masterIconContainer}>
              <Ionicons name="notifications" size={32} color={masterEnabled ? '#4ECDC4' : theme.colors.textSecondary} />
            </View>
            <View style={styles.masterContent}>
              <Text style={[styles.masterTitle, { color: theme.colors.text }]}>
                Receive Personalized Notifications
              </Text>
              <Text style={[styles.masterSubtitle, { color: theme.colors.textSecondary }]}>
                Get notified about events, tips, messages, and more
              </Text>
            </View>
            <Switch
              value={masterEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: '#767577', true: '#4ECDC4' }}
              thumbColor={masterEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          {!masterEnabled && (
            <View style={[styles.disabledNotice, { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning }]}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
              <Text style={[styles.disabledNoticeText, { color: theme.colors.text }]}>
                All notifications are currently disabled
              </Text>
            </View>
          )}
        </View>

        {/* Time Window */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Schedule</Text>
          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowTimeWindow(!showTimeWindow)}
            disabled={!masterEnabled}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="time-outline" size={24} color={masterEnabled ? '#4ECDC4' : theme.colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: masterEnabled ? theme.colors.text : theme.colors.textSecondary }]}>
                  Active Hours
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  {formatTimeRange()}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showTimeWindow ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showTimeWindow && masterEnabled && (
            <View style={[styles.expandedContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.expandedTitle, { color: theme.colors.text }]}>Start Time</Text>
              <View style={styles.timePickerContainer}>
                {TIME_OPTIONS.slice(0, 12).map(time => (
                  <TouchableOpacity
                    key={time.value}
                    style={[
                      styles.timeOption,
                      { borderColor: theme.colors.border },
                      startHour === time.value && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' }
                    ]}
                    onPress={() => setStartHour(time.value)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      { color: startHour === time.value ? '#fff' : theme.colors.text }
                    ]}>
                      {time.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.expandedTitle, { color: theme.colors.text, marginTop: 16 }]}>End Time</Text>
              <View style={styles.timePickerContainer}>
                {TIME_OPTIONS.slice(12, 24).map(time => (
                  <TouchableOpacity
                    key={time.value}
                    style={[
                      styles.timeOption,
                      { borderColor: theme.colors.border },
                      endHour === time.value && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' }
                    ]}
                    onPress={() => setEndHour(time.value)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      { color: endHour === time.value ? '#fff' : theme.colors.text }
                    ]}>
                      {time.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                You'll only receive notifications during these hours
              </Text>
            </View>
          )}
        </View>

        {/* Event Genre Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Event Preferences</Text>
          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowGenres(!showGenres)}
            disabled={!masterEnabled || !eventNotifs}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="musical-notes" size={24} color={(masterEnabled && eventNotifs) ? '#4ECDC4' : theme.colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: (masterEnabled && eventNotifs) ? theme.colors.text : theme.colors.textSecondary }]}>
                  Preferred Genres
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  {selectedGenres.length === 0 ? 'All genres' : `${selectedGenres.length} selected`}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showGenres ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showGenres && masterEnabled && eventNotifs && (
            <View style={[styles.expandedContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                Select the event types you want to be notified about
              </Text>
              <View style={styles.genreGrid}>
                {EVENT_GENRES.map(genre => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <TouchableOpacity
                      key={genre}
                      style={[
                        styles.genreChip,
                        { borderColor: theme.colors.border },
                        isSelected && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' }
                      ]}
                      onPress={() => toggleGenre(genre)}
                    >
                      <Text style={[
                        styles.genreText,
                        { color: isSelected ? '#fff' : theme.colors.text }
                      ]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedGenres.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSelectedGenres([])}
                >
                  <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Notification Type Toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Types</Text>
          
          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="calendar" size={20} color={eventNotifs ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Events</Text>
              </View>
              <Switch
                value={eventNotifs}
                onValueChange={setEventNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={eventNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Events near you matching your preferences
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="cash" size={20} color={tipNotifs ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Tips & Payments</Text>
              </View>
              <Switch
                value={tipNotifs}
                onValueChange={setTipNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={tipNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              When you receive tips (unlimited notifications)
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="chatbubbles" size={20} color={messageNotifs ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Messages</Text>
              </View>
              <Switch
                value={messageNotifs}
                onValueChange={setMessageNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={messageNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              New messages from other users
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="people" size={20} color={collaborationNotifs ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Collaborations</Text>
              </View>
              <Switch
                value={collaborationNotifs}
                onValueChange={setCollaborationNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={collaborationNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Collaboration requests and updates
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="wallet" size={20} color={walletNotifs ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Wallet</Text>
              </View>
              <Switch
                value={walletNotifs}
                onValueChange={setWalletNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={walletNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Withdrawals and payment updates
            </Text>
          </View>
        </View>

        {/* Social & Engagement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Social & Engagement</Text>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="chatbubble" size={20} color={commentsOnPosts ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Comments on my posts</Text>
              </View>
              <Switch
                value={commentsOnPosts}
                onValueChange={setCommentsOnPosts}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={commentsOnPosts ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              When someone comments on your drop
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="heart" size={20} color={likesOnPosts ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Reactions on my posts</Text>
              </View>
              <Switch
                value={likesOnPosts}
                onValueChange={setLikesOnPosts}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={likesOnPosts ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Likes and reactions on your content
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="person-add" size={20} color={newFollowers ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>New followers & connections</Text>
              </View>
              <Switch
                value={newFollowers}
                onValueChange={setNewFollowers}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={newFollowers ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              When someone follows you or sends a connection request
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="musical-note" size={20} color={contentSales ? '#4ECDC4' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Audio & content sales</Text>
              </View>
              <Switch
                value={contentSales}
                onValueChange={setContentSales}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#4ECDC4' }}
                thumbColor={contentSales ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              When someone purchases your track or album
            </Text>
          </View>
        </View>

        {/* Urgent Gigs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🔥 Urgent Gigs</Text>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="flash" size={20} color={urgentGigNotifs ? '#DC2626' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Urgent Gig Alerts</Text>
              </View>
              <Switch
                value={urgentGigNotifs}
                onValueChange={setUrgentGigNotifs}
                disabled={!masterEnabled}
                trackColor={{ false: '#767577', true: '#DC2626' }}
                thumbColor={urgentGigNotifs ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Get notified when urgent gigs near you are posted
            </Text>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="hand-left" size={20} color={urgentGigActionButtons ? '#DC2626' : theme.colors.textSecondary} />
                <Text style={[styles.toggleText, { color: theme.colors.text }]}>Action Buttons</Text>
              </View>
              <Switch
                value={urgentGigActionButtons}
                onValueChange={setUrgentGigActionButtons}
                disabled={!masterEnabled || !urgentGigNotifs}
                trackColor={{ false: '#767577', true: '#DC2626' }}
                thumbColor={urgentGigActionButtons ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.toggleSubtext, { color: theme.colors.textSecondary }]}>
              Show Accept / Decline buttons directly in the push notification
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              About Notifications
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Maximum 5 notifications per day (excluding tips and followed creators){'\n'}
              • Notifications only between your active hours{'\n'}
              • Events filtered by location (same state) and preferred genres{'\n'}
              • Follow creators to get notified about their posts
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 'bold',
  },
  saveText: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  masterIconContainer: {
    marginRight: 12,
  },
  masterContent: {
    flex: 1,
  },
  masterTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  masterSubtitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  disabledNoticeText: {
    marginLeft: 8,
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  expandedContent: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  expandedTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeOptionText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  helpText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: 'italic',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  toggleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  toggleSubtext: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 24,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});

