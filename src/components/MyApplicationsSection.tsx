import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface Application {
  id: string;
  opportunity_id: string;
  poster_user_id: string;
  reason: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  custom_message: string | null;
  opportunity: {
    id: string;
    title: string;
    type: 'collaboration' | 'event' | 'job';
    location: string | null;
  };
  poster: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

type TabType = 'pending' | 'accepted' | 'rejected';

const REASON_LABELS: Record<string, string> = {
  perfect_fit: 'Perfect Fit',
  interested: 'Very Interested',
  learn_more: 'Want Details',
  available: 'Available Now',
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    icon: 'time' as const,
    message: 'Waiting for response',
  },
  accepted: {
    label: 'Accepted',
    color: '#10B981',
    icon: 'checkmark-circle' as const,
    message: 'Your interest was accepted!',
  },
  rejected: {
    label: 'Not Selected',
    color: '#6B7280',
    icon: 'close-circle' as const,
    message: 'They went with another applicant',
  },
};

export default function MyApplicationsSection() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual database query
      // const { data, error } = await supabase
      //   .from('opportunity_interests')
      //   .select(`
      //     *,
      //     opportunity:opportunities(id, title, type, location),
      //     poster:profiles!poster_user_id(id, username, display_name, avatar_url)
      //   `)
      //   .eq('interested_user_id', user?.id)
      //   .order('created_at', { ascending: false });

      // Mock data for now
      setApplications([]);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleViewOpportunity = (opportunityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to opportunity detail screen
    console.log('View opportunity:', opportunityId);
  };

  const handleOpenMessages = (posterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Navigate to message thread with poster
    navigation.navigate('Messages' as never, { userId: posterId } as never);
  };

  const filteredApplications = applications.filter(app => app.status === activeTab);

  const getTabCount = (tab: TabType) => {
    return applications.filter(app => app.status === tab).length;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            My Applications
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Applications
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.badgeText}>{applications.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'pending' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('pending')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'pending' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'pending' ? '700' : '500',
              },
            ]}
          >
            Pending
          </Text>
          {getTabCount('pending') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'pending' ? theme.colors.primary : theme.colors.surface }]}>
              <Text style={[styles.tabBadgeText, { color: activeTab === 'pending' ? '#FFFFFF' : theme.colors.textSecondary }]}>
                {getTabCount('pending')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'accepted' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('accepted')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'accepted' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'accepted' ? '700' : '500',
              },
            ]}
          >
            Accepted
          </Text>
          {getTabCount('accepted') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'accepted' ? theme.colors.primary : theme.colors.surface }]}>
              <Text style={[styles.tabBadgeText, { color: activeTab === 'accepted' ? '#FFFFFF' : theme.colors.textSecondary }]}>
                {getTabCount('accepted')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'rejected' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('rejected')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'rejected' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'rejected' ? '700' : '500',
              },
            ]}
          >
            Not Selected
          </Text>
          {getTabCount('rejected') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'rejected' ? theme.colors.primary : theme.colors.surface }]}>
              <Text style={[styles.tabBadgeText, { color: activeTab === 'rejected' ? '#FFFFFF' : theme.colors.textSecondary }]}>
                {getTabCount('rejected')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {filteredApplications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name={STATUS_CONFIG[activeTab].icon}
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No {activeTab} applications
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {activeTab === 'pending' && 'Your pending applications will appear here'}
            {activeTab === 'accepted' && 'Accepted opportunities will appear here'}
            {activeTab === 'rejected' && 'Past applications will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredApplications.map((application) => {
            const statusInfo = STATUS_CONFIG[application.status];

            return (
              <View
                key={application.id}
                style={[
                  styles.applicationCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                  <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>

                {/* Opportunity Info */}
                <TouchableOpacity
                  onPress={() => handleViewOpportunity(application.opportunity_id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.opportunityTitle, { color: theme.colors.text }]} numberOfLines={2}>
                    {application.opportunity.title}
                  </Text>
                  <View style={styles.opportunityMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: theme.colors.card }]}>
                      <Text style={[styles.typeText, { color: theme.colors.primary }]}>
                        {application.opportunity.type}
                      </Text>
                    </View>
                    {application.opportunity.location && (
                      <>
                        <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>•</Text>
                        <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                          {application.opportunity.location}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Poster Info */}
                <View style={styles.posterInfo}>
                  {application.poster.avatar_url ? (
                    <Image
                      source={{ uri: application.poster.avatar_url }}
                      style={styles.posterAvatar}
                    />
                  ) : (
                    <View style={[styles.posterAvatar, { backgroundColor: theme.colors.card }]}>
                      <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.posterName, { color: theme.colors.textSecondary }]}>
                    Posted by {application.poster.display_name}
                  </Text>
                </View>

                {/* Your Interest */}
                <View style={[styles.interestBox, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.interestHeader}>
                    <Text style={[styles.interestLabel, { color: theme.colors.textSecondary }]}>
                      Your interest:
                    </Text>
                    <View style={[styles.reasonBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.reasonText, { color: theme.colors.primary }]}>
                        {REASON_LABELS[application.reason]}
                      </Text>
                    </View>
                  </View>
                  {application.message && (
                    <Text style={[styles.interestMessage, { color: theme.colors.text }]} numberOfLines={2}>
                      "{application.message}"
                    </Text>
                  )}
                </View>

                {/* Acceptance Message (for accepted applications) */}
                {application.status === 'accepted' && application.custom_message && (
                  <View style={[styles.responseBox, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="mail" size={16} color={theme.colors.primary} />
                      <Text style={[styles.responseLabel, { color: theme.colors.primary }]}>
                        Their response:
                      </Text>
                    </View>
                    <Text style={[styles.responseText, { color: theme.colors.text }]} numberOfLines={3}>
                      {application.custom_message}
                    </Text>
                  </View>
                )}

                {/* Timestamp */}
                <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                  Applied {getRelativeTime(application.created_at)}
                </Text>

                {/* Action Buttons */}
                {application.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.messagesButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleOpenMessages(application.poster_user_id)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                    <Text style={styles.messagesButtonText}>Open Messages</Text>
                  </TouchableOpacity>
                )}

                {application.status === 'pending' && (
                  <View style={[styles.pendingInfo, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="hourglass" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
                      Waiting for {application.poster.display_name} to respond
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
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
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
  applicationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  opportunityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dot: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 12,
  },
  posterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
  },
  posterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  posterName: {
    fontSize: 12,
  },
  interestBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  interestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interestLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  interestMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  responseBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  responseText: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    marginBottom: 12,
  },
  messagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  messagesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
