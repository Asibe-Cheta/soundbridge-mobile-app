import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { opportunityService } from '../services/OpportunityService';
import { uploadImage } from '../services/UploadService';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';

type RouteParams = {
  DisputeDetail: {
    projectId: string;
    projectTitle: string;
    otherPartyName: string;
    agreedAmount: number;
    currency: string;
  };
};

const DISPUTE_REASONS = [
  { id: 'not_delivered', label: 'Work was not delivered as agreed', icon: 'close-circle-outline' },
  { id: 'quality', label: 'Quality does not match the brief', icon: 'sad-outline' },
  { id: 'unresponsive', label: 'Creator is unresponsive', icon: 'chatbubble-ellipses-outline' },
  { id: 'incomplete', label: 'Deliverables are incomplete', icon: 'document-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function DisputeDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'DisputeDetail'>>();
  const { projectId, projectTitle, otherPartyName, agreedAmount, currency } = route.params;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!selectedReason && description.trim().length >= 20;

  const pickEvidenceImage = async () => {
    if (evidenceImages.length >= 3) {
      Alert.alert('Limit reached', 'You can attach up to 3 images as evidence.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEvidenceImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    Alert.alert(
      'Raise Dispute',
      `This will put the project under dispute and notify our team. Funds of ${currency} ${agreedAmount.toFixed(2)} will remain in escrow until resolved. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise Dispute',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);

              // Upload any evidence images to post-attachments bucket
              const evidenceUrls: string[] = [];
              for (const uri of evidenceImages) {
                const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
                const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
                const result = await uploadImage(
                  user?.id ?? 'anon',
                  { uri, name: `evidence_${Date.now()}.${ext}`, type: mimeType },
                  'dispute'
                );
                if (result.success && result.data?.url) {
                  evidenceUrls.push(result.data.url);
                }
              }

              await opportunityService.raiseDispute(
                projectId,
                selectedReason!,
                description,
                evidenceUrls.length > 0 ? evidenceUrls : undefined
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                'Dispute Raised',
                'Our team has been notified and will review your case within 48 hours. The payment is held securely until resolution.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to raise dispute. Please try again.');
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
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Raise a Dispute</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning banner */}
          <View style={[styles.warningBanner, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: '#EF4444' }]}>Payment held securely</Text>
              <Text style={[styles.warningDesc, { color: theme.colors.textSecondary }]}>
                {currency} {agreedAmount.toFixed(2)} will remain in SoundBridge Escrow until this dispute is resolved by our team (typically within 48 hours).
              </Text>
            </View>
          </View>

          {/* Project context */}
          <View style={[styles.contextCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.contextLabel, { color: theme.colors.textSecondary }]}>Project</Text>
            <Text style={[styles.contextValue, { color: theme.colors.text }]}>{projectTitle}</Text>
            <Text style={[styles.contextLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>Other party</Text>
            <Text style={[styles.contextValue, { color: theme.colors.text }]}>{otherPartyName}</Text>
          </View>

          {/* Reason selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>What's the issue?</Text>
          <View style={styles.reasonsList}>
            {DISPUTE_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(239, 68, 68, 0.1)'
                        : theme.colors.card,
                      borderColor: isSelected
                        ? 'rgba(239, 68, 68, 0.5)'
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedReason(reason.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={20}
                    color={isSelected ? '#EF4444' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      { color: isSelected ? '#EF4444' : theme.colors.text },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color="#EF4444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Describe the issue
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '400' }}> (min. 20 characters)</Text>
          </Text>
          <View
            style={[
              styles.textInputContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: description.length > 0 && description.length < 20
                  ? 'rgba(239, 68, 68, 0.5)'
                  : theme.colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: theme.colors.text }]}
              placeholder="Provide details about what went wrong, when it happened, and what was agreed..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
              {description.length} chars
            </Text>
          </View>

          {/* Evidence attachments */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Evidence
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '400' }}> (optional, up to 3 images)</Text>
          </Text>
          <View style={styles.evidenceRow}>
            {evidenceImages.map((uri, index) => (
              <View key={index} style={styles.evidenceThumb}>
                <Image source={{ uri }} style={styles.evidenceImage} />
                <TouchableOpacity
                  style={styles.evidenceRemoveBtn}
                  onPress={() => removeEvidence(index)}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {evidenceImages.length < 3 && (
              <TouchableOpacity
                style={[styles.evidenceAddBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={pickEvidenceImage}
              >
                <Ionicons name="camera-outline" size={22} color={theme.colors.textSecondary} />
                <Text style={[styles.evidenceAddText, { color: theme.colors.textSecondary }]}>Add photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* What happens next */}
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>What happens next?</Text>
            {[
              { icon: 'shield-checkmark-outline', text: 'Payment stays in escrow — no one receives funds until resolved' },
              { icon: 'mail-outline', text: `${otherPartyName} will be notified and given a chance to respond` },
              { icon: 'people-outline', text: 'Our team reviews within 48 hours and makes a fair decision' },
              { icon: 'cash-outline', text: 'Funds are released or refunded based on the outcome' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Ionicons name={item.icon as any} size={16} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!canSubmit || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Raise Dispute</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { ...Typography.headerMedium },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  warningTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  warningDesc: { fontSize: 12, lineHeight: 17 },
  contextCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  contextLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  contextValue: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  reasonsList: { gap: 8, marginBottom: 20 },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  reasonText: { flex: 1, fontSize: 13, fontWeight: '500' },
  textInputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  textInput: {
    fontSize: 13,
    lineHeight: 20,
    minHeight: 100,
    marginBottom: 6,
  },
  charCount: { fontSize: 11, textAlign: 'right' },
  evidenceRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  evidenceThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImage: { width: '100%', height: '100%' },
  evidenceRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceAddBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  evidenceAddText: { fontSize: 10, fontWeight: '500' },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  submitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
