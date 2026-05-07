import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [showEmail, setShowEmail] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowDataCollection, setAllowDataCollection] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    if (!session || !user) {
      setLoadingPrivacy(false);
      return;
    }

    try {
      setLoadingPrivacy(true);

      // Load confirmed DB columns
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_visibility, show_email, allow_messages')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setProfileVisibility((profile.profile_visibility as 'public' | 'private') || 'public');
        setShowEmail(profile.show_email ?? false);
        setAllowMessages(profile.allow_messages !== false);
      }

      // Load local-only preferences (columns not yet in DB)
      const [onlineStatus, dataCollection] = await Promise.all([
        AsyncStorage.getItem(`privacy_show_online_status_${user.id}`),
        AsyncStorage.getItem(`privacy_allow_data_collection_${user.id}`),
      ]);
      if (onlineStatus !== null) setShowOnlineStatus(onlineStatus === 'true');
      if (dataCollection !== null) setAllowDataCollection(dataCollection === 'true');
    } catch (error) {
      console.error('❌ Error loading privacy settings:', error);
    } finally {
      setLoadingPrivacy(false);
    }
  };

  // Save a column directly to Supabase — pass the new value explicitly to avoid stale closure
  const saveToSupabase = async (updates: Record<string, boolean | string>) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
  };

  const handleAccountVisibility = () => {
    Alert.alert(
      'Account Visibility',
      'Choose who can see your profile and tracks',
      [
        {
          text: 'Public',
          onPress: async () => {
            const prev = profileVisibility;
            setProfileVisibility('public');
            setSavingPrivacy(true);
            try {
              await saveToSupabase({ profile_visibility: 'public' });
            } catch {
              setProfileVisibility(prev);
              Alert.alert('Error', 'Failed to update visibility. Please try again.');
            } finally {
              setSavingPrivacy(false);
            }
          },
        },
        {
          text: 'Private',
          onPress: async () => {
            const prev = profileVisibility;
            setProfileVisibility('private');
            setSavingPrivacy(true);
            try {
              await saveToSupabase({ profile_visibility: 'private' });
            } catch {
              setProfileVisibility(prev);
              Alert.alert('Error', 'Failed to update visibility. Please try again.');
            } finally {
              setSavingPrivacy(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShowEmailToggle = async (value: boolean) => {
    setShowEmail(value);
    try {
      await saveToSupabase({ show_email: value });
    } catch {
      setShowEmail(!value);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const handleAllowMessagesToggle = async (value: boolean) => {
    setAllowMessages(value);
    try {
      await saveToSupabase({ allow_messages: value });
    } catch {
      setAllowMessages(!value);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const handleShowOnlineStatusToggle = async (value: boolean) => {
    setShowOnlineStatus(value);
    try {
      await AsyncStorage.setItem(`privacy_show_online_status_${user?.id}`, String(value));
    } catch {
      setShowOnlineStatus(!value);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const handleAllowDataCollectionToggle = async (value: boolean) => {
    setAllowDataCollection(value);
    try {
      await AsyncStorage.setItem(`privacy_allow_data_collection_${user?.id}`, String(value));
    } catch {
      setAllowDataCollection(!value);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Download Your Data',
      'We will email you a copy of all your data within 7 business days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Data', onPress: () => Alert.alert('Success', 'Data download request submitted') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    (navigation as any).navigate('AccountDeletion');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Account Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Visibility</Text>
          {loadingPrivacy ? (
            <View style={styles.settingItem}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={handleAccountVisibility} disabled={savingPrivacy}>
              <View style={styles.settingInfo}>
                <Ionicons name="eye" size={24} color="#FFFFFF" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>Profile Visibility</Text>
                  <Text style={styles.settingSubtext}>
                    Currently: {profileVisibility === 'public' ? 'Public' : 'Private'}
                  </Text>
                </View>
              </View>
              {savingPrivacy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#666" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Two-Factor Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => (navigation as any).navigate('TwoFactorSettings')}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Two-Factor Authentication</Text>
                <Text style={styles.settingSubtext}>Add an extra layer of security</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Privacy Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Controls</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Show Email</Text>
                <Text style={styles.settingSubtext}>Display your email on your profile</Text>
              </View>
            </View>
            <Switch
              value={showEmail}
              onValueChange={handleShowEmailToggle}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={showEmail ? '#FFFFFF' : '#f4f3f4'}
              disabled={loadingPrivacy || savingPrivacy}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Allow Messages</Text>
                <Text style={styles.settingSubtext}>Let others send you messages</Text>
              </View>
            </View>
            <Switch
              value={allowMessages}
              onValueChange={handleAllowMessagesToggle}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={allowMessages ? '#FFFFFF' : '#f4f3f4'}
              disabled={loadingPrivacy || savingPrivacy}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="radio-button-on" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Show Online Status</Text>
                <Text style={styles.settingSubtext}>Let others see when you're online</Text>
              </View>
            </View>
            <Switch
              value={showOnlineStatus}
              onValueChange={handleShowOnlineStatusToggle}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={showOnlineStatus ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleDownloadData}>
            <View style={styles.settingInfo}>
              <Ionicons name="download" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Download My Data</Text>
                <Text style={styles.settingSubtext}>Get a copy of all your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="analytics" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Analytics & Insights</Text>
                <Text style={styles.settingSubtext}>Allow data collection for insights</Text>
              </View>
            </View>
            <Switch
              value={allowDataCollection}
              onValueChange={handleAllowDataCollectionToggle}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={allowDataCollection ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Blocked Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('BlockedUsers' as never)}>
            <View style={styles.settingInfo}>
              <Ionicons name="ban" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Manage Blocked Users</Text>
                <Text style={styles.settingSubtext}>View and unblock users</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>Danger Zone</Text>
          <TouchableOpacity style={[styles.settingItem, styles.dangerItem]} onPress={handleDeleteAccount}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={24} color="#FF6B6B" />
              <View style={styles.settingContent}>
                <Text style={[styles.settingText, { color: '#FF6B6B' }]}>Delete Account</Text>
                <Text style={styles.settingSubtext}>Permanently delete your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  settingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
});
