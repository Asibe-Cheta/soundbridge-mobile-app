import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const features = [
  { icon: 'musical-notes', title: 'Discover New Music', description: 'Explore a vast library of tracks from independent artists worldwide.' },
  { icon: 'person-add', title: 'Connect with Creators', description: 'Follow your favorite artists, send messages, and engage with their content.' },
  { icon: 'cloud-upload', title: 'Upload Your Tracks', description: 'Share your music or podcasts with a global audience and build your fanbase.' },
  { icon: 'wallet', title: 'Monetize Your Art', description: 'Earn from your plays, receive tips, and manage your payouts.' },
];

export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>About SoundBridge</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Logo & Mission */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="radio" size={64} color="#DC2626" />
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}>SoundBridge</Text>
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>Version 1.0.0 Mobile</Text>
          <Text style={[styles.mission, { color: theme.colors.textSecondary }]}>
            The social platform for music creators and listeners. SoundBridge empowers independent artists to share their music with the world while building meaningful connections with their audience.
          </Text>

          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => Linking.openURL('https://soundbridge.live')}
          >
            <Ionicons name="globe" size={20} color="#FFFFFF" />
            <Text style={styles.websiteButtonText}>Visit SoundBridge.live</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>What Makes Us Different</Text>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureItem, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name={feature.icon as any} size={24} color="#DC2626" style={styles.featureIcon} />
              <View style={styles.featureTextContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Connect With Us</Text>
          <Text style={[styles.socialDescription, { color: theme.colors.textSecondary }]}>
            Follow us on social media for updates, music discoveries, and community highlights.
          </Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.colors.surface }]} onPress={() => Linking.openURL('https://twitter.com/soundbridge')}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.colors.surface }]} onPress={() => Linking.openURL('https://instagram.com/soundbridge')}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.colors.surface }]} onPress={() => Linking.openURL('https://discord.gg/soundbridge')}>
              <Ionicons name="logo-discord" size={24} color="#5865F2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Legal & Support</Text>
          
          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => Linking.openURL('https://soundbridge.live/legal/terms')}
          >
            <Ionicons name="document-text" size={20} color={theme.colors.text} />
            <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>Terms of Service</Text>
            <Ionicons name="open" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => Linking.openURL('https://soundbridge.live/legal/privacy')}
          >
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.text} />
            <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>Privacy Policy</Text>
            <Ionicons name="open" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => Linking.openURL('mailto:support@soundbridge.live')}
          >
            <Ionicons name="mail" size={20} color={theme.colors.text} />
            <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>Contact Support</Text>
            <Ionicons name="open" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.text }]}>© 2025 SoundBridge. All rights reserved.</Text>
          <Text style={[styles.footerSubtext, { color: theme.colors.textSecondary }]}>Built with passion for music creators.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  logoContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 50,
    padding: 15,
    marginBottom: 15,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 5,
  },
  version: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  mission: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '90%',
    marginBottom: 20,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  websiteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    marginRight: 15,
    marginTop: 4,
  },
  featureTextContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  socialDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  socialButton: {
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 25,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  linkButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
  },
});