import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import VerifiedAvatar from '../components/VerifiedAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { opportunityService, OpportunityInterest } from '../services/OpportunityService';
import ProjectAgreementModal from '../components/ProjectAgreementModal';
import { getRelativeTime } from '../utils/collaborationUtils';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import * as Haptics from 'expo-haptics';

type RouteParams = {
  OpportunityInterestList: {
    opportunityId: string;
    opportunityTitle: string;
  };
};

const REASON_LABELS: Record<string, string> = {
  perfect_fit: '✦ Perfect Fit',
  interested: '★ Very Interested',
  learn_more: 'ℹ Want Details',
  available: '⏱ Available Now',
};

export default function OpportunityInterestListScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'OpportunityInterestList'>>();
  const { opportunityId, opportunityTitle } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [interests, setInterests] = useState<OpportunityInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Project Agreement Modal
  const [agreementModalVisible, setAgreementModalVisible] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<OpportunityInterest | null>(null);

  const loadInterests = useCallback(async () => {
    try {
      const items = await opportunityService.getInterests(opportunityId);
      setInterests(items);
    } catch (error) {
      console.error('Failed to load interests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInterests();
  };

  const handleAcceptAndCreate = (interest: OpportunityInterest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedInterest(interest);
    setAgreementModalVisible(true);
  };

  const handleSubmitAgreement = async (data: {
    agreed_amount: number;
    currency: string;
    deadline?: string;
    brief: string;
  }) => {
    if (!selectedInterest) return;

    const creatorName = selectedInterest.user.display_name;

    let project: any;
    let client_secret: string;
    let customer_id: string | undefined;
    let ephemeral_key_secret: string | undefined;

    // Step 1: Create project and get Stripe client_secret
    try {
      const result = await opportunityService.acceptInterestAndCreateProject(
        opportunityId,
        selectedInterest.id,
        data
      );
      project = result.project;
      client_secret = result.client_secret;
      customer_id = result.customer_id;
      ephemeral_key_secret = result.ephemeral_key_secret;
    } catch (err: any) {
      const status = err?.status;
      const bodyError: string = err?.body?.error || err?.body?.message || err?.message || '';
      if (status === 409 || bodyError.toLowerCase().includes('already') || bodyError.toLowerCase().includes('exists')) {
        Alert.alert(
          'Project Already Created',
          'A project agreement was already sent for this applicant but payment was not completed. Please contact support to resolve the pending project.'
        );
      } else if (bodyError.toLowerCase().includes('stripe') || bodyError.toLowerCase().includes('payment')) {
        Alert.alert('Payment Setup Failed', 'Could not initialise payment. Please try again or contact support.');
      } else {
        Alert.alert('Error', 'Failed to create project agreement. Please try again.');
        console.error('[handleSubmitAgreement] Step 1 failed:', err);
      }
      return;
    }

    // Step 2: Validate client_secret before presenting payment
    console.log('[handleSubmitAgreement] API result - project:', project?.id, 'client_secret present:', !!client_secret, 'client_secret value:', client_secret ? `${client_secret.substring(0, 20)}...` : 'MISSING');

    if (!client_secret) {
      // Payment setup failed — project exists but poster must complete payment before creator is notified.
      // No "Later" or "OK" — they must go to the project screen to pay.
      setAgreementModalVisible(false);
      setSelectedInterest(null);
      Alert.alert(
        'Payment Required',
        'Your agreement was saved but payment setup failed. You must complete payment before the creator is notified.',
        [
          {
            text: 'Complete Payment',
            onPress: () => {
              if (project?.id) {
                navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never);
              }
            },
          },
        ],
        { cancelable: false }
      );
      loadInterests();
      return;
    }

    // Step 3: Close agreement modal before presenting payment sheet
    setAgreementModalVisible(false);
    setSelectedInterest(null);

    // Step 4: Initialise Stripe payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'SoundBridge',
      paymentIntentClientSecret: client_secret,
      ...(customer_id && ephemeral_key_secret
        ? { customerId: customer_id, customerEphemeralKeySecret: ephemeral_key_secret }
        : {}),
      defaultBillingDetails: {
        name: user?.display_name || user?.email || undefined,
        email: user?.email || undefined,
      },
    });

    if (initError) {
      console.error('[handleSubmitAgreement] initPaymentSheet error:', initError);
      Alert.alert('Payment Error', initError.message);
      return;
    }

    // Step 5: Present payment sheet — poster pays now
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      if (presentError.code === 'Canceled') {
        // Payment sheet dismissed — poster must pay before creator sees anything.
        Alert.alert(
          'Payment Required to Proceed',
          'Payment must be completed to send the agreement. The creator is not notified until funds are secured.',
          [
            {
              text: 'Complete Payment',
              onPress: () => {
                navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never);
              },
            },
          ],
          { cancelable: false }
        );
        loadInterests();
      } else {
        Alert.alert('Payment Failed', presentError.message);
      }
      return;
    }

    // Step 6: Payment succeeded — Stripe webhook will notify creator
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      'Payment Secured',
      `${creatorName} will be notified once payment clears. Funds are held in escrow until you confirm delivery.`,
      [
        {
          text: 'View Project',
          onPress: () => {
            navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never);
          },
        },
      ],
      { cancelable: false }
    );

    loadInterests();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderInterest = ({ item }: { item: OpportunityInterest }) => {
    const isAccepted = item.status === 'accepted';
    const isDeclined = item.status === 'declined';

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: isAccepted ? 'rgba(124, 58, 237, 0.4)' : theme.colors.border,
            opacity: isDeclined ? 0.5 : 1,
          },
        ]}
      >
        {/* User info */}
        <View style={styles.userRow}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CreatorProfile' as never, { creatorId: item.user.id } as never)
            }
          >
            <VerifiedAvatar
              avatarUrl={item.user.avatar_url}
              isVerified={item.user.is_verified}
              size={44}
              fallbackIconSize={20}
              marginRight={12}
            />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CreatorProfile' as never, { creatorId: item.user.id } as never)
              }
            >
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {item.user.display_name}
              </Text>
            </TouchableOpacity>
            {item.user.headline && (
              <Text style={[styles.userHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.user.headline}
              </Text>
            )}
            <Text style={[styles.timeAgo, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(item.created_at)}
            </Text>
          </View>

          {/* Status badge */}
          {isAccepted && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
              <Text style={[styles.statusText, { color: '#7C3AED' }]}>Accepted</Text>
            </View>
          )}
          {isDeclined && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(107, 114, 128, 0.12)' }]}>
              <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Declined</Text>
            </View>
          )}
        </View>

        {/* Reason */}
        <View style={[styles.reasonTag, { backgroundColor: 'rgba(124, 58, 237, 0.08)' }]}>
          <Text style={[styles.reasonText, { color: '#7C3AED' }]}>
            {REASON_LABELS[item.reason] || item.reason}
          </Text>
        </View>

        {/* Message */}
        {item.message && (
          <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            "{item.message}"
          </Text>
        )}

        {/* Action buttons */}
        {!isAccepted && !isDeclined && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptAndCreate(item)}
          >
            <LinearGradient
              colors={['#EC4899', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.acceptGradient}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept & Create Project</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isAccepted && (
          <TouchableOpacity
            style={[styles.viewProjectButton, { borderColor: '#7C3AED' }]}
            onPress={() =>
              navigation.navigate('Messages' as never)
            }
          >
            <Ionicons name="chatbubble-outline" size={15} color="#7C3AED" />
            <Text style={[styles.viewProjectText, { color: '#7C3AED' }]}>View in Messages</Text>
          </TouchableOpacity>
        )}
      </View>
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
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Expressions of Interest</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {opportunityTitle}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {interests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="hand-left-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No interests yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              When creators express interest in your opportunity, they'll appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={interests}
            keyExtractor={(item) => item.id}
            renderItem={renderInterest}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>

      <ProjectAgreementModal
        visible={agreementModalVisible}
        opportunityTitle={opportunityTitle}
        creatorName={selectedInterest?.user.display_name || ''}
        onClose={() => {
          setAgreementModalVisible(false);
          setSelectedInterest(null);
        }}
        onSubmit={handleSubmitAgreement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...Typography.headerMedium },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  listContent: { padding: 16, paddingBottom: 80 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { ...Typography.headerMedium, marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { ...Typography.body, textAlign: 'center' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  userHeadline: { fontSize: 12, marginBottom: 2 },
  timeAgo: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  reasonTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  reasonText: { fontSize: 12, fontWeight: '600' },
  message: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginBottom: 12 },
  acceptButton: { alignSelf: 'flex-start', borderRadius: 24, overflow: 'hidden', marginTop: 4 },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  acceptButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  viewProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  viewProjectText: { fontSize: 13, fontWeight: '600' },
});
