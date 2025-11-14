import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [allowMessages, setAllowMessages] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowDataCollection, setAllowDataCollection] = useState(false);

  const handleAccountVisibility = () => {
    Alert.alert(
      'Account Visibility',
      'Choose who can see your profile and tracks',
      [
        { text: 'Public', onPress: () => setProfileVisibility('public') },
        { text: 'Friends Only', onPress: () => setProfileVisibility('friends') },
        { text: 'Private', onPress: () => setProfileVisibility('private') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your tracks, followers, and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => Alert.alert('Account Deletion', 'Please contact support@soundbridge.com to delete your account.')
        },
      ]
    );
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
          <TouchableOpacity style={styles.settingItem} onPress={handleAccountVisibility}>
            <View style={styles.settingInfo}>
              <Ionicons name="eye" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Profile Visibility</Text>
                <Text style={styles.settingSubtext}>Currently: {profileVisibility}</Text>
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
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              <View style={styles.settingContent}>
                <Text style={styles.settingText}>Allow Messages</Text>
                <Text style={styles.settingSubtext}>Let others send you messages</Text>
              </View>
            </View>
            <Switch
              value={allowMessages}
              onValueChange={setAllowMessages}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={allowMessages ? '#FFFFFF' : '#f4f3f4'}
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
              onValueChange={setShowOnlineStatus}
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
              onValueChange={setAllowDataCollection}
              trackColor={{ false: '#767577', true: '#DC2626' }}
              thumbColor={allowDataCollection ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Blocked Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          <TouchableOpacity style={styles.settingItem}>
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
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
});
