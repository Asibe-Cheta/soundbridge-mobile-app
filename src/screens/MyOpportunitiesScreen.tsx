import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { opportunityService, OpportunityPost, OpportunityProject } from '../services/OpportunityService';
import { urgentGigService } from '../services/UrgentGigService';
import type { UrgentGig } from '../types/urgent-gig.types';
import { getRelativeTime } from '../utils/collaborationUtils';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import * as Haptics from 'expo-haptics';

const TYPE_COLORS: Record<string, string> = {
  collaboration: '#7C3AED',
  event: '#EC4899',
  job: '#059669',
};

const TYPE_LABELS: Record<string, string> = {
  collaboration: 'Collaboration',
  event: 'Event Slot',
  job: 'Job / Session',
};

const URGENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  searching:  { label: '🔍 Searching',  color: '#F59E0B', icon: 'search' },
  confirmed:  { label: '✅ Confirmed',   color: '#10B981', icon: 'checkmark-circle' },
  completed:  { label: '✓ Completed',   color: '#6B7280', icon: 'checkmark-done-circle' },
  cancelled:  { label: '✕ Cancelled',   color: '#EF4444', icon: 'close-circle' },
};

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting_acceptance: { label: 'Action Required',       color: '#F59E0B' },
  payment_pending:     { label: 'Payment Processing',    color: '#7C3AED' },
  active:              { label: 'In Progress',           color: '#059669' },
  delivered:           { label: 'Awaiting Confirmation', color: '#7C3AED' },
  completed:           { label: 'Completed',             color: '#6B7280' },
  disputed:            { label: 'Disputed',              color: '#EF4444' },
  cancelled:           { label: 'Cancelled',             color: '#6B7280' },
  declined:            { label: 'Declined',              color: '#6B7280' },
};

// Poster sees different labels — awaiting_acceptance means creator hasn't responded yet
const POSTER_PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting_acceptance: { label: 'Awaiting Creator',      color: '#7C3AED' },
  payment_pending:     { label: 'Payment Required',      color: '#F59E0B' },
  active:              { label: 'In Progress',           color: '#059669' },
  delivered:           { label: 'Confirm Delivery',      color: '#7C3AED' },
  completed:           { label: 'Completed',             color: '#6B7280' },
  disputed:            { label: 'Disputed',              color: '#EF4444' },
  cancelled:           { label: 'Cancelled',             color: '#6B7280' },
  declined:            { label: 'Declined',              color: '#6B7280' },
};

export default function MyOpportunitiesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<'planned' | 'urgent' | 'projects'>('planned');
  const [opportunities, setOpportunities] = useState<OpportunityPost[]>([]);
  const [urgentGigs, setUrgentGigs] = useState<UrgentGig[]>([]);
  const [myProjects, setMyProjects] = useState<OpportunityProject[]>([]);
  const [postedProjects, setPostedProjects] = useState<OpportunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOpportunities = useCallback(async () => {
    // Run independently so a backend failure on one doesn't kill the other
    await Promise.allSettled([
      opportunityService.getMyOpportunities()
        .then(items => setOpportunities(items))
        .catch(err => console.error('Failed to load my opportunities:', err)),
      opportunityService.getMyProjects('poster')
        .then(items => setPostedProjects(items))
        .catch(err => console.warn('Posted projects unavailable (backend may not support ?role=poster yet):', err)),
    ]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadUrgentGigs = useCallback(async () => {
    try {
      const items = await urgentGigService.getMyGigs();

      // Auto-recover any gigs where payment was authorized but backend didn't
      // advance the status (webhook missed). Same belt-and-suspenders pattern
      // as OpportunityProjectScreen. Fails silently until the endpoint is live.
      const recoveryPromises = items
        .filter(g => g.payment_status === 'pending')
        .map(g => urgentGigService.confirmPayment(g.id).catch(() => null));

      if (recoveryPromises.length > 0) {
        const recovered = await Promise.all(recoveryPromises);
        // Merge any successfully recovered gigs back into the list
        const recoveredMap = new Map(
          recovered.filter(Boolean).map(g => [g!.id, g!])
        );
        setUrgentGigs(items.map(g => recoveredMap.get(g.id) ?? g));
      } else {
        setUrgentGigs(items);
      }
    } catch (error) {
      console.error('Failed to load urgent gigs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMyProjects = useCallback(async () => {
    try {
      const items = await opportunityService.getMyProjects('creator');
      setMyProjects(items);
    } catch (error) {
      console.error('Failed to load my projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      if (activeTab === 'planned') {
        loadOpportunities();
      } else if (activeTab === 'urgent') {
        loadUrgentGigs();
      } else {
        loadMyProjects();
      }
    }, [activeTab, loadOpportunities, loadUrgentGigs, loadMyProjects])
  );

  // Pre-load projects in background so badge counts and the Planned tab are ready
  useEffect(() => {
    opportunityService.getMyProjects('creator')
      .then(items => setMyProjects(items))
      .catch(() => {});
    opportunityService.getMyProjects('poster')
      .then(items => setPostedProjects(items))
      .catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'planned') loadOpportunities();
    else if (activeTab === 'urgent') loadUrgentGigs();
    else loadMyProjects();
  };

  const handleDeactivate = (id: string, title: string) => {
    Alert.alert(
      'Close Opportunity',
      `Close "${title}"? It will no longer appear in the feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await opportunityService.deactivateOpportunity(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadOpportunities();
            } catch {
              Alert.alert('Error', 'Failed to close opportunity.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Opportunity',
      `Permanently delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await opportunityService.deleteOpportunity(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadOpportunities();
            } catch (error: any) {
              const msg =
                error.message?.includes('active') || error.message?.includes('409')
                  ? 'Cannot delete — there is an active project linked to this opportunity. Complete or cancel the project first.'
                  : 'Failed to delete opportunity.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Opportunities</Text>
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => navigation.navigate('UrgentGigTypeSelection' as never)}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab selector */}
        <View style={[styles.tabRow, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'planned' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('planned')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'planned' ? theme.colors.primary : theme.colors.textSecondary }]}>
              Planned
            </Text>
            {postedProjects.filter(p => p.status === 'payment_pending').length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.tabBadgeText}>
                  {postedProjects.filter(p => p.status === 'payment_pending').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'urgent' && { borderBottomColor: '#DC2626', borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('urgent')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'urgent' ? '#DC2626' : theme.colors.textSecondary }]}>
              🔥 Urgent Gigs
            </Text>
            {urgentGigs.filter(g => g.urgent_status === 'searching').length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {urgentGigs.filter(g => g.urgent_status === 'searching').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'projects' && { borderBottomColor: '#059669', borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('projects')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'projects' ? '#059669' : theme.colors.textSecondary }]}>
              My Work
            </Text>
            {myProjects.filter(p => p.status === 'awaiting_acceptance').length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.tabBadgeText}>
                  {myProjects.filter(p => p.status === 'awaiting_acceptance').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {/* ── URGENT TAB ─────────────────────────────────────────── */}
          {activeTab === 'urgent' && (
            urgentGigs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>🔥</Text>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No urgent gigs yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Post an urgent gig to find a musician in minutes
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('CreateUrgentGig' as never)}
                >
                  <LinearGradient
                    colors={['#DC2626', '#EA580C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyButtonGradient}
                  >
                    <Text style={styles.emptyButtonText}>Post an Urgent Gig</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              urgentGigs.map((gig) => {
                const statusCfg = URGENT_STATUS_CONFIG[gig.urgent_status] ?? URGENT_STATUS_CONFIG.searching;
                const gigDate = gig.date_needed ? new Date(gig.date_needed) : null;
                const dateStr = gigDate
                  ? gigDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
                    ' ' + gigDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : null;
                return (
                  <View key={gig.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.typeBadge, { backgroundColor: '#DC262620', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 10 }}>🔥</Text>
                        <Text style={[styles.typeBadgeText, { color: '#DC2626' }]}>URGENT</Text>
                      </View>
                      <View style={[styles.closedBadge, { backgroundColor: `${statusCfg.color}20` }]}>
                        <Text style={[styles.closedBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {gig.title}
                    </Text>
                    {dateStr && (
                      <Text style={[styles.cardPosted, { color: theme.colors.textSecondary }]}>
                        📅 {dateStr}
                      </Text>
                    )}
                    {gig.location_address && (
                      <Text style={[styles.cardPosted, { color: theme.colors.textSecondary }]}>
                        📍 {gig.location_address}
                      </Text>
                    )}
                    <View style={styles.cardActions}>
                      {(gig.urgent_status === 'searching') && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
                          onPress={() => navigation.navigate('UrgentGigResponses' as never, { gigId: gig.id } as never)}
                        >
                          <Ionicons name="people" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>View Responses</Text>
                        </TouchableOpacity>
                      )}
                      {gig.urgent_status === 'confirmed' && gig.project_id && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                          onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: gig.project_id } as never)}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>View Project</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )
          )}

          {/* ── MY WORK TAB ────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            myProjects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No active projects</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  When a poster selects you for an opportunity, it will appear here for you to accept and start.
                </Text>
              </View>
            ) : (
              myProjects.map((project) => {
                const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active;
                const isPending = project.status === 'awaiting_acceptance';
                const isMyWorkCompleted = project.status === 'completed';
                const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };
                const symbol = CURRENCY_SYMBOLS[project.currency] ?? project.currency + ' ';
                return (
                  <TouchableOpacity
                    key={project.id}
                    activeOpacity={0.85}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isPending ? 'rgba(245,158,11,0.04)' : isMyWorkCompleted ? 'rgba(16,185,129,0.04)' : theme.colors.card,
                        borderColor: isPending ? 'rgba(245,158,11,0.35)' : isMyWorkCompleted ? 'rgba(16,185,129,0.22)' : theme.colors.border,
                      },
                    ]}
                    onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                  >
                    {/* Header row: status badge + earnings chip */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View style={[styles.typeBadge, { backgroundColor: `${statusCfg.color}18` }]}>
                        <Text style={[styles.typeBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(5,150,105,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Ionicons name="cash-outline" size={12} color="#059669" />
                        <Text style={{ fontFamily: Typography.body.fontFamily, color: '#059669', fontSize: 12, fontWeight: '600', letterSpacing: -0.4 }}>
                          {symbol}{project.creator_payout_amount.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.cardTitle, { color: isMyWorkCompleted ? theme.colors.textSecondary : theme.colors.text }]} numberOfLines={2}>
                      {project.title}
                    </Text>

                    {project.other_party && (
                      <Text style={[styles.cardPosted, { color: theme.colors.textSecondary }]}>
                        From {project.other_party.display_name || project.other_party.username}
                      </Text>
                    )}

                    {project.status === 'payment_pending' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 10, backgroundColor: 'rgba(124,58,237,0.10)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Ionicons name="hourglass-outline" size={13} color="#7C3AED" />
                        <Text style={{ fontFamily: Typography.body.fontFamily, color: '#7C3AED', fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>Awaiting client payment confirmation</Text>
                      </View>
                    )}

                    {!isMyWorkCompleted && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={{ alignSelf: 'flex-start', borderRadius: 24, overflow: 'hidden' }}
                        onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                      >
                        <LinearGradient
                          colors={isPending ? ['#F59E0B', '#D97706'] : [theme.colors.primary, '#EC4899']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24 }}
                        >
                          <Text style={{ fontFamily: Typography.body.fontFamily, color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.4 }}>
                            {isPending ? 'Review & Accept' : 'Open Project'}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })
            )
          )}

          {/* ── PLANNED TAB ────────────────────────────────────────── */}
          {activeTab === 'planned' && (
            <>
              {/* Posted projects (poster-side) — shown first if any exist */}
              {postedProjects.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
                    MY POSTED PROJECTS
                  </Text>
                  {postedProjects.map((project) => {
                    const statusCfg = POSTER_PROJECT_STATUS_CONFIG[project.status] ?? POSTER_PROJECT_STATUS_CONFIG.active;
                    const isPaymentPending = project.status === 'payment_pending';
                    const isCompleted = project.status === 'completed';
                    const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };
                    const symbol = CURRENCY_SYMBOLS[project.currency] ?? project.currency + ' ';
                    const accentColor = isCompleted ? '#10B981' : isPaymentPending ? '#F59E0B' : statusCfg.color;
                    return (
                      <TouchableOpacity
                        key={project.id}
                        activeOpacity={0.85}
                        style={[
                          styles.card,
                          {
                            backgroundColor: isCompleted
                              ? 'rgba(16,185,129,0.05)'
                              : theme.colors.card,
                            borderColor: isCompleted
                              ? 'rgba(16,185,129,0.22)'
                              : isPaymentPending ? '#F59E0B'
                              : theme.colors.border,
                          },
                          isPaymentPending && { borderWidth: 2 },
                        ]}
                        onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                      >
                        {/* Completed — wallet credited banner */}
                        {isCompleted && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark" size={12} color="#fff" />
                              </View>
                              <Text style={{ fontFamily: Typography.body.fontFamily, color: '#10B981', fontSize: 13, fontWeight: '600', letterSpacing: -0.4 }}>
                                Completed
                              </Text>
                            </View>
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>
                              {symbol}{project.agreed_amount.toFixed(2)} paid
                            </Text>
                          </View>
                        )}

                        {/* Payment pending banner */}
                        {isPaymentPending && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Ionicons name="card-outline" size={15} color="#F59E0B" />
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: '#F59E0B', fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>Payment required — tap to complete</Text>
                          </View>
                        )}

                        {!isCompleted && (
                          <View style={styles.cardHeader}>
                            <View style={[styles.typeBadge, { backgroundColor: `${accentColor}20` }]}>
                              <Text style={[styles.typeBadgeText, { color: accentColor }]}>{statusCfg.label}</Text>
                            </View>
                          </View>
                        )}

                        <Text style={[styles.cardTitle, { color: isCompleted ? theme.colors.textSecondary : theme.colors.text }]} numberOfLines={2}>
                          {project.title}
                        </Text>
                        {project.other_party && (
                          <Text style={[styles.cardPosted, { color: theme.colors.textSecondary }]}>
                            {isCompleted ? 'Paid to' : 'Creator'}: {project.other_party.display_name || project.other_party.username}
                          </Text>
                        )}

                        {!isCompleted && (
                          <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                              <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
                              <Text style={[styles.statText, { color: theme.colors.text }]}>
                                {symbol}{project.agreed_amount.toFixed(2)} agreed
                              </Text>
                            </View>
                          </View>
                        )}

                        <View style={styles.cardActions}>
                          {isCompleted ? (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}
                              onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                            >
                              <Ionicons name="receipt-outline" size={13} color="#10B981" />
                              <Text style={{ fontFamily: Typography.body.fontFamily, color: '#10B981', fontSize: 13, fontWeight: '300', letterSpacing: -0.4 }}>View Details</Text>
                            </TouchableOpacity>
                          ) : project.status === 'awaiting_acceptance' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="hourglass-outline" size={13} color="#7C3AED" />
                              <Text style={{ fontFamily: Typography.body.fontFamily, color: '#7C3AED', fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>
                                Waiting for creator to accept
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              style={{ alignSelf: 'flex-start', borderRadius: 24, overflow: 'hidden' }}
                              onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                            >
                              <LinearGradient
                                colors={isPaymentPending ? ['#F59E0B', '#D97706'] : [theme.colors.primary, '#EC4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24 }}
                              >
                                <Ionicons name={isPaymentPending ? 'card-outline' : 'arrow-forward-circle-outline'} size={14} color="#fff" />
                                <Text style={{ fontFamily: Typography.body.fontFamily, color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.4 }}>
                                  {isPaymentPending ? 'Complete Payment' : 'Open Project'}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Opportunity posts */}
              {opportunities.length === 0 ? (
                postedProjects.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="megaphone-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No opportunities yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Post an opportunity to find collaborators, session musicians, or event performers
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => navigation.navigate('CreateOpportunity' as never)}
                    >
                      <LinearGradient
                        colors={['#EC4899', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.emptyButtonGradient}
                      >
                        <Text style={styles.emptyButtonText}>Post Your First Opportunity</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : null
              ) : (
                <>
                  {postedProjects.length > 0 && (
                    <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
                      MY OPPORTUNITY POSTS
                    </Text>
                  )}
                  {opportunities.map((opp) => (
                    <View
                      key={opp.id}
                      style={[styles.card, {
                        backgroundColor: theme.colors.card,
                        borderColor: !opp.is_active ? theme.colors.border : opp.interest_count > 0 ? 'rgba(124,58,237,0.3)' : theme.colors.border,
                        opacity: opp.is_active ? 1 : 0.65,
                      }]}
                    >
                      {/* Header: type + closed indicator */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={[styles.typeBadge, { backgroundColor: `${TYPE_COLORS[opp.type]}18` }]}>
                          <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[opp.type] }]}>
                            {TYPE_LABELS[opp.type]}
                          </Text>
                        </View>
                        {!opp.is_active ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.textSecondary, opacity: 0.5 }} />
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: theme.colors.textSecondary, fontSize: 11, fontWeight: '300', letterSpacing: -0.4 }}>Closed</Text>
                          </View>
                        ) : opp.interest_count > 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' }} />
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: '#7C3AED', fontSize: 11, fontWeight: '600', letterSpacing: -0.4 }}>
                              {opp.interest_count} {opp.interest_count === 1 ? 'interested' : 'interested'}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {opp.title}
                      </Text>

                      {/* Meta chips row */}
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                          <Text style={{ fontFamily: Typography.body.fontFamily, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>
                            {getRelativeTime(opp.created_at)}
                          </Text>
                        </View>
                        {opp.expires_at && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: theme.colors.textSecondary, opacity: 0.4, fontSize: 12 }}>·</Text>
                            <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 }}>
                              Expires {getRelativeTime(opp.expires_at)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Actions row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {opp.interest_count > 0 && opp.is_active && (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={{ borderRadius: 24, overflow: 'hidden' }}
                            onPress={() => navigation.navigate('OpportunityInterestList' as never, { opportunityId: opp.id, opportunityTitle: opp.title } as never)}
                          >
                            <LinearGradient
                              colors={[theme.colors.primary, '#EC4899']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24 }}
                            >
                              <Ionicons name="people-outline" size={14} color="#fff" />
                              <Text style={{ fontFamily: Typography.body.fontFamily, color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.4 }}>
                                {opp.interest_count} {opp.interest_count === 1 ? 'Applicant' : 'Applicants'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}

                        {opp.is_active && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleDeactivate(opp.id, opp.title)}
                            style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border }}
                          >
                            <Text style={{ fontFamily: Typography.body.fontFamily, color: theme.colors.textSecondary, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 }}>
                              Close
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleDelete(opp.id, opp.title)} style={{ marginLeft: 'auto' as any }}>
                          <Text style={{ fontFamily: Typography.body.fontFamily, color: '#EF4444', fontSize: 13, fontWeight: '300', letterSpacing: -0.4, opacity: 0.6 }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
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
  postButton: { padding: 8 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  tabBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontFamily: Typography.body.fontFamily,
    color: '#fff',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  contextBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  sectionHeader: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
    opacity: 0.5,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: Typography.body.fontFamily, fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '300', letterSpacing: -0.4, textAlign: 'center', marginBottom: 24 },
  emptyButton: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  emptyButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  emptyButtonText: { fontFamily: Typography.body.fontFamily, color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: -0.4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '300', letterSpacing: -0.4, textTransform: 'uppercase' },
  closedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  closedBadgeText: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '300', letterSpacing: -0.4 },
  cardTitle: { fontFamily: Typography.body.fontFamily, fontSize: 16, fontWeight: '600', letterSpacing: -0.4, marginBottom: 4, lineHeight: 22 },
  cardPosted: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300', letterSpacing: -0.4, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  actionButtonText: { fontFamily: Typography.body.fontFamily, color: '#FFFFFF', fontSize: 13, fontWeight: '600', letterSpacing: -0.4 },
  actionButtonOutline: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonOutlineText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
});
