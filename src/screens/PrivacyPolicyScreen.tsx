import React from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>
          
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, such as when you create an account, upload content, or contact us for support.
          </Text>
          
          <Text style={styles.subTitle}>Personal Information:</Text>
          <Text style={styles.bulletPoint}>• Email address and username</Text>
          <Text style={styles.bulletPoint}>• Profile information (display name, bio, profile picture)</Text>
          <Text style={styles.bulletPoint}>• Payment information for premium features</Text>
          
          <Text style={styles.subTitle}>Usage Information:</Text>
          <Text style={styles.bulletPoint}>• Listening history and preferences</Text>
          <Text style={styles.bulletPoint}>• Device information and IP address</Text>
          <Text style={styles.bulletPoint}>• App usage analytics and performance data</Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to provide, maintain, and improve our services:
          </Text>
          <Text style={styles.bulletPoint}>• To create and manage your account</Text>
          <Text style={styles.bulletPoint}>• To personalize your music recommendations</Text>
          <Text style={styles.bulletPoint}>• To process payments and calculate royalties</Text>
          <Text style={styles.bulletPoint}>• To send you important service updates</Text>
          <Text style={styles.bulletPoint}>• To improve our platform and develop new features</Text>

          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described below:
          </Text>
          <Text style={styles.bulletPoint}>• With your explicit consent</Text>
          <Text style={styles.bulletPoint}>• To comply with legal obligations</Text>
          <Text style={styles.bulletPoint}>• To protect our rights and prevent fraud</Text>
          <Text style={styles.bulletPoint}>• With service providers who assist in our operations</Text>

          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. 
            This includes encryption of sensitive data and regular security audits.
          </Text>

          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as your account is active or as needed to provide you services. 
            You may request deletion of your account and associated data at any time through your account settings.
          </Text>

          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            Depending on your location, you may have certain rights regarding your personal information:
          </Text>
          <Text style={styles.bulletPoint}>• Access: Request a copy of your personal data</Text>
          <Text style={styles.bulletPoint}>• Correction: Update or correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Deletion: Request deletion of your personal data</Text>
          <Text style={styles.bulletPoint}>• Portability: Request transfer of your data</Text>
          <Text style={styles.bulletPoint}>• Opt-out: Unsubscribe from marketing communications</Text>

          <Text style={styles.sectionTitle}>7. Cookies and Tracking</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and deliver personalized content. 
            You can control cookie preferences through your device settings.
          </Text>

          <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Our app may contain links to third-party services or integrate with external platforms. 
            This privacy policy does not apply to third-party services, and we encourage you to review their privacy policies.
          </Text>

          <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            SoundBridge is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
            If you believe we have collected such information, please contact us immediately.
          </Text>

          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place to protect your data during international transfers.
          </Text>

          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page 
            and updating the "Last updated" date.
          </Text>

          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={styles.contactInfo}>
            Email: contact@soundbridge.live{'\n'}
            Address: 2 Cedar Grove, Wokingham, England, United Kingdom
          </Text>
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
  },
  section: {
    padding: 20,
  },
  lastUpdated: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  subTitle: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  bulletPoint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 16,
  },
  contactInfo: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
});
