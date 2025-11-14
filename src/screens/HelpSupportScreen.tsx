import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'You can create an account by tapping "Sign Up" on the login screen. You can register with your email or use Google Sign-In for quick access.',
  },
  {
    category: 'Getting Started',
    question: 'How do I upload my first track?',
    answer: 'Tap the "+" icon in the bottom navigation, select your audio file, add a title and description, choose a cover image, and tap "Upload Track".',
  },
  {
    category: 'Audio & Playback',
    question: 'What audio formats are supported?',
    answer: 'SoundBridge supports MP3, WAV, FLAC, and AAC audio formats. Files should be under 100MB for optimal performance.',
  },
  {
    category: 'Audio & Playback',
    question: 'Why is my track not playing?',
    answer: 'Check your internet connection, ensure the file was uploaded successfully, and try restarting the app. If issues persist, contact support.',
  },
  {
    category: 'Profile & Settings',
    question: 'How do I change my profile picture?',
    answer: 'Go to your Profile, tap on your avatar, and select "Camera" or "Gallery" to upload a new profile picture.',
  },
  {
    category: 'Profile & Settings',
    question: 'Can I make my profile private?',
    answer: 'Yes! Go to Profile > Settings > Privacy & Security > Account Visibility and choose "Private" to make your profile visible only to you.',
  },
  {
    category: 'Notifications',
    question: 'How do I manage notifications?',
    answer: 'Go to Profile > Settings > Notifications to customize which notifications you receive and when.',
  },
  {
    category: 'Technical Issues',
    question: 'The app keeps crashing, what should I do?',
    answer: 'Try force-closing and reopening the app, ensure you have the latest version, restart your device, and clear the app cache if possible.',
  },
];

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to reach us',
      [
        { text: 'Email', onPress: () => Linking.openURL('mailto:support@soundbridge.com') },
        { text: 'Twitter', onPress: () => Linking.openURL('https://twitter.com/soundbridge') },
        { text: 'Discord', onPress: () => Linking.openURL('https://discord.gg/soundbridge') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleReportBug = () => {
    Alert.alert(
      'Report a Bug',
      'Help us improve SoundBridge by reporting bugs',
      [
        { text: 'Email Bug Report', onPress: () => Linking.openURL('mailto:bugs@soundbridge.com?subject=Bug Report') },
        { text: 'GitHub Issues', onPress: () => Linking.openURL('https://github.com/soundbridge/mobile/issues') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleFeatureRequest = () => {
    Alert.alert(
      'Feature Request',
      'We\'d love to hear your ideas!',
      [
        { text: 'Email Request', onPress: () => Linking.openURL('mailto:features@soundbridge.com?subject=Feature Request') },
        { text: 'Community Forum', onPress: () => Linking.openURL('https://community.soundbridge.com') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity onPress={handleContactSupport}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help articles..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleContactSupport}>
              <Ionicons name="mail" size={24} color="#DC2626" />
              <Text style={styles.quickActionText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleReportBug}>
              <Ionicons name="bug" size={24} color="#FF9800" />
              <Text style={styles.quickActionText}>Report Bug</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleFeatureRequest}>
              <Ionicons name="bulb" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Feature Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() => setExpandedFAQ(expandedFAQ === `${index}` ? null : `${index}`)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={expandedFAQ === `${index}` ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </View>
                {expandedFAQ === `${index}` && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color="#666" />
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>Try adjusting your search or category filter</Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Get in Touch</Text>
            <Text style={styles.contactDescription}>
              Our support team is here to help you with any questions or issues you might have.
            </Text>
            
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL('mailto:support@soundbridge.com')}
            >
              <Ionicons name="mail" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Email Support</Text>
            </TouchableOpacity>

            <View style={styles.contactInfo}>
              <Text style={styles.contactInfoText}>📧 support@soundbridge.com</Text>
              <Text style={styles.contactInfoText}>🕒 Response time: 24-48 hours</Text>
              <Text style={styles.contactInfoText}>🌍 Available worldwide</Text>
            </View>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 20,
    marginHorizontal: 4,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  categories: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#DC2626',
  },
  categoryChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noResultsSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contactInfo: {
    gap: 8,
  },
  contactInfoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});
