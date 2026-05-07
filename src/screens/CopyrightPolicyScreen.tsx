import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import DMCANoticeModal from '../modals/DMCANoticeModal';

export default function CopyrightPolicyScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [showDMCAModal, setShowDMCAModal] = useState(false);

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
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Copyright Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Intro */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.iconHeader}>
              <Ionicons name="shield-checkmark" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Protecting Your Rights & Others'
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              SoundBridge is committed to protecting intellectual property rights and operating in full compliance with the Digital Millennium Copyright Act (DMCA) and the UK Copyright, Designs and Patents Act 1988 (CDPA). This policy was last updated on 26 February 2026 (version 2026-02-26).
            </Text>
          </View>

          {/* DMCA Designated Agent */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Designated Copyright Agent
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              SoundBridge has designated a copyright agent to receive notices of claimed infringement as required by 17 USC § 512(c)(2). Contact details:
            </Text>
            <View style={[styles.agentBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.agentLabel, { color: theme.colors.text }]}>SoundBridge Legal — Copyright Agent</Text>
              <TouchableOpacity>
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>copyright@soundbridge.com</Text>
              </TouchableOpacity>
              <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
                SoundBridge Ltd{'\n'}
                [Registered address — to be completed]{'\n'}
                United Kingdom
              </Text>
            </View>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              This agent is registered with the US Copyright Office under 17 USC § 512(c)(2). Only notices of copyright infringement should be sent to this agent. All other questions should be directed to support.
            </Text>
          </View>

          {/* What you must confirm */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Uploader Obligations
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              When you upload content to SoundBridge, you confirm that:
            </Text>
            {[
              'You own all rights to the content, or have obtained proper licences/permissions',
              'Your content does not infringe any third-party copyright, trademark, or other intellectual property rights',
              'You grant SoundBridge a non-exclusive licence to stream and distribute your content on the platform',
              'You understand that uploading infringing material may result in content removal, account suspension, or termination',
            ].map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.listIcon} />
                <Text style={[styles.listText, { color: theme.colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* What you can / cannot upload */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              What You Can and Cannot Upload
            </Text>
            <View style={styles.exampleBox}>
              <View style={[styles.exampleHeader, { backgroundColor: theme.colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.exampleTitle, { color: theme.colors.success }]}>You CAN Upload:</Text>
              </View>
              <Text style={[styles.exampleText, { color: theme.colors.textSecondary }]}>
                • Your original music compositions{'\n'}
                • Tracks you produced yourself{'\n'}
                • Music you have written permission to upload{'\n'}
                • Cover recordings (with mechanical licence — SoundBridge holds a blanket PRS/MCPS licence){'\n'}
                • Public domain works
              </Text>
            </View>
            <View style={styles.exampleBox}>
              <View style={[styles.exampleHeader, { backgroundColor: theme.colors.error + '20' }]}>
                <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                <Text style={[styles.exampleTitle, { color: theme.colors.error }]}>You CANNOT Upload:</Text>
              </View>
              <Text style={[styles.exampleText, { color: theme.colors.textSecondary }]}>
                • Someone else's original music without permission{'\n'}
                • Copyrighted beats or instrumentals you don't own{'\n'}
                • Samples from other songs without clearance{'\n'}
                • Music downloaded from other platforms{'\n'}
                • Any content you do not have the right to distribute
              </Text>
            </View>
          </View>

          {/* Repeat Infringer Policy */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Repeat Infringer Policy
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              In accordance with 17 USC § 512(i), SoundBridge maintains and enforces a policy to terminate the accounts of users who are repeat infringers:
            </Text>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color={theme.colors.warning} style={styles.warningIcon} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningText, { color: theme.colors.text }]}>
                  1st notice: Content removed immediately; formal warning issued{'\n'}
                  2nd notice: Content removed; upload privileges suspended{'\n'}
                  3rd notice: Account terminated permanently
                </Text>
              </View>
            </View>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              Counter-notices submitted in good faith reset the count for that specific removal. Abuse of the counter-notice process is itself a grounds for account termination.
            </Text>
          </View>

          {/* How to submit a notice */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              How to Submit a Copyright Notice
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              To be effective under 17 USC § 512(c)(3), a copyright notice must include all of the following:
            </Text>
            {[
              '(i) Identification of the copyrighted work claimed to have been infringed',
              '(ii) Identification of the material claimed to be infringing, with enough detail to locate it on the platform',
              '(iii) Your contact information (name, address, phone, email)',
              '(iv) A statement that you have a good faith belief that the use is not authorised by the copyright owner, its agent, or law',
              '(v) A statement that the information in the notice is accurate and, under penalty of perjury, that you are authorised to act on behalf of the copyright owner',
              '(vi) Your physical or electronic signature',
            ].map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="document-text" size={16} color={theme.colors.primary} style={styles.listIcon} />
                <Text style={[styles.listText, { color: theme.colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#7C3AED' }]}
              onPress={() => setShowDMCAModal(true)}
            >
              <Ionicons name="scale" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Submit Formal Copyright Notice →</Text>
            </TouchableOpacity>
          </View>

          {/* Counter-notice rights */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Counter-Notification Rights
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              If your content was removed and you believe it was a mistake or misidentification, you may submit a counter-notice under 17 USC § 512(g) / UK CDPA. A counter-notice must include:
            </Text>
            {[
              'Identification of the material that was removed and its prior location',
              'A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification',
              'Your name, address, phone number, and consent to jurisdiction of the courts',
              'Your physical or electronic signature',
            ].map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="document-text" size={16} color={theme.colors.primary} style={styles.listIcon} />
                <Text style={[styles.listText, { color: theme.colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
            <View style={[styles.agentBox, { backgroundColor: theme.colors.surface + '80', borderColor: theme.colors.border }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                After we receive a counter-notice, we will forward it to the original claimant. The claimant then has 10–14 business days to notify us that they have filed a court action. If no court action is filed in that window, we may restore the content.
              </Text>
            </View>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              To submit a counter-notice, open the relevant track from your profile and tap "Submit Counter-Notice" from the moderation status banner.
            </Text>
          </View>

          {/* UK CDPA */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              UK CDPA Equivalent Provisions
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              SoundBridge is registered in the UK. UK users and rights holders may also proceed under the Copyright, Designs and Patents Act 1988 and the Electronic Commerce (EC Directive) Regulations 2002. The hosting exemption under these regulations requires expeditious removal upon actual knowledge of infringement — which is why we act promptly on all valid notices.
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              SoundBridge holds applicable licences from PRS for Music / MCPS for the public performance and reproduction of musical compositions. Cover song recordings may be uploaded under these blanket licences.
            </Text>
          </View>

          {/* Audit Trail */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Audit Trail & Record Keeping
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              When you upload content and confirm copyright ownership, we record:
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              • Timestamp of your confirmation{'\n'}
              • Device information (platform, OS, app version){'\n'}
              • Terms version you agreed to (2026-02-26)
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              This creates an immutable audit trail that protects both you and SoundBridge in case of disputes.
            </Text>
          </View>

          {/* Questions */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Questions?
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              For general copyright questions, contact our support team. For formal copyright notices only, use the designated agent address above.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.buttonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
            Last Updated: 26 February 2026 • Version 2026-02-26
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* DMCA Notice Modal */}
      <DMCANoticeModal
        visible={showDMCAModal}
        contentId=""
        contentType="track"
        contentTitle="[Content ID will be populated from context]"
        onClose={() => setShowDMCAModal(false)}
        onSubmitted={() => setShowDMCAModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSpacer: { width: 32 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconHeader: { alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  bodyText: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  listItem: { flexDirection: 'row', marginBottom: 12 },
  listIcon: { marginRight: 12, marginTop: 2 },
  listText: { fontSize: 15, lineHeight: 22, flex: 1 },
  exampleBox: { marginBottom: 16, borderRadius: 8, overflow: 'hidden' },
  exampleHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  exampleTitle: { fontSize: 16, fontWeight: '600' },
  exampleText: { fontSize: 14, lineHeight: 20, padding: 12 },
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 12,
  },
  warningIcon: { marginRight: 12 },
  warningContent: { flex: 1 },
  warningText: { fontSize: 14, lineHeight: 20 },
  agentBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  agentLabel: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  linkText: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline', marginBottom: 4 },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastUpdated: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
