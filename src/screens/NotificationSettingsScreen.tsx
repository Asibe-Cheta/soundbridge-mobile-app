import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../services/NotificationService';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    collaborationRequests: true,
    messageNotifications: true,
    eventReminders: true,
  });
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const token = await NotificationService.registerForPushNotifications();
      setPushToken(token);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    NotificationService.updateSettings(newSettings);

    // If disabling all notifications, show confirmation
    if (key === 'enabled' && !value) {
      Alert.alert(
        'Notifications Disabled',
        'You will no longer receive push notifications from SoundBridge.',
        [{ text: 'OK' }]
      );
    }
  };

  const testNotification = async () => {
    try {
      await NotificationService.scheduleLocalNotification(
        'Test Notification 🔔',
        'This is a test notification from SoundBridge!',
        { type: 'test' }
      );
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const requestPermissions = async () => {
    const granted = await NotificationService.requestPermissions();
    if (granted) {
      Alert.alert('Success', 'Notification permissions granted!');
      const token = await NotificationService.registerForPushNotifications();
      setPushToken(token);
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive updates from SoundBridge.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={testNotification}>
          <Ionicons name="notifications" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Push Token Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons 
                name={pushToken ? 'checkmark-circle' : 'alert-circle'} 
                size={24} 
                color={pushToken ? '#4CAF50' : '#FF9800'} 
              />
              <View style={styles.statusContent}>
                <Text style={styles.statusText}>
                  {pushToken ? 'Notifications Enabled' : 'Setup Required'}
                </Text>
                <Text style={styles.statusSubtext}>
                  {pushToken 
                    ? 'You will receive push notifications' 
                    : 'Tap to enable push notifications'
                  }
                </Text>
              </View>
              {!pushToken && (
                <TouchableOpacity style={styles.enableButton} onPress={requestPermissions}>
                  <Text style={styles.enableButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Master Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Push Notifications</Text>
                <Text style={styles.settingSubtext}>Receive notifications from SoundBridge</Text>
              </View>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => updateSetting('enabled', value)}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You'll Receive</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>New Tracks</Text>
                <Text style={styles.settingSubtext}>When artists you follow release new music</Text>
              </View>
            </View>
            <Switch
              value={settings.newTracks && settings.enabled}
              onValueChange={(value) => updateSetting('newTracks', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.newTracks && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Messages</Text>
                <Text style={styles.settingSubtext}>When someone sends you a message</Text>
              </View>
            </View>
            <Switch
              value={settings.messages && settings.enabled}
              onValueChange={(value) => updateSetting('messages', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.messages && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>New Followers</Text>
                <Text style={styles.settingSubtext}>When someone starts following you</Text>
              </View>
            </View>
            <Switch
              value={settings.followers && settings.enabled}
              onValueChange={(value) => updateSetting('followers', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.followers && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="heart" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Likes & Reactions</Text>
                <Text style={styles.settingSubtext}>When someone likes your tracks</Text>
              </View>
            </View>
            <Switch
              value={settings.likes && settings.enabled}
              onValueChange={(value) => updateSetting('likes', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.likes && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Comments</Text>
                <Text style={styles.settingSubtext}>When someone comments on your tracks</Text>
              </View>
            </View>
            <Switch
              value={settings.comments && settings.enabled}
              onValueChange={(value) => updateSetting('comments', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.comments && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="list" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Playlist Updates</Text>
                <Text style={styles.settingSubtext}>When playlists you follow are updated</Text>
              </View>
            </View>
            <Switch
              value={settings.playlistUpdates && settings.enabled}
              onValueChange={(value) => updateSetting('playlistUpdates', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.playlistUpdates && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="settings" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>App Updates</Text>
                <Text style={styles.settingSubtext}>Important updates and announcements</Text>
              </View>
            </View>
            <Switch
              value={settings.systemUpdates && settings.enabled}
              onValueChange={(value) => updateSetting('systemUpdates', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={settings.systemUpdates && settings.enabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statusSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  enableButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingContent: {
    marginLeft: 16,
    flex: 1,
  },
  settingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
