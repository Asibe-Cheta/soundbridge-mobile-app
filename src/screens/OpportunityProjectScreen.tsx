import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import VerifiedAvatar from '../components/VerifiedAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { opportunityService, OpportunityProject } from '../services/OpportunityService';
import { gigRatingService } from '../services/GigRatingService';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import * as Haptics from 'expo-haptics';

type RouteParams = {
  OpportunityProject: { projectId: string };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  payment_pending:     { label: 'Processing Payment',  color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: 'card-outline' },
  awaiting_acceptance: { label: 'Awaiting Provider Acceptance', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)', icon: 'time-outline' },
  active:              { label: 'Active — In Progress', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: 'play-circle-outline' },
  delivered:           { label: 'Delivered — Awaiting Confirmation', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)', icon: 'checkmark-circle-outline' },
  completed:           { label: 'Completed',           color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: 'checkmark-done-circle' },
  disputed:            { label: 'Under Dispute',       color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: 'alert-circle-outline' },
  cancelled:           { label: 'Cancelled',           color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: 'close-circle-outline' },
  declined:            { label: 'Declined',            color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: 'close-circle-outline' },
};

// 48-hour auto-release: format remaining time from deliveredAt timestamp
function useAutoReleaseCountdown(deliveredAt: string | undefined): string | null {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveredAt) return;

    const releaseAt = new Date(deliveredAt).getTime() + 48 * 60 * 60 * 1000;

    const update = () => {
      const now = Date.now();
      const diff = releaseAt - now;
      if (diff <= 0) {
        setTimeLeft('Auto-releasing now...');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deliveredAt]);

  return timeLeft;
}

export default function OpportunityProjectScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OpportunityProject'>>();
  const { projectId } = route.params;
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [project, setProject] = useState<OpportunityProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const autoReleaseCountdown = useAutoReleaseCountdown(
    project?.status === 'delivered' ? project.delivered_at : undefined
  );

  const loadProject = useCallback(async () => {
    try {
      let data = await opportunityService.getProject(projectId);

      // If the project is still payment_pending but we (the poster) already paid,
      // silently call confirm-payment — the backend will verify with Stripe and
      // advance the status if the PaymentIntent is already authorized.
      if (data.status === 'payment_pending' && data.poster_user_id === user?.id) {
        try {
          data = await opportunityService.confirmPayment(projectId);
        } catch {
          // Payment genuinely not yet made — leave as payment_pending so the
          // "Complete Payment" button stays visible.
        }
      }

      setProject(data);
      if (data.status === 'completed') {
        const rated = await gigRatingService.hasRatedProject(projectId);
        setHasRated(rated);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProject();
    }, [loadProject])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProject();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!project) return null;

  const isPoster = project.poster_user_id === user?.id;
  const isCreator = project.creator_user_id === user?.id;
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  // 24-hour warning: delivered_at within last 48h but more than 24h ago means confirmation window is closing
  const showConfirmationUrgent =
    isPoster &&
    project.status === 'delivered' &&
    project.delivered_at &&
    Date.now() - new Date(project.delivered_at).getTime() > 24 * 60 * 60 * 1000;

  const handleCompletePayment = async () => {
    if (!project) return;
    setPaymentLoading(true);
    try {
      let clientSecret = project.stripe_client_secret;
      let customerId: string | undefined;
      let customerEphemeralKeySecret: string | undefined;

      if (!clientSecret) {
        // Ask backend for a fresh/existing client_secret
        const result = await opportunityService.retryPayment(projectId);
        clientSecret = result.client_secret;
        customerId = result.customer_id;
        customerEphemeralKeySecret = result.ephemeral_key_secret;
      }

      if (!clientSecret) {
        Alert.alert('Payment Error', 'Could not initialise payment. Please contact support.');
        return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'SoundBridge',
        paymentIntentClientSecret: clientSecret,
        ...(customerId && customerEphemeralKeySecret
          ? { customerId, customerEphemeralKeySecret }
          : {}),
        defaultBillingDetails: {
          name: user?.display_name || user?.email || undefined,
          email: user?.email || undefined,
        },
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        return;
      }

      // Payment sheet succeeded — immediately call backend to confirm the payment.
      // This is belt-and-suspenders alongside the Stripe webhook:
      // webhook: payment_intent.amount_capturable_updated → backend updates DB + notifies provider
      // this call: ensures the update happens even if the webhook is delayed or missed
      try {
        const confirmed = await opportunityService.confirmPayment(projectId);
        setProject(confirmed);
      } catch {
        // Webhook will handle it; optimistically advance so UI doesn't re-show "Complete Payment"
        setProject(prev =>
          prev ? { ...prev, status: 'awaiting_acceptance', stripe_client_secret: undefined } : prev
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Payment Secured!',
        `${project.currency} ${(project.agreed_amount ?? 0).toFixed(2)} is now in escrow. ${project.other_party?.display_name || 'The provider'} will be notified to review and accept the agreement.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAcceptAgreement = async () => {
    Alert.alert(
      'Accept Project Agreement',
      `Accept and start this project?\n\nAgreed amount: ${project.currency} ${(project.agreed_amount ?? 0).toFixed(2)}\nPlatform fee (${project.platform_fee_percent}%): − ${project.currency} ${(project.platform_fee_amount ?? 0).toFixed(2)}\nYou receive: ${project.currency} ${(project.creator_payout_amount ?? 0).toFixed(2)}\n\nPayment is held in escrow — funds release when you deliver and the client confirms.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Start',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await opportunityService.acceptAgreement(projectId);
              // Merge so financial fields (agreed_amount, creator_payout_amount, etc.)
              // are preserved if the accept-agreement response omits them.
              setProject(prev => prev ? { ...prev, ...updated } : updated);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Project Active!', 'The project is now active. Get to work and mark it delivered when done.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept agreement.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineAgreement = async () => {
    Alert.alert(
      'Decline Agreement',
      'Are you sure you want to decline this project agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await opportunityService.declineAgreement(projectId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline agreement.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkDelivered = async () => {
    Alert.alert(
      'Mark as Delivered',
      'Confirm that you have delivered all agreed work? The poster will be asked to confirm and release payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          onPress: async () => {
            try {
              setActionLoading(true);
              await opportunityService.markDelivered(projectId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadProject();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark as delivered.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmDelivery = async () => {
    Alert.alert(
      'Confirm Delivery',
      `Confirm delivery and release ${project.currency} ${(project.creator_payout_amount ?? 0).toFixed(2)} to ${project.other_party?.display_name || 'the provider'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Release',
          onPress: async () => {
            try {
              setActionLoading(true);
              await opportunityService.confirmDelivery(projectId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadProject();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to confirm delivery.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDispute = () => {
    navigation.navigate('DisputeDetail', {
      projectId,
      projectTitle: project.title,
      otherPartyName: project.other_party?.display_name || 'the other party',
      agreedAmount: project.agreed_amount,
      currency: project.currency,
    });
  };

  const handleLeaveRating = () => {
    navigation.navigate('PostGigRating', {
      projectId,
      rateeId: isPoster ? project.creator_user_id : project.poster_user_id,
      rateeName: project.other_party?.display_name || 'the other party',
      rateeAvatar: project.other_party?.avatar_url,
      isPoster,
      projectTitle: project.title,
    });
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Project</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {/* 24-hour urgent reminder for poster */}
          {showConfirmationUrgent && (
            <View style={[styles.urgentBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={[styles.urgentBannerText, { color: theme.colors.text }]}>
                ⚠️ Reminder: Please confirm or dispute this delivery. Payment auto-releases in {autoReleaseCountdown || '...'}.
              </Text>
            </View>
          )}

          {/* Escrow/status banners */}
          {project.status === 'payment_pending' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="card-outline" size={18} color="#F59E0B" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                {isPoster
                  ? 'Payment not yet completed. Tap "Complete Payment" below to secure the project in escrow and notify the provider.'
                  : 'Waiting for the client to complete payment. You\'ll see an action button here once it clears.'}
              </Text>
            </View>
          )}
          {project.status === 'awaiting_acceptance' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="lock-closed" size={18} color="#7C3AED" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                🔒 {project.currency} {(project.agreed_amount ?? 0).toFixed(2)} is in escrow — waiting for {isCreator ? 'you to accept' : `${project.other_party?.display_name || 'the provider'} to accept`} the agreement.
              </Text>
            </View>
          )}
          {project.status === 'active' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(5, 150, 105, 0.1)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="lock-closed" size={18} color="#059669" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                🔒 SoundBridge Escrow Active — {project.currency} {(project.agreed_amount ?? 0).toFixed(2)} held securely. Funds release on delivery confirmation.
              </Text>
            </View>
          )}
          {project.status === 'delivered' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                Work has been marked as delivered. Review and confirm to release payment.
              </Text>
            </View>
          )}
          {project.status === 'completed' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(5, 150, 105, 0.08)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                ✅ Project Complete — Payment released to provider's wallet.
              </Text>
            </View>
          )}
          {project.status === 'disputed' && (
            <View style={[styles.escrowBanner, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={[styles.escrowBannerText, { color: theme.colors.text }]}>
                🔒 Dispute in progress — funds held in escrow. Our team will review within 48 hours.
              </Text>
            </View>
          )}

          {/* 48h auto-release countdown (for poster, delivered state, first 24h) */}
          {isPoster && project.status === 'delivered' && autoReleaseCountdown && !showConfirmationUrgent && (
            <View style={[styles.countdownBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="hourglass-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.countdownText, { color: theme.colors.textSecondary }]}>
                Auto-release in: <Text style={{ fontFamily: Typography.body.fontFamily, fontWeight: '600', letterSpacing: -0.4, color: theme.colors.text }}>{autoReleaseCountdown}</Text>
              </Text>
            </View>
          )}

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>

          {/* Opportunity title */}
          {project.opportunity && (
            <Text style={[styles.opportunityTitle, { color: theme.colors.textSecondary }]}>
              {project.opportunity.title}
            </Text>
          )}

          {/* Project title */}
          <Text style={[styles.projectTitle, { color: theme.colors.text }]}>{project.title}</Text>

          {/* Other party */}
          {project.other_party && (
            <TouchableOpacity
              style={[styles.partyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() =>
                navigation.navigate('CreatorProfile', {
                  creatorId: project.other_party!.id,
                })
              }
            >
              <VerifiedAvatar
                avatarUrl={project.other_party.avatar_url}
                isVerified={project.other_party.is_verified}
                size={44}
                fallbackIconSize={18}
                marginRight={12}
              />
              <View style={styles.partyInfo}>
                <Text style={[styles.partyRole, { color: theme.colors.textSecondary }]}>
                  {isPoster ? 'Provider' : 'Poster'}
                </Text>
                <Text style={[styles.partyName, { color: theme.colors.text }]}>
                  {project.other_party.display_name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Financial breakdown */}
          <View style={[styles.financialCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.financialTitle, { color: theme.colors.text }]}>Payment Breakdown</Text>
            <Text style={[styles.financialSubtitle, { color: theme.colors.textSecondary }]}>
              Platform fee covers escrow protection, dispute resolution, and payment processing.
            </Text>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>Agreed amount</Text>
              <Text style={[styles.financialValue, { color: theme.colors.text }]}>
                {project.currency} {(project.agreed_amount ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.colors.textSecondary }]}>
                Platform fee ({project.platform_fee_percent}%)
              </Text>
              <Text style={[styles.financialValue, { color: theme.colors.textSecondary }]}>
                − {project.currency} {(project.platform_fee_amount ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.financialDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.colors.text, fontWeight: '700' }]}>
                {isCreator ? 'You receive' : 'Provider receives'}
              </Text>
              <Text style={[styles.financialValue, { color: '#059669', fontWeight: '700' }]}>
                {project.currency} {(project.creator_payout_amount ?? 0).toFixed(2)}
              </Text>
            </View>

            {/* View in wallet link (completed + creator) */}
            {project.status === 'completed' && isCreator && (
              <TouchableOpacity
                style={styles.walletLink}
                onPress={() => navigation.navigate('Wallet' as never)}
              >
                <Ionicons name="wallet-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.walletLinkText, { color: theme.colors.primary }]}>
                  View in Wallet
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Brief */}
          <View style={[styles.briefCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.briefTitle, { color: theme.colors.text }]}>Project Brief</Text>
            <Text style={[styles.briefText, { color: theme.colors.textSecondary }]}>{project.brief}</Text>
            {project.deadline && (
              <View style={styles.deadlineRow}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.deadlineText, { color: theme.colors.textSecondary }]}>
                  Deadline: {project.deadline}
                </Text>
              </View>
            )}
          </View>

          {/* Rating prompt (completed, not yet rated) */}
          {project.status === 'completed' && !hasRated && (
            <TouchableOpacity
              style={[styles.ratingPromptCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
              onPress={handleLeaveRating}
            >
              <BlurView intensity={15} style={StyleSheet.absoluteFillObject} />
              <View style={styles.ratingPromptContent}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star-outline" size={18} color="#F59E0B" />
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ratingPromptTitle, { color: theme.colors.text }]}>
                    Leave a Verified Review
                  </Text>
                  <Text style={[styles.ratingPromptDesc, { color: theme.colors.textSecondary }]}>
                    Rate {project.other_party?.display_name || 'your collaborator'} and build trust in the community.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
              </View>
            </TouchableOpacity>
          )}

          {/* Rated confirmation */}
          {project.status === 'completed' && hasRated && (
            <View style={[styles.ratedBadge, { backgroundColor: 'rgba(5, 150, 105, 0.08)', borderColor: 'rgba(5, 150, 105, 0.25)' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={[styles.ratedText, { color: '#059669' }]}>You've left a verified review for this project.</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Poster: complete pending payment */}
            {isPoster && project.status === 'payment_pending' && (
              <TouchableOpacity
                style={[styles.actionBtn, (actionLoading || paymentLoading) && styles.actionBtnDisabled]}
                onPress={handleCompletePayment}
                disabled={actionLoading || paymentLoading}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtnGradient}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Complete Payment</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Creator: payment still processing — hold message */}
            {isCreator && project.status === 'payment_pending' && (
              <View style={[styles.holdingCard, { backgroundColor: theme.colors.card, borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.holdingTitle, { color: theme.colors.text }]}>
                    Payment confirming — almost there
                  </Text>
                  <Text style={[styles.holdingDesc, { color: theme.colors.textSecondary }]}>
                    The client's payment is being verified. Once it clears, you'll see an "Accept & Start" button here. Pull down to refresh.
                  </Text>
                </View>
              </View>
            )}

            {/* Creator: accept or decline agreement */}
            {isCreator && project.status === 'awaiting_acceptance' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
                  onPress={handleAcceptAgreement}
                  disabled={actionLoading}
                >
                  <LinearGradient
                    colors={['#059669', '#047857']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Accept Agreement</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnOutline, { borderColor: 'rgba(239, 68, 68, 0.4)' }, actionLoading && styles.actionBtnDisabled]}
                  onPress={handleDeclineAgreement}
                  disabled={actionLoading}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: '#EF4444' }]}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Creator: mark delivered */}
            {isCreator && project.status === 'active' && (
              <TouchableOpacity
                style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
                onPress={handleMarkDelivered}
                disabled={actionLoading}
              >
                <LinearGradient
                  colors={['#7C3AED', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtnGradient}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Mark as Delivered</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Poster: confirm delivery + dispute */}
            {isPoster && project.status === 'delivered' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
                  onPress={handleConfirmDelivery}
                  disabled={actionLoading}
                >
                  <LinearGradient
                    colors={['#059669', '#047857']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Confirm Delivery & Release Payment</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnOutline, { borderColor: 'rgba(239, 68, 68, 0.4)' }, actionLoading && styles.actionBtnDisabled]}
                  onPress={handleDispute}
                  disabled={actionLoading}
                >
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={[styles.actionBtnOutlineText, { color: '#EF4444' }]}>Raise a Dispute</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Poster: dispute active project */}
            {project.status === 'active' && isPoster && (
              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: 'rgba(239, 68, 68, 0.3)' }, actionLoading && styles.actionBtnDisabled]}
                onPress={handleDispute}
                disabled={actionLoading}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={[styles.actionBtnOutlineText, { color: '#EF4444' }]}>Raise a Dispute</Text>
              </TouchableOpacity>
            )}

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: Typography.body.fontFamily, fontSize: 18, fontWeight: '600', letterSpacing: -0.4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    overflow: 'hidden',
  },
  urgentBannerText: { fontFamily: Typography.body.fontFamily, flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '300', letterSpacing: -0.4 },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    overflow: 'hidden',
  },
  escrowBannerText: { fontFamily: Typography.body.fontFamily, flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '300', letterSpacing: -0.4 },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
  },
  countdownText: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  statusLabel: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
  opportunityTitle: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300', letterSpacing: -0.4, marginBottom: 4 },
  projectTitle: { fontFamily: Typography.body.fontFamily, fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginBottom: 16, lineHeight: 26 },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  partyAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, overflow: 'hidden' },
  partyInfo: { flex: 1 },
  partyRole: { fontFamily: Typography.body.fontFamily, fontSize: 11, textTransform: 'uppercase', fontWeight: '300', letterSpacing: -0.4, marginBottom: 2 },
  partyName: { fontFamily: Typography.body.fontFamily, fontSize: 15, fontWeight: '600', letterSpacing: -0.4 },
  financialCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  financialTitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.4, marginBottom: 4 },
  financialSubtitle: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '300', letterSpacing: -0.2, marginBottom: 12, lineHeight: 16 },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  financialLabel: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
  financialValue: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '300', letterSpacing: -0.4 },
  financialDivider: { height: 1, marginVertical: 8 },
  walletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  walletLinkText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4, flex: 1 },
  briefCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  briefTitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.4, marginBottom: 8 },
  briefText: { fontFamily: Typography.body.fontFamily, fontSize: 13, lineHeight: 20, fontWeight: '300', letterSpacing: -0.4, marginBottom: 8 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  deadlineText: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 },
  ratingPromptCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  ratingPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingPromptTitle: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '600', letterSpacing: -0.4, marginBottom: 2 },
  ratingPromptDesc: { fontFamily: Typography.body.fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '300', letterSpacing: -0.4 },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  ratedText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  holdingTitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.4, marginBottom: 4 },
  holdingDesc: { fontFamily: Typography.body.fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '300', letterSpacing: -0.4 },
  actions: { gap: 10 },
  actionBtn: { borderRadius: 14, overflow: 'hidden' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: { fontFamily: Typography.body.fontFamily, color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: -0.4 },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnOutlineText: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '300', letterSpacing: -0.4 },
});
