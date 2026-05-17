import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../hooks/useNetwork';
import { subscriptionService, UsageLimits } from '../services/SubscriptionService';
import { opportunityService, OpportunityPost } from '../services/OpportunityService';
import ConnectionSuggestionCard from '../components/ConnectionSuggestionCard';
import ConnectionCard from '../components/ConnectionCard';
import ConnectionRequestCard from '../components/ConnectionRequestCard';
import OpportunityCard from '../components/OpportunityCard';
import * as Haptics from 'expo-haptics';
import { walkthroughable } from 'react-native-copilot';
import { useServiceProviderPrompt } from '../hooks/useServiceProviderPrompt';
import ServiceProviderPromptModal from '../components/ServiceProviderPromptModal';
import { SystemTypography as Typography } from '../constants/Typography';

type NetworkTab = 'connections' | 'invitations' | 'opportunities';

// Create walkthroughable components for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);
const WalkthroughableView = walkthroughable(View);

export default function NetworkScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();
  const {
    connections,
    suggestions,
    requests: invitations,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    dismissSuggestion,
    refresh,
  } = useNetwork();
  const [activeTab, setActiveTab] = useState<NetworkTab>('connections');
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityPost[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);

  // Service Provider Prompt Modal
  const {
    shouldShow: showServiceProviderPrompt,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
    checkConnectScreenTrigger,
  } = useServiceProviderPrompt();

  // Track Connect screen visits and trigger prompt on 3rd visit
  useEffect(() => {
    checkConnectScreenTrigger();
  }, []);

  // Load opportunities when Opportunities tab is first selected
  useEffect(() => {
    if (activeTab === 'opportunities' && opportunities.length === 0 && !opportunitiesLoading) {
      loadOpportunities();
    }
  }, [activeTab]);

  const loadOpportunities = async () => {
    setOpportunitiesLoading(true);
    try {
      const [{ items: feedItems }, myItems] = await Promise.all([
        opportunityService.getFeed(20, 0),
        opportunityService.getMyOpportunities().catch(() => []),
      ]);

      const locationFiltered = feedItems;

      // Merge own active posts at the top, dedup by id
      // Backfill posted_by from current user since /api/opportunities/mine omits it
      const feedIds = new Set(locationFiltered.map((i) => i.id));
      const ownActive = myItems
        .filter((i) => i.is_active && !feedIds.has(i.id))
        .map((i) => ({
          ...i,
          posted_by: i.posted_by ?? {
            id: user?.id ?? '',
            username: userProfile?.username ?? '',
            display_name: userProfile?.display_name ?? userProfile?.username ?? 'You',
            avatar_url: userProfile?.avatar_url ?? undefined,
          },
        }));
      setOpportunities([...ownActive, ...locationFiltered]);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    if (activeTab === 'opportunities') {
      await loadOpportunities();
    }
    setRefreshing(false);
  };

  const handleTabChange = (tab: NetworkTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleConnect = async (suggestionId: string) => {
    try {
      await sendRequest(suggestionId);
    } catch (err) {
      console.error('Failed to send connection request:', err);
    }
  };

  const handleRemove = async (suggestionId: string) => {
    try {
      await dismissSuggestion(suggestionId);
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleConnectionPress = (userId: string) => {
    navigation.navigate('CreatorProfile' as never, { creatorId: userId } as never);
  };

  const handleMessage = (userId: string) => {
    navigation.navigate('Messages' as never);
  };

  const handleOpportunityPress = (opportunityId: string) => {
    // Future: navigate to a single opportunity detail screen
    console.log('View opportunity:', opportunityId);
  };

  const handleApply = (opportunityId: string) => {
    // Interest submitted — refresh the feed to reflect has_expressed_interest
    loadOpportunities();
  };

  const invitationsCount = invitations.filter((r) => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Tab Selector */}
        <View
          style={[
            styles.tabSelector,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.tabBarRow}>
          <View style={[styles.tabBar, { flex: 1 }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'connections' && {
                  backgroundColor: theme.colors.primary,
                },
                activeTab !== 'connections' && {
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleTabChange('connections')}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'connections' ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                Connections
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'invitations' && {
                  backgroundColor: theme.colors.primary,
                },
                activeTab !== 'invitations' && {
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleTabChange('invitations')}
            >
              <View style={styles.tabButtonContent}>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'invitations' ? '#FFFFFF' : theme.colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Invitations
                </Text>
                {invitationsCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{invitationsCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Step 8: Find PAID Collaboration Opportunities */}
            <WalkthroughableTouchable
              order={8}
              name="paid_collaborations"
              text="Find PAID collaboration opportunities here. Studios, producers, and labels post gigs looking for talent like YOU. Apply directly, negotiate rates, and land paying work. This tab is your professional gig board - grow your network and income simultaneously."
              style={[
                styles.tabButton,
                activeTab === 'opportunities' && {
                  backgroundColor: theme.colors.primary,
                },
                activeTab !== 'opportunities' && {
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleTabChange('opportunities')}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'opportunities' ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                Opportunities
              </Text>
            </WalkthroughableTouchable>
          </View>
          </View>
          {activeTab === 'opportunities' && (
            <View style={[styles.opportunityActionsRow, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={styles.myPostsBtn}
                onPress={() => navigation.navigate('MyOpportunities' as never)}
              >
                <Ionicons name="list-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.myPostsBtnText, { color: theme.colors.primary }]}>My Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postOpportunityBtn, { borderColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('CreateOpportunity' as never)}
              >
                <Ionicons name="add" size={15} color={theme.colors.primary} />
                <Text style={[styles.myPostsBtnText, { color: theme.colors.primary }]}>Post</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* Tab 1: Connections */}
          {activeTab === 'connections' && (
            <>
              {/* Suggestions Section */}
              {suggestions.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    People you may know
                  </Text>
                  {suggestions.map((suggestion) => (
                    <ConnectionSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onConnect={handleConnect}
                      onRemove={handleRemove}
                    />
                  ))}
                </View>
              )}

              {/* Connections Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.mainSectionTitle, { color: theme.colors.text }]}>
                      Your Connections
                    </Text>
                    <Text style={[styles.connectionCount, { color: theme.colors.textSecondary }]}>
                      {connections.length} connections
                    </Text>
                  </View>
                  {/* Step 10: Search Specific Collaborators */}
                  <WalkthroughableTouchable
                    order={10}
                    name="search_collaborators"
                    text="Search for SPECIFIC collaborators by name, location, skills, or instrument. Filter by: Genre expertise, Equipment owned, Budget range, Availability. Build targeted connections with professionals who match YOUR project needs."
                    style={styles.searchButton}
                  >
                    <Ionicons name="search" size={20} color={theme.colors.text} />
                  </WalkthroughableTouchable>
                </View>
                {connections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    onPress={handleConnectionPress}
                    onMessage={handleMessage}
                  />
                ))}
              </View>
            </>
          )}

          {/* Tab 2: Invitations */}
          {activeTab === 'invitations' && (
            <View style={styles.section}>
              {invitations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="mail-open-outline"
                    size={64}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    No pending invitations
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    When someone sends you a connection request, it will appear here
                  </Text>
                </View>
              ) : (
                invitations.map((request) => (
                  <ConnectionRequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))
              )}
            </View>
          )}

          {/* Tab 3: Opportunities */}
          {activeTab === 'opportunities' && (
            <WalkthroughableView
              order={9}
              name="apply_for_gigs"
              text="Browse and apply for PAID gigs here. Each card shows: Budget range, Project type, Location, Required skills. Tap to see full details and submit your application. Premium/Unlimited members get priority visibility - your profile shows first to employers."
              style={styles.section}
            >
              {opportunitiesLoading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
              ) : opportunities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="megaphone-outline" size={56} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No opportunities yet</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Be the first to post a collaboration, event slot, or job
                  </Text>
                  <TouchableOpacity
                    style={[styles.postFirstBtn, { borderColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('CreateOpportunity' as never)}
                  >
                    <Text style={[styles.postFirstBtnText, { color: theme.colors.primary }]}>
                      Post an Opportunity
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={{
                      ...opportunity,
                      posted_at: opportunity.created_at,
                    }}
                    onPress={() => handleOpportunityPress(opportunity.id)}
                    onApply={handleApply}
                    onEdit={(opp) => navigation.navigate('CreateOpportunity' as never, {
                      editing: {
                        id: opp.id,
                        type: opp.type,
                        title: opp.title,
                        description: opp.description,
                        skills_needed: (opp as any).skills_needed,
                        location: (opp as any).location,
                        is_remote: (opp as any).is_remote,
                        budget_min: (opp as any).budget_min,
                        budget_max: (opp as any).budget_max,
                        budget_currency: (opp as any).budget_currency,
                        visibility: (opp as any).visibility,
                      },
                    } as never)}
                  />
                ))
              )}
            </WalkthroughableView>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Service Provider Prompt Modal */}
      <ServiceProviderPromptModal
        visible={showServiceProviderPrompt}
        onSetupProfile={handleSetupProfile}
        onRemindLater={handleRemindLater}
        onDontShowAgain={handleDontShowAgain}
      />
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
  tabSelector: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  opportunityActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  myPostsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  myPostsBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postOpportunityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabButton: {
    flexShrink: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    ...Typography.label,
    textAlign: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    ...Typography.label,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    marginBottom: 12,
  },
  mainSectionTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
  },
  connectionCount: {
    ...Typography.label,
  },
  searchButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 100,
  },
  emptyTitle: {
    ...Typography.headerMedium,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  postFirstBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  postFirstBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
