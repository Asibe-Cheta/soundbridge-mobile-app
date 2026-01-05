import React from 'react';
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

export default function CopyrightPolicyScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Copyright Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.iconHeader}>
              <Ionicons name="shield-checkmark" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Protecting Your Rights & Others'
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              SoundBridge is committed to protecting intellectual property rights. This policy explains what you need to know before uploading content to our platform.
            </Text>
          </View>

          {/* What You Must Confirm */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              What You Must Confirm
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              When you upload content to SoundBridge, you are confirming that:
            </Text>

            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.listIcon} />
              <Text style={[styles.listText, { color: theme.colors.text }]}>
                You own all rights to the music, or you have obtained proper licenses/permissions to upload it
              </Text>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.listIcon} />
              <Text style={[styles.listText, { color: theme.colors.text }]}>
                Your content does not infringe on any third-party intellectual property rights, including copyrights, trademarks, or patents
              </Text>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.listIcon} />
              <Text style={[styles.listText, { color: theme.colors.text }]}>
                You understand that uploading copyrighted material without permission may result in account suspension or termination
              </Text>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.listIcon} />
              <Text style={[styles.listText, { color: theme.colors.text }]}>
                You grant SoundBridge a non-exclusive license to stream and distribute your content on the platform
              </Text>
            </View>
          </View>

          {/* What This Means */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              What This Means
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
                • Covers with proper mechanical licenses{'\n'}
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
                • Cover songs without proper licensing
              </Text>
            </View>
          </View>

          {/* Consequences of Infringement */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Consequences of Copyright Infringement
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              If you upload content that infringes on someone else's copyright:
            </Text>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color={theme.colors.warning} style={styles.warningIcon} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningText, { color: theme.colors.text }]}>
                  1. Your content may be removed immediately{'\n'}
                  2. Your account may be suspended or permanently banned{'\n'}
                  3. You may face legal action from the copyright owner{'\n'}
                  4. You may be liable for damages and legal fees
                </Text>
              </View>
            </View>
          </View>

          {/* Reporting Infringement */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Reporting Copyright Infringement
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              If you believe someone has uploaded content that infringes your copyright, please contact us at:
            </Text>
            <TouchableOpacity>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                copyright@soundbridge.com
              </Text>
            </TouchableOpacity>
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
              • Terms version you agreed to
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              This creates an immutable audit trail that protects both you and SoundBridge in case of disputes.
            </Text>
          </View>

          {/* Questions */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Still Have Questions?
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
              If you're unsure whether you can upload certain content, please contact our support team before uploading.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.buttonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* Last Updated */}
          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
            Last Updated: January 1, 2026 • Version 1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
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
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
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
  iconHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  listIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  listText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  exampleBox: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningIcon: {
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
