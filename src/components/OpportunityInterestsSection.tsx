import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';
import AcceptInterestModal from './AcceptInterestModal';

interface Interest {
  id: string;
  opportunity_id: string;
  interested_user_id: string;
  reason: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  opportunity: {
    id: string;
    title: string;
  };
  interested_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
    location: string | null;
  };
}

const REASON_LABELS: Record<string, string> = {
  perfect_fit: 'Perfect Fit',
  interested: 'Very Interested',
  learn_more: 'Want Details',
  available: 'Available Now',
};

export default function OpportunityInterestsSection() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual database query
      // const { data, error } = await supabase
      //   .from('opportunity_interests')
      //   .select(`
      //     *,
      //     opportunity:opportunities(id, title),
      //     interested_user:profiles!interested_user_id(*)
      //   `)
      //   .eq('poster_user_id', user?.id)
      //   .eq('status', 'pending')
      //   .order('created_at', { ascending: false });

      // Mock data for now
      setInterests([]);
    } catch (error) {
      console.error('Failed to load interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CreatorProfile' as never, { creatorId: userId } as never);
  };

  const handleReject = (interest: Interest) => {
    Alert.alert(
      'Reject Interest',
      `Reject ${interest.interested_user.display_name}'s interest in "${interest.opportunity.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // TODO: Implement database update
              // await supabase
              //   .from('opportunity_interests')
              //   .update({
              //     status: 'rejected',
              //     rejected_at: new Date().toISOString(),
              //   })
              //   .eq('id', interest.id);

              // TODO: Send automated rejection message

              // Remove from list
              setInterests(prev => prev.filter(i => i.id !== interest.id));

              Alert.alert('Rejected', 'The interest has been rejected and the user has been notified.');
            } catch (error) {
              console.error('Failed to reject interest:', error);
              Alert.alert('Error', 'Failed to reject interest. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAccept = (interest: Interest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedInterest(interest);
    setAcceptModalVisible(true);
  };

  const handleSubmitAcceptance = async (customMessage: string) => {
    if (!selectedInterest) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // TODO: Implement database update
      // await supabase
      //   .from('opportunity_interests')
      //   .update({
      //     status: 'accepted',
      //     accepted_at: new Date().toISOString(),
      //     custom_message: customMessage,
      //   })
      //   .eq('id', selectedInterest.id);

      // TODO: Send custom acceptance message to user's Messages

      // TODO: Send push notification

      // Remove from pending list
      setInterests(prev => prev.filter(i => i.id !== selectedInterest.id));

      setAcceptModalVisible(false);
      setSelectedInterest(null);

      Alert.alert(
        'Interest Accepted! 🎉',
        'Your message has been sent. You can continue the conversation in Messages.',
        [
          { text: 'OK' },
          {
            text: 'Open Messages',
            onPress: () => navigation.navigate('Messages' as never),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to accept interest:', error);
      Alert.alert('Error', 'Failed to accept interest. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Opportunity Interests
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (interests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Opportunity Interests
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>0</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No pending interests
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            When someone expresses interest in your opportunities, they'll appear here
          </Text>
        </View>
      </View>
    );
  }

  // Group interests by opportunity
  const groupedInterests = interests.reduce((acc, interest) => {
    const oppId = interest.opportunity_id;
    if (!acc[oppId]) {
      acc[oppId] = {
        opportunity: interest.opportunity,
        interests: [],
      };
    }
    acc[oppId].interests.push(interest);
    return acc;
  }, {} as Record<string, { opportunity: { id: string; title: string }; interests: Interest[] }>);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Opportunity Interests
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.badgeText}>{interests.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedInterests).map(([oppId, group]) => (
          <View key={oppId} style={styles.opportunityGroup}>
            <Text style={[styles.opportunityTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {group.opportunity.title}
            </Text>

            {group.interests.map((interest) => (
              <View
                key={interest.id}
                style={[
                  styles.interestCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* User Info */}
                <View style={styles.userInfo}>
                  <TouchableOpacity
                    onPress={() => handleViewProfile(interest.interested_user_id)}
                    style={styles.userHeader}
                  >
                    {interest.interested_user.avatar_url ? (
                      <Image
                        source={{ uri: interest.interested_user.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: theme.colors.card }]}>
                        <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: theme.colors.text }]}>
                        {interest.interested_user.display_name}
                      </Text>
                      {interest.interested_user.headline && (
                        <Text style={[styles.userHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {interest.interested_user.headline}
                        </Text>
                      )}
                      {interest.interested_user.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.userLocation, { color: theme.colors.textSecondary }]}>
                            {interest.interested_user.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Reason Badge */}
                  <View style={[styles.reasonBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.reasonText, { color: theme.colors.primary }]}>
                      {REASON_LABELS[interest.reason]}
                    </Text>
                  </View>
                </View>

                {/* Message */}
                {interest.message && (
                  <View style={[styles.messageBox, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.messageText, { color: theme.colors.text }]}>
                      "{interest.message}"
                    </Text>
                  </View>
                )}

                {/* Timestamp */}
                <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                  {getRelativeTime(interest.created_at)}
                </Text>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.colors.border }]}
                    onPress={() => handleViewProfile(interest.interested_user_id)}
                  >
                    <Ionicons name="person-outline" size={16} color={theme.colors.text} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                      View Profile
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.colors.error }]}
                    onPress={() => handleReject(interest)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={theme.colors.error} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                      Reject
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleAccept(interest)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Accept Interest Modal */}
      {selectedInterest && (
        <AcceptInterestModal
          visible={acceptModalVisible}
          interest={selectedInterest}
          onClose={() => {
            setAcceptModalVisible(false);
            setSelectedInterest(null);
          }}
          onSubmit={handleSubmitAcceptance}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  scrollView: {
    maxHeight: 600,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  opportunityGroup: {
    marginBottom: 24,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  interestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHeadline: {
    fontSize: 13,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userLocation: {
    fontSize: 12,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
