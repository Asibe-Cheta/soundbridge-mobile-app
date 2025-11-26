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

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>
          
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using SoundBridge ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by the above, please do not use this service.
          </Text>

          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            SoundBridge is a music streaming and sharing platform that allows users to upload, stream, and discover music content. 
            The Service is provided free of charge with optional premium features available through subscription.
          </Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            To access certain features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </Text>

          <Text style={styles.sectionTitle}>4. Content Guidelines</Text>
          <Text style={styles.paragraph}>
            Users may upload original music content that they own or have proper licensing for. Prohibited content includes:
          </Text>
          <Text style={styles.bulletPoint}>• Copyrighted material without proper authorization</Text>
          <Text style={styles.bulletPoint}>• Hate speech or discriminatory content</Text>
          <Text style={styles.bulletPoint}>• Explicit content without proper labeling</Text>
          <Text style={styles.bulletPoint}>• Spam or misleading content</Text>

          <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            Users retain ownership of their original content uploaded to SoundBridge. By uploading content, you grant SoundBridge a non-exclusive license to host, stream, and distribute your content through the platform.
          </Text>

          <Text style={styles.sectionTitle}>6. Revenue Sharing</Text>
          <Text style={styles.paragraph}>
            SoundBridge operates on a fair revenue-sharing model where artists retain 90% of streaming revenue generated from their content. 
            Detailed payout information is available in your creator dashboard.
          </Text>

          <Text style={styles.sectionTitle}>7. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
          </Text>

          <Text style={styles.sectionTitle}>8. Prohibited Uses</Text>
          <Text style={styles.paragraph}>
            You may not use the Service for any unlawful purpose or to solicit others to perform unlawful acts. This includes but is not limited to:
          </Text>
          <Text style={styles.bulletPoint}>• Violating any local, state, national, or international law</Text>
          <Text style={styles.bulletPoint}>• Transmitting malicious code or viruses</Text>
          <Text style={styles.bulletPoint}>• Attempting to gain unauthorized access to other accounts</Text>
          <Text style={styles.bulletPoint}>• Harassing or threatening other users</Text>

          <Text style={styles.sectionTitle}>9. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, 
            including without limitation if you breach the Terms.
          </Text>

          <Text style={styles.sectionTitle}>10. Disclaimers</Text>
          <Text style={styles.paragraph}>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. SoundBridge makes no representations or warranties of any kind, 
            express or implied, as to the operation of the Service or the information, content, or materials included therein.
          </Text>

          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            SoundBridge will not be liable for any damages of any kind arising from the use of this Service, 
            including but not limited to direct, indirect, incidental, punitive, and consequential damages.
          </Text>

          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. 
            Continued use of the Service after such modifications constitutes acceptance of the updated terms.
          </Text>

          <Text style={styles.sectionTitle}>13. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms of Service, please contact us at:
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
