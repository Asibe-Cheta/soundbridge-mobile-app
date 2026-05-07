import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { takedownService } from '../services/TakedownService';
import type { DMCANoticeData } from '../services/TakedownService';

interface DMCANoticeModalProps {
  visible: boolean;
  contentId: string;
  contentType: 'track' | 'post' | 'playlist';
  contentTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function DMCANoticeModal({
  visible,
  contentId,
  contentType,
  contentTitle,
  onClose,
  onSubmitted,
}: DMCANoticeModalProps) {
  const { theme } = useTheme();

  const [copyrightedWorkDescription, setCopyrightedWorkDescription] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [claimantAddress, setClaimantAddress] = useState('');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'DMCA' | 'CDPA'>('CDPA');
  const [goodFaithChecked, setGoodFaithChecked] = useState(false);
  const [accuracyChecked, setAccuracyChecked] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    copyrightedWorkDescription.trim().length >= 20 &&
    claimantName.trim().length >= 2 &&
    claimantEmail.trim().includes('@') &&
    claimantAddress.trim().length >= 5 &&
    goodFaithChecked &&
    accuracyChecked &&
    signature.trim().length >= 2 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const noticeData: DMCANoticeData = {
      content_id: contentId,
      content_type: contentType,
      copyrighted_work_description: copyrightedWorkDescription.trim(),
      infringing_url: `https://soundbridge.live/${contentType}s/${contentId}`,
      claimant_name: claimantName.trim(),
      claimant_email: claimantEmail.trim(),
      claimant_address: claimantAddress.trim(),
      claimant_phone: claimantPhone.trim() || undefined,
      good_faith_statement: true,
      accuracy_statement: true,
      signature: signature.trim(),
      jurisdiction,
    };

    try {
      setSubmitting(true);
      await takedownService.submitTakedownNotice(noticeData);
      Alert.alert(
        'Notice Submitted',
        'Your copyright notice has been received. We will review it and take appropriate action within 24–48 hours. A confirmation has been sent to your email address.',
        [{ text: 'OK', onPress: () => { resetForm(); onSubmitted(); } }]
      );
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCopyrightedWorkDescription('');
    setClaimantName('');
    setClaimantEmail('');
    setClaimantAddress('');
    setClaimantPhone('');
    setJurisdiction('CDPA');
    setGoodFaithChecked(false);
    setAccuracyChecked(false);
    setSignature('');
  };

  const handleClose = () => {
    if (
      (copyrightedWorkDescription || claimantName || signature) &&
      !submitting
    ) {
      Alert.alert('Discard Notice?', 'Your notice has not been submitted. Discard it?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); onClose(); } },
      ]);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Copyright Notice</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Legal preamble */}
            <View style={[styles.legalBanner, { backgroundColor: '#7C3AED20', borderColor: '#7C3AED50' }]}>
              <Ionicons name="scale" size={20} color="#7C3AED" />
              <Text style={[styles.legalBannerText, { color: theme.colors.text }]}>
                This is a formal copyright notice under the Digital Millennium Copyright Act (DMCA)
                Section 512 and/or the UK Copyright, Designs and Patents Act 1988 (CDPA). Submitting
                a false notice may expose you to legal liability.
              </Text>
            </View>

            {/* Content being reported */}
            <View style={[styles.contentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="musical-note" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.contentCardText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {contentTitle}
              </Text>
            </View>

            {/* Section: Copyrighted work */}
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              1. Your copyrighted work <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Describe the original work you own the copyright to (e.g. title, release date, label, how you can prove ownership).
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder={"e.g. 'My original song \"Blue Sky\" released 12 January 2025 on my Bandcamp page and registered with PRS/PPL...'"}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              value={copyrightedWorkDescription}
              onChangeText={setCopyrightedWorkDescription}
              editable={!submitting}
              textAlignVertical="top"
            />

            {/* Section: Contact information */}
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              2. Your contact information <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Full legal name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Your full legal name"
              placeholderTextColor={theme.colors.textSecondary}
              value={claimantName}
              onChangeText={setClaimantName}
              editable={!submitting}
              autoCapitalize="words"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Email address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="email@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={claimantEmail}
              onChangeText={setClaimantEmail}
              editable={!submitting}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Mailing address</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Street, City, Postcode/ZIP, Country"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              value={claimantAddress}
              onChangeText={setClaimantAddress}
              editable={!submitting}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Phone number (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="+44 7700 000000"
              placeholderTextColor={theme.colors.textSecondary}
              value={claimantPhone}
              onChangeText={setClaimantPhone}
              editable={!submitting}
              keyboardType="phone-pad"
            />

            {/* Section: Jurisdiction */}
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              3. Applicable law <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>

            <TouchableOpacity
              style={[styles.radioRow, { borderColor: jurisdiction === 'CDPA' ? theme.colors.primary : theme.colors.border, backgroundColor: jurisdiction === 'CDPA' ? theme.colors.primary + '15' : theme.colors.surface }]}
              onPress={() => setJurisdiction('CDPA')}
              disabled={submitting}
            >
              <View style={[styles.radioCircle, { borderColor: jurisdiction === 'CDPA' ? theme.colors.primary : theme.colors.textSecondary }]}>
                {jurisdiction === 'CDPA' && <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} />}
              </View>
              <View style={styles.radioTextWrap}>
                <Text style={[styles.radioLabel, { color: theme.colors.text }]}>UK CDPA (Copyright, Designs and Patents Act 1988)</Text>
                <Text style={[styles.radioDesc, { color: theme.colors.textSecondary }]}>I am based in or targeting the UK market</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioRow, { borderColor: jurisdiction === 'DMCA' ? theme.colors.primary : theme.colors.border, backgroundColor: jurisdiction === 'DMCA' ? theme.colors.primary + '15' : theme.colors.surface }]}
              onPress={() => setJurisdiction('DMCA')}
              disabled={submitting}
            >
              <View style={[styles.radioCircle, { borderColor: jurisdiction === 'DMCA' ? theme.colors.primary : theme.colors.textSecondary }]}>
                {jurisdiction === 'DMCA' && <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} />}
              </View>
              <View style={styles.radioTextWrap}>
                <Text style={[styles.radioLabel, { color: theme.colors.text }]}>US DMCA (Digital Millennium Copyright Act, 17 USC § 512)</Text>
                <Text style={[styles.radioDesc, { color: theme.colors.textSecondary }]}>I am based in or targeting the US market</Text>
              </View>
            </TouchableOpacity>

            {/* Section: Declarations */}
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              4. Declarations <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>

            <TouchableOpacity
              style={[styles.checkRow, { borderColor: goodFaithChecked ? theme.colors.primary : theme.colors.border, backgroundColor: goodFaithChecked ? theme.colors.primary + '15' : theme.colors.surface }]}
              onPress={() => setGoodFaithChecked(!goodFaithChecked)}
              disabled={submitting}
            >
              <View style={[styles.checkbox, { borderColor: goodFaithChecked ? theme.colors.primary : theme.colors.textSecondary, backgroundColor: goodFaithChecked ? theme.colors.primary : 'transparent' }]}>
                {goodFaithChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkText, { color: theme.colors.text }]}>
                I have a good faith belief that the use of the material described above is not authorised by the copyright owner, its agent, or the law.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkRow, { borderColor: accuracyChecked ? theme.colors.primary : theme.colors.border, backgroundColor: accuracyChecked ? theme.colors.primary + '15' : theme.colors.surface }]}
              onPress={() => setAccuracyChecked(!accuracyChecked)}
              disabled={submitting}
            >
              <View style={[styles.checkbox, { borderColor: accuracyChecked ? theme.colors.primary : theme.colors.textSecondary, backgroundColor: accuracyChecked ? theme.colors.primary : 'transparent' }]}>
                {accuracyChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkText, { color: theme.colors.text }]}>
                I declare, under penalty of perjury, that the information in this notice is accurate and that I am the copyright owner or am authorised to act on their behalf.
              </Text>
            </TouchableOpacity>

            {/* Section: Signature */}
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              5. Electronic signature <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Type your full legal name as your electronic signature.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Your full legal name"
              placeholderTextColor={theme.colors.textSecondary}
              value={signature}
              onChangeText={setSignature}
              editable={!submitting}
              autoCapitalize="words"
            />

          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: canSubmit ? '#7C3AED' : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="scale" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Formal Notice</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  legalBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  legalBannerText: { flex: 1, fontSize: 13, lineHeight: 19 },
  contentCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  contentCardText: { flex: 1, fontSize: 13 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  fieldLabel: { fontSize: 13, marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 88,
    marginBottom: 4,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  radioTextWrap: { flex: 1 },
  radioLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  radioDesc: { fontSize: 12 },
  checkRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { padding: 16, borderTopWidth: 1 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
