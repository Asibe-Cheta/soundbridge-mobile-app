import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { accountDeletionService, type AccountDeletionReason } from '../services/AccountDeletionService';
import { SystemTypography as Typography } from '../constants/Typography';

const FALLBACK_REASONS: AccountDeletionReason[] = [
  { id: 'privacy', label: 'Privacy concerns' },
  { id: 'not_useful', label: 'Not finding enough value' },
  { id: 'too_complex', label: 'App feels too complex' },
  { id: 'technical', label: 'Technical issues' },
  { id: 'other', label: 'Other', requires_detail: true },
];

export default function AccountDeletionScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { session, signOut } = useAuth();

  const [reasons, setReasons] = useState<AccountDeletionReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadReasons = async () => {
      try {
        const data = await accountDeletionService.getReasons();
        if (mounted) {
          setReasons(data.length > 0 ? data : FALLBACK_REASONS);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load deletion reasons, using fallback');
        if (mounted) {
          setReasons(FALLBACK_REASONS);
        }
      } finally {
        if (mounted) {
          setLoadingReasons(false);
        }
      }
    };
    loadReasons();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedReason = useMemo(
    () => reasons.find((reason) => reason.id === selectedReasonId) || null,
    [reasons, selectedReasonId]
  );

  const canSubmit = !!selectedReasonId && (!selectedReason?.requires_detail || detail.trim().length > 0);

  const handleSubmit = async () => {
    if (!session) {
      Alert.alert('Login Required', 'Please log in again to continue.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please select a reason and add details if required.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This will start the account deletion process. Your account will be disabled during the retention window.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await accountDeletionService.requestDeletion(session, {
                reason_id: selectedReasonId!,
                detail: detail.trim() || undefined,
              });
              Alert.alert(
                'Request Submitted',
                'Your deletion request has been submitted. You will receive updates by email.',
                [{ text: 'OK', onPress: () => signOut() }]
              );
            } catch (error: any) {
              console.error('❌ Failed to submit deletion request:', error);
              Alert.alert('Request Failed', error?.message || 'Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Account Deletion</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Before you go</Text>
            <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
              We’ll start a 14-day retention window. You can cancel during this time by signing back in.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Reason for deletion</Text>
            {loadingReasons ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              reasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonRow,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    selectedReasonId === reason.id && { borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedReasonId(reason.id)}
                >
                  <Ionicons
                    name={selectedReasonId === reason.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedReasonId === reason.id ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.reasonText, { color: theme.colors.text }]}>{reason.label}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {selectedReason?.requires_detail && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tell us more</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border },
                ]}
                placeholder="Share details (required)"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                value={detail}
                onChangeText={setDetail}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: canSubmit ? theme.colors.error : theme.colors.error + '60',
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Request Account Deletion</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  title: {
    ...Typography.headerMedium,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    ...Typography.headerSmall,
    marginBottom: 8,
  },
  cardText: {
    ...Typography.body,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.body,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonText: {
    ...Typography.body,
    marginLeft: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
