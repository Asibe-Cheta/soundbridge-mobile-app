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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { gigRatingService } from '../services/GigRatingService';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';

type RouteParams = {
  PostGigRating: {
    projectId: string;
    rateeId: string;
    rateeName: string;
    rateeAvatar?: string;
    isPoster: boolean;      // true = poster rating creator, false = creator rating poster
    projectTitle: string;
  };
};

interface StarRatingProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}

function StarRating({ label, description, value, onChange }: StarRatingProps) {
  const { theme } = useTheme();
  return (
    <View style={starStyles.container}>
      <View style={starStyles.labelRow}>
        <Text style={[starStyles.label, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[starStyles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>
      <View style={starStyles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              onChange(star);
              Haptics.selectionAsync();
            }}
            style={starStyles.starBtn}
          >
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={32}
              color={star <= value ? '#F59E0B' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
        {value > 0 && (
          <Text style={[starStyles.valueLabel, { color: '#F59E0B' }]}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
          </Text>
        )}
      </View>
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  labelRow: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  description: { fontSize: 12 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starBtn: { padding: 2 },
  valueLabel: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
});

export default function PostGigRatingScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PostGigRating'>>();
  const { projectId, rateeId, rateeName, rateeAvatar, isPoster, projectTitle } = route.params;

  const [overall, setOverall] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);           // poster rates creator
  const [paymentPromptness, setPaymentPromptness] = useState(0); // creator rates poster
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requiredFilled = overall > 0 && professionalism > 0 && punctuality > 0 &&
    (isPoster ? quality > 0 : paymentPromptness > 0);

  const handleSubmit = async () => {
    if (!requiredFilled) return;

    try {
      setSubmitting(true);
      await gigRatingService.submitRating(projectId, {
        ratee_id: rateeId,
        overall_rating: overall,
        professionalism_rating: professionalism,
        punctuality_rating: punctuality,
        ...(isPoster ? { quality_rating: quality } : { payment_promptness_rating: paymentPromptness }),
        review_text: reviewText.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Rating Submitted',
        `Thank you for rating ${rateeName}. Verified reviews help build trust in our community.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Leave a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ratee profile card */}
          <View style={[styles.rateeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {rateeAvatar ? (
              <Image source={{ uri: rateeAvatar }} style={styles.rateeAvatar} />
            ) : (
              <View style={[styles.rateeAvatar, { backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={22} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.rateeLabel, { color: theme.colors.textSecondary }]}>
                {isPoster ? 'Provider' : 'Client'}
              </Text>
              <Text style={[styles.rateeName, { color: theme.colors.text }]}>{rateeName}</Text>
              <Text style={[styles.projectName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {projectTitle}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          {/* Star ratings */}
          <View style={[styles.ratingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <StarRating
              label="Overall Experience"
              description="Your general satisfaction with this collaboration"
              value={overall}
              onChange={setOverall}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <StarRating
              label="Professionalism"
              description="Communication quality and professional conduct"
              value={professionalism}
              onChange={setProfessionalism}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <StarRating
              label="Punctuality"
              description="Timeliness and respect for agreed schedules"
              value={punctuality}
              onChange={setPunctuality}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {isPoster ? (
              <StarRating
                label="Quality of Work"
                description="How closely the delivered work matched the brief"
                value={quality}
                onChange={setQuality}
              />
            ) : (
              <StarRating
                label="Payment Promptness"
                description="How quickly and smoothly payment was processed"
                value={paymentPromptness}
                onChange={setPaymentPromptness}
              />
            )}
          </View>

          {/* Written review */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Written Review
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '400' }}> (optional)</Text>
          </Text>
          <View style={[styles.reviewInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.reviewText, { color: theme.colors.text }]}
              placeholder={`Share your experience working with ${rateeName}...`}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />
          </View>

          {/* Trust notice */}
          <View style={[styles.noticeRow, { backgroundColor: 'rgba(5, 150, 105, 0.06)', borderColor: 'rgba(5, 150, 105, 0.2)' }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
              This is a <Text style={{ color: '#059669', fontWeight: '700' }}>Verified Review</Text> — only posted after a completed, paid project. It builds real trust in the SoundBridge community.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!requiredFilled || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!requiredFilled || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Review</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {!requiredFilled && (
            <Text style={[styles.requiredHint, { color: theme.colors.textSecondary }]}>
              Please rate all required fields (Overall, Professionalism, Punctuality, and {isPoster ? 'Quality' : 'Payment Promptness'}) before submitting.
            </Text>
          )}
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
  rateeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  rateeAvatar: { width: 50, height: 50, borderRadius: 25 },
  rateeLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rateeName: { fontSize: 16, fontWeight: '700' },
  projectName: { fontSize: 12, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  ratingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  divider: { height: 1, marginVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  reviewInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 20,
    minHeight: 80,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  submitBtnDisabled: { opacity: 0.45 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  requiredHint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
