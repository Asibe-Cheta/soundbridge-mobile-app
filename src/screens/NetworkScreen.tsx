import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
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
import { mockOpportunities } from '../utils/mockNetworkData';
import ConnectionSuggestionCard from '../components/ConnectionSuggestionCard';
import ConnectionCard from '../components/ConnectionCard';
import ConnectionRequestCard from '../components/ConnectionRequestCard';
import OpportunityCard from '../components/OpportunityCard';
import * as Haptics from 'expo-haptics';

type NetworkTab = 'connections' | 'invitations' | 'opportunities';

export default function NetworkScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
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
  const [opportunities] = useState(mockOpportunities);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
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
    // TODO: Navigate to opportunity details
    console.log('View opportunity:', opportunityId);
  };

  const handleApply = (opportunityId: string) => {
    // TODO: Implement API call
    console.log('Apply to opportunity:', opportunityId);
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
          <View style={styles.tabBar}>
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

            <TouchableOpacity
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
            </TouchableOpacity>
          </View>
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                      Your Connections
                    </Text>
                    <Text style={[styles.connectionCount, { color: theme.colors.textSecondary }]}>
                      {connections.length} connections
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.searchButton}>
                    <Ionicons name="search" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
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
            <View style={styles.section}>
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onPress={handleOpportunityPress}
                  onApply={handleApply}
                />
              ))}
            </View>
          )}
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
  tabSelector: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  connectionCount: {
    fontSize: 16,
    fontWeight: '400',
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
