import React, { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Linking,
  StatusBar,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { currencyService } from '../services/CurrencyService';
import BackButton from '../components/BackButton';
import { payoutService } from '../services/PayoutService';
import { creatorRevenueService } from '../services/CreatorRevenueService';
import subscriptionService from '../services/SubscriptionService';
import { walletService } from '../services/WalletService';
import { supabase } from '../lib/supabase';
import GettingStartedChecklist from '../components/GettingStartedChecklist';
import {
  fetchServiceProviderProfile,
  fetchProviderBookings,
  createServiceOffering,
  updateServiceOffering,
  deleteServiceOffering,
  addPortfolioItem,
  deletePortfolioItem,
  updateBookingStatus,
  fetchBadgeInsights,
  fetchVerificationStatus,
  startPersonaVerification,
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  fetchProviderReviews,
  type ServiceProviderProfileResponse,
  type ServiceOfferingInput,
  type PortfolioItemInput,
  type AvailabilitySlotInput,
} from '../services/creatorExpansionService';
import type {
  ServiceBooking,
  BookingSummary,
  ServiceCategory,
  ServiceOffering,
  ServicePortfolioItem,
  BadgeInsights,
  VerificationStatusResponse,
  ServiceProviderAvailability,
  ServiceReview,
} from '../types';

import { SERVICE_CATEGORY_LABELS, getServiceCategoryLabel, formatServiceCategories } from '../utils/serviceCategoryLabels';
import {
  serviceDiscoveryService,
  GigAlertPreferences,
  DEFAULT_GIG_ALERT_PREFS,
  SERVICE_CATEGORY_OPTIONS,
} from '../services/ServiceDiscoveryService';
import { Switch } from 'react-native';

// Valid categories as per web app team confirmation (WEB_TEAM_SERVICE_CATEGORIES_RESPONSE.md)
// Complete list of 9 categories - API will reject any other category
const SERVICE_CATEGORIES: ServiceCategory[] = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
];

// Get all supported currencies from CurrencyService
const SUPPORTED_CURRENCIES = currencyService.getSupportedCurrencies().sort();

export default function ServiceProviderDashboardScreen() {
  const { user, session, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get userId from route params or fallback to current user
  const routeParams = route.params as { userId?: string } | undefined;
  const userId = routeParams?.userId || user?.id || '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ServiceProviderProfileResponse | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [badgeInsights, setBadgeInsights] = useState<BadgeInsights | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  const [availability, setAvailability] = useState<ServiceProviderAvailability[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);

  // Earnings state
  const [earnings, setEarnings] = useState<{
    totalEarnings: number;
    availableBalance: number;
    pendingBalance: number;
    currency: string;
  } | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium' | 'unlimited'>('free');

  // Gig alert preferences
  const [gigAlertPrefs, setGigAlertPrefs] = useState<GigAlertPreferences>(DEFAULT_GIG_ALERT_PREFS);
  const [savingGigAlerts, setSavingGigAlerts] = useState(false);

  // Getting Started checklist state
  const [checklistBasicProfile, setChecklistBasicProfile] = useState<{
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    genres?: string[] | null;
  } | null>(null);
  const [checklistHasPayoutMethod, setChecklistHasPayoutMethod] = useState(false);
  const [checklistHasFirstTrack, setChecklistHasFirstTrack] = useState(false);

  // Offerings state
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ServiceOffering | null>(null);
  const [offeringForm, setOfferingForm] = useState<ServiceOfferingInput>({
    title: '',
    category: 'sound_engineering',
    rate_amount: 0,
    rate_currency: 'USD',
    rate_unit: 'per_hour',
    is_active: true,
  });

  // Portfolio state
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioItemInput>({
    media_url: '',
    thumbnail_url: '',
    caption: '',
    sort_order: 0,
  });

  // Portfolio video modal
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  // Currency picker modal
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRateUnitPicker, setShowRateUnitPicker] = useState(false);

  // Persona verification
  const [startingVerification, setStartingVerification] = useState(false);
  const [confirmedVerified, setConfirmedVerified] = useState(false);
  const personaInProgressRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const VERIFIED_KEY = userId ? `persona_verified_${userId}` : null;

  useEffect(() => {
    if (!VERIFIED_KEY) return;
    AsyncStorage.getItem(VERIFIED_KEY).then((val) => {
      if (val === 'true') setConfirmedVerified(true);
    });
  }, [VERIFIED_KEY]);

  const refreshVerificationStatus = useCallback(async () => {
    if (!userId || !session) return;
    try {
      // Refresh both — badgeInsights is the primary source of truth for isVerified
      const [updated, updatedBadges] = await Promise.all([
        fetchVerificationStatus(userId, { session }),
        fetchBadgeInsights(userId, { session }),
      ]);
      if (updated) setVerificationStatus(updated);
      if (updatedBadges) setBadgeInsights(updatedBadges);

      // If now verified, also refresh AuthContext so the verified badge propagates
      // immediately across PostCard, ProfileScreen, SearchScreen etc.
      const nowVerified =
        updatedBadges?.verified_professional_state === 'verified_premium' ||
        updatedBadges?.verified_professional_state === 'verified_downgraded' ||
        updated?.status === 'approved';
      if (nowVerified) {
        refreshUser().catch(() => {}); // non-blocking, best-effort
      }
    } catch {
      // non-critical
    }
  }, [userId, session, refreshUser]);

  const handleStartVerification = async () => {
    console.log('🔎 handleStartVerification called, userId:', userId, 'hasSession:', !!session);
    if (!userId || !session) {
      console.warn('⚠️ handleStartVerification: missing userId or session — early return');
      return;
    }
    setStartingVerification(true);
    console.log('🔎 calling startPersonaVerification...');
    try {
      const result = await startPersonaVerification(userId, { session });
      console.log('🔎 startPersonaVerification result:', JSON.stringify(result));

      if (result.already_verified) {
        setConfirmedVerified(true);
        if (VERIFIED_KEY) AsyncStorage.setItem(VERIFIED_KEY, 'true');
        await refreshVerificationStatus();
        return;
      }

      if (result.needs_review || result.inquiry_url === null) {
        // Persona flagged for manual review — show pending state
        setVerificationStatus((prev) =>
          prev ? { ...prev, status: 'pending' } : null
        );
        Alert.alert(
          'Under Review',
          "Your verification is being reviewed by our team. You'll be notified once it's complete."
        );
        return;
      }

      // Normal flow — open Persona hosted URL in in-app browser sheet
      // (SFSafariViewController on iOS, Chrome Custom Tabs on Android)
      // This keeps the user in the app while giving full camera/mic access for the KYC flow
      personaInProgressRef.current = true;
      await WebBrowser.openBrowserAsync(result.inquiry_url!, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      // Browser closed (user finished or dismissed) — refresh status
      personaInProgressRef.current = false;
      await refreshVerificationStatus();
    } catch (error: any) {
      console.error('❌ handleStartVerification caught error:', {
        name: error?.name,
        message: error?.message,
        status: error?.status,
        stack: error?.stack,
      });
      const message =
        error?.status === 403
          ? 'A Premium subscription is required to start verification.'
          : `Could not start verification: ${error?.message || 'Unknown error'}. Please try again.`;
      Alert.alert('Verification Error', message);
    } finally {
      setStartingVerification(false);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      // When user returns to app after being in Persona browser flow
      if (personaInProgressRef.current && prev !== 'active' && nextState === 'active') {
        personaInProgressRef.current = false;
        refreshVerificationStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshVerificationStatus]);

  // Refresh verification status when Persona's webhook fires and the backend
  // sends an 'identity_verified' push notification to the device.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = (notification.request.content.data as any)?.type;
      if (type === 'identity_verified') {
        refreshVerificationStatus();
      }
    });
    return () => sub.remove();
  }, [refreshVerificationStatus]);

  useEffect(() => {
    loadDashboardData();
    loadEarnings();
    loadSubscriptionTier();
    if (userId === user?.id) loadChecklistData();
  }, [userId]);

  const loadSubscriptionTier = async () => {
    if (!session) return;
    try {
      const status = await subscriptionService.getSubscriptionStatusSafe(session);
      if (status?.tier) setSubscriptionTier(status.tier);
    } catch {
      // non-critical — default remains 'free'
    }
  };

  const loadDashboardData = async () => {
    if (!userId || !session) {
      console.warn('⚠️ ServiceProviderDashboard: Missing userId or session');
      setLoading(false);
      Alert.alert(
        'Error',
        'Unable to load dashboard. Please sign in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // If we can't go back, navigate to Profile screen
                navigation.navigate('Profile' as never);
              }
            },
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Loading Service Provider Dashboard data...');
      console.log('User ID:', userId);
      console.log('Session exists:', !!session);

      const [profileData, bookingsData, badgeData, verificationData, reviewsData, gigAlertData] = await Promise.allSettled([
        fetchServiceProviderProfile(userId, ['offerings', 'portfolio', 'reviews', 'availability'], { session }),
        fetchProviderBookings(userId, { session }),
        fetchBadgeInsights(userId, { session }),
        fetchVerificationStatus(userId, { session }),
        fetchProviderReviews(userId, { session }),
        serviceDiscoveryService.getGigAlertPreferences(userId),
      ]);

      if (gigAlertData.status === 'fulfilled' && gigAlertData.value) {
        setGigAlertPrefs(gigAlertData.value);
      }

      // Handle profile data
      if (profileData.status === 'fulfilled') {
        const profile = profileData.value;
        if (profile) {
          setProfile(profile);
          setAvailability(profile.availability || []);
          console.log('✅ Profile loaded');
        } else {
          // Profile is null (404 handled in service)
          console.log('ℹ️ No profile found - redirecting to onboarding');
          Alert.alert(
            'Profile Not Found',
            'You need to set up your service provider profile first.',
            [
              {
                text: 'Set Up Profile',
                onPress: () => {
                  navigation.navigate('ServiceProviderOnboarding' as never);
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Profile' as never);
                  }
                },
              },
            ]
          );
          return; // Exit early, don't try to load other data
        }
      } else {
        console.error('❌ Failed to load profile:', profileData.reason);
        // If profile doesn't exist (404), redirect to onboarding
        if (profileData.reason?.status === 404) {
          console.log('ℹ️ No profile found (404) - redirecting to onboarding');
          Alert.alert(
            'Profile Not Found',
            'You need to set up your service provider profile first.',
            [
              {
                text: 'Set Up Profile',
                onPress: () => {
                  navigation.navigate('ServiceProviderOnboarding' as never);
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Profile' as never);
                  }
                },
              },
            ]
          );
          return; // Exit early
        }
      }

      // Handle bookings
      if (bookingsData.status === 'fulfilled') {
        setBookings(bookingsData.value || []);
        console.log('✅ Bookings loaded:', bookingsData.value?.length || 0);
      } else {
        console.error('❌ Failed to load bookings:', bookingsData.reason);
        setBookings([]);
      }

      // Handle badge insights (optional)
      if (badgeData.status === 'fulfilled') {
        setBadgeInsights(badgeData.value);
        console.log('✅ Badge insights loaded');
      } else {
        console.warn('⚠️ Failed to load badge insights:', badgeData.reason);
        setBadgeInsights(null);
      }

      // Handle verification status (optional)
      if (verificationData.status === 'fulfilled') {
        setVerificationStatus(verificationData.value);
        console.log('✅ Verification status loaded');
      } else {
        console.warn('⚠️ Failed to load verification status:', verificationData.reason);
        setVerificationStatus(null);
      }

      // Handle reviews
      if (reviewsData.status === 'fulfilled') {
        setReviews(reviewsData.value || []);
        console.log('✅ Reviews loaded:', reviewsData.value?.length || 0);
      } else {
        console.error('❌ Failed to load reviews:', reviewsData.reason);
        setReviews([]);
      }

      console.log('✅ Dashboard data loading completed');
    } catch (error: any) {
      console.error('❌ Error loading dashboard:', error);
      const errorMessage = error?.message || 'Failed to load dashboard data';
      const errorStatus = error?.status;
      
      let alertMessage = errorMessage;
      if (errorStatus === 401) {
        alertMessage = 'Authentication failed. Your session may have expired. Please sign in again.';
      } else if (errorStatus === 404) {
        alertMessage = 'Service provider profile not found. Please complete your profile setup.';
      }

      Alert.alert(
        'Error',
        alertMessage,
        [
          {
            text: 'Go Back',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // If we can't go back, navigate to Profile screen
                navigation.navigate('Profile' as never);
              }
            },
          },
          {
            text: 'Retry',
            onPress: () => loadDashboardData(),
          },
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEarnings = async () => {
    if (!userId || !session) return;

    setLoadingEarnings(true);
    try {
      // Use creatorRevenueService (queries wallet_transactions directly via Supabase)
      // This is the same source used by the Earnings Dashboard and is always accurate.
      // /api/revenue/balance (payoutService) returns zeros when creator_revenue table isn't synced.
      const [revenueBySource, walletBalance] = await Promise.all([
        creatorRevenueService.getRevenueBySource(session, undefined, undefined, 'USD').catch(() => null),
        payoutService.getCreatorRevenue(session).catch(() => null),
      ]);

      if (revenueBySource) {
        setEarnings({
          totalEarnings: revenueBySource.total.amount ?? 0,
          pendingBalance: walletBalance?.pending_balance ?? 0,
          availableBalance: walletBalance?.available_balance ?? revenueBySource.total.amount ?? 0,
          currency: revenueBySource.total.currency ?? 'USD',
        });
      } else {
        setEarnings(null);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      setEarnings(null);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const loadChecklistData = async () => {
    if (!userId) return;
    try {
      // Use Supabase directly — faster and more reliable than REST endpoints
      // that may be broken or read from different data sources than the web app
      const [profileResult, tracksResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, avatar_url, bio, genres')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('audio_tracks')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', userId),
      ]);

      if (!profileResult.error && profileResult.data) {
        setChecklistBasicProfile(profileResult.data);
      }
      if (!tracksResult.error) {
        setChecklistHasFirstTrack((tracksResult.count ?? 0) > 0);
      }

      // Payout check: fire and forget with a 4-second cap so it never blocks the UI
      if (session) {
        Promise.race([
          walletService.getWithdrawalMethods(session),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 4000)
          ),
        ])
          .then((result: any) => {
            const count = result?.count ?? result?.methods?.length ?? 0;
            if (count > 0) setChecklistHasPayoutMethod(true);
          })
          .catch(() => {}); // Silently ignore — step stays incomplete
      }
    } catch {
      // Non-critical — checklist shows incomplete state until data loads
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    loadEarnings();
    if (userId === user?.id) loadChecklistData();
  };

  // ============================================================================
  // EARNINGS SECTION (Section 0 - First)
  // ============================================================================

  const renderEarningsSection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Earnings & Payouts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods' as never)}>
            <Text style={[styles.editButton, { color: theme.colors.primary }]}>Payment Setup</Text>
          </TouchableOpacity>
        </View>

        {loadingEarnings ? (
          <View style={styles.earningsLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.earningsLoadingText, { color: theme.colors.textSecondary }]}>Loading earnings...</Text>
          </View>
        ) : earnings ? (
          <>
            <View style={styles.earningsCards}>
              {/* Total Earnings Card */}
              <View style={[styles.earningsCard, { backgroundColor: theme.colors.accentPurple + '15', borderColor: theme.colors.accentPurple + '40' }]}>
                <Ionicons name="trophy" size={24} color={theme.colors.accentPurple} />
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>Total Earnings</Text>
                <Text style={[styles.earningsValue, { color: theme.colors.text }]}>
                  {earnings.currency} {(earnings.totalEarnings ?? 0).toFixed(2)}
                </Text>
              </View>

              {/* Available Balance Card */}
              <View style={[styles.earningsCard, { backgroundColor: '#34d399' + '15', borderColor: '#34d399' + '40' }]}>
                <Ionicons name="wallet" size={24} color="#34d399" />
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>Available</Text>
                <Text style={[styles.earningsValue, { color: theme.colors.text }]}>
                  {earnings.currency} {(earnings.availableBalance ?? 0).toFixed(2)}
                </Text>
              </View>

              {/* Pending Balance Card */}
              <View style={[styles.earningsCard, { backgroundColor: '#facc15' + '15', borderColor: '#facc15' + '40' }]}>
                <Ionicons name="time" size={24} color="#facc15" />
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
                <Text style={[styles.earningsValue, { color: theme.colors.text }]}>
                  {earnings.currency} {(earnings.pendingBalance ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Request Payout Button */}
            <TouchableOpacity
              style={styles.payoutButton}
              onPress={() => navigation.navigate('RequestPayout' as never)}
              disabled={earnings.availableBalance <= 0}
            >
              <LinearGradient
                colors={earnings.availableBalance > 0 ? ['#34d399', '#10b981'] : ['#6b7280', '#6b7280']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payoutButtonGradient}
              >
                <Ionicons name="cash" size={20} color="#FFFFFF" />
                <Text style={styles.payoutButtonText}>
                  {earnings.availableBalance > 0 ? 'Request Payout' : 'No Balance to Withdraw'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={[styles.earningsInfo, { color: theme.colors.textMuted }]}>
              Available balance can be withdrawn anytime. Pending balance includes funds from recent bookings that are still processing.
            </Text>
          </>
        ) : (
          <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
            <Ionicons name="cash-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No earnings yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
              Complete bookings to start earning. Your earnings will appear here.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // BADGES SECTION (Section 1)
  // ============================================================================

  const renderBadgesSection = () => {
    if (!badgeInsights) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Badges</Text>

        <View style={styles.badgeContent}>
          {badgeInsights.current_tier && (
            <View style={[styles.badgeTierCard, { backgroundColor: theme.colors.accentPurple + '20', borderColor: theme.colors.accentPurple + '40' }]}>
              <Ionicons name="shield-checkmark" size={32} color={theme.colors.accentPurple} />
              <Text style={[styles.badgeTierLabel, { color: theme.colors.textSecondary }]}>Current Badge</Text>
              <Text style={[styles.badgeTierValue, { color: theme.colors.text }]}>
                {badgeInsights.current_tier.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
          )}

          {badgeInsights.completed_booking_count !== undefined && (
            <View style={styles.badgeStats}>
              <View style={styles.badgeStat}>
                <Text style={[styles.badgeStatValue, { color: theme.colors.text }]}>{badgeInsights.completed_booking_count || 0}</Text>
                <Text style={[styles.badgeStatLabel, { color: theme.colors.textSecondary }]}>Completed Bookings</Text>
              </View>
              {badgeInsights.average_rating != null && (
                <View style={styles.badgeStat}>
                  <Text style={[styles.badgeStatValue, { color: theme.colors.text }]}>
                    {badgeInsights.average_rating.toFixed(1)}
                  </Text>
                  <Text style={[styles.badgeStatLabel, { color: theme.colors.textSecondary }]}>Average Rating</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ============================================================================
  // VERIFICATION SECTION (Section 2)
  // ============================================================================

  const renderVerificationSection = () => {
    const serverState = badgeInsights?.verified_professional_state;
    const isVerified =
      confirmedVerified ||
      serverState === 'verified_premium' ||
      serverState === 'verified_downgraded' ||
      verificationStatus?.status === 'approved' ||
      !!profile?.is_verified;

    const isPremium =
      !!badgeInsights?.active_premium ||
      subscriptionTier === 'premium' ||
      subscriptionTier === 'unlimited';

    const isPending = !isVerified && verificationStatus?.status === 'pending';

    // State 0: Pending review → submitted to Persona, awaiting decision
    if (isPending) {
      return (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Verification</Text>
          <View style={[styles.verificationComingSoon, { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '30' }]}>
            <Ionicons name="time-outline" size={40} color="#F59E0B" />
            <Text style={[styles.verificationComingSoonTitle, { color: theme.colors.text }]}>
              Verification Under Review
            </Text>
            <Text style={[styles.verificationComingSoonBody, { color: theme.colors.textSecondary }]}>
              Your identity check has been submitted and is being reviewed. This usually takes a few minutes. You'll be notified once it's complete.
            </Text>
          </View>
        </View>
      );
    }

    // State 1: Verified + Active Premium → show active badge
    if (isVerified && isPremium) {
      return (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Verification</Text>
          <View style={[styles.verifiedBanner, { backgroundColor: '#34d399' + '15', borderColor: '#34d399' + '40' }]}>
            <Ionicons name="shield-checkmark" size={32} color="#34d399" />
            <View style={styles.verifiedBannerText}>
              <Text style={[styles.verifiedTitle, { color: '#34d399' }]}>Verified Professional</Text>
              <Text style={[styles.verifiedSubtitle, { color: theme.colors.textSecondary }]}>
                Your identity has been verified. The Verified Professional badge is visible to clients on your profile.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // State 2: Verified + Downgraded → badge hidden, show re-subscribe nudge
    if (isVerified && !isPremium) {
      return (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Verification</Text>
          <View style={[styles.verificationComingSoon, { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '30' }]}>
            <Ionicons name="shield-outline" size={40} color="#F59E0B" />
            <Text style={[styles.verificationComingSoonTitle, { color: theme.colors.text }]}>
              Badge Hidden
            </Text>
            <Text style={[styles.verificationComingSoonBody, { color: theme.colors.textSecondary }]}>
              You're identity-verified but your Premium subscription is inactive. Your{' '}
              <Text style={{ color: '#F59E0B', fontWeight: '600' }}>Verified Professional</Text>
              {' '}badge is hidden until you reactivate Premium. Your verification record is saved — no re-verification needed.
            </Text>
            <TouchableOpacity
              style={[styles.comingSoonBadge, { backgroundColor: theme.colors.primary + '20', marginTop: 12 }]}
              onPress={() => navigation.navigate('Upgrade' as never)}
            >
              <Ionicons name="arrow-up-circle-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.comingSoonText, { color: theme.colors.primary, fontWeight: '600' }]}>
                Reactivate Premium to restore your badge
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // State 3: Not verified + Active Premium → show verify CTA
    if (!isVerified && isPremium) {
      return (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Verification</Text>
          <View style={[styles.verificationComingSoon, { backgroundColor: theme.colors.accentPurple + '10', borderColor: theme.colors.accentPurple + '30' }]}>
            <Ionicons name="shield-outline" size={40} color={theme.colors.accentPurple} />
            <Text style={[styles.verificationComingSoonTitle, { color: theme.colors.text }]}>
              Get Verified Professional
            </Text>
            <Text style={[styles.verificationComingSoonBody, { color: theme.colors.textSecondary }]}>
              As a Premium member, you can complete identity verification and earn your{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Verified Professional</Text>
              {' '}badge. Verified creators are significantly more likely to receive bookings.
            </Text>
            <View style={styles.verificationBenefits}>
              {[
                'Verified Professional badge on your profile',
                'Higher visibility in search results',
                'Increased client trust and bookings',
                'Signals accountability to every client',
              ].map((benefit) => (
                <View key={benefit} style={styles.verificationBenefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentPurple} />
                  <Text style={[styles.verificationBenefitText, { color: theme.colors.textSecondary }]}>{benefit}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                { backgroundColor: theme.colors.accentPurple },
                startingVerification && { opacity: 0.6 },
              ]}
              onPress={handleStartVerification}
              disabled={startingVerification}
            >
              {startingVerification ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.verifyButtonText}>Start Verification</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.verificationDisclaimer, { color: theme.colors.textSecondary }]}>
              You'll be taken to a secure identity check. It takes about 2 minutes.
            </Text>
          </View>
        </View>
      );
    }

    // State 4: Not verified + Free → upgrade prompt only, no verification mention
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Verification</Text>
        <View style={[styles.verificationComingSoon, { backgroundColor: theme.colors.accentPurple + '10', borderColor: theme.colors.accentPurple + '30' }]}>
          <Ionicons name="shield-outline" size={40} color={theme.colors.accentPurple} />
          <Text style={[styles.verificationComingSoonTitle, { color: theme.colors.text }]}>
            Verified Professional Badge
          </Text>
          <Text style={[styles.verificationComingSoonBody, { color: theme.colors.textSecondary }]}>
            Upgrade to Premium to unlock identity verification and earn your{' '}
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Verified Professional</Text>
            {' '}badge. Verified creators are significantly more likely to get booked.
          </Text>
          <View style={styles.verificationBenefits}>
            {[
              'Verified Professional badge on your profile',
              'Higher visibility in search results',
              'Increased client trust and bookings',
              'Included with Premium at £6.99/month',
            ].map((benefit) => (
              <View key={benefit} style={styles.verificationBenefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentPurple} />
                <Text style={[styles.verificationBenefitText, { color: theme.colors.textSecondary }]}>{benefit}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.comingSoonBadge, { backgroundColor: theme.colors.primary + '20', marginTop: 4 }]}
            onPress={() => navigation.navigate('Upgrade' as never)}
          >
            <Ionicons name="arrow-up-circle-outline" size={14} color={theme.colors.primary} />
            <Text style={[styles.comingSoonText, { color: theme.colors.primary, fontWeight: '600' }]}>
              Become a Premium Member
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============================================================================
  // PROFILE SECTION (Section 3)
  // ============================================================================

  const renderProfileSection = () => {
    if (!profile) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ServiceProviderOnboarding' as never)}>
            <Text style={[styles.editButton, { color: theme.colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileContent}>
          <Text style={[styles.profileDisplayName, { color: theme.colors.text }]}>{profile.display_name || 'Service Provider'}</Text>
          {profile.headline && <Text style={[styles.profileHeadline, { color: theme.colors.textSecondary }]}>{profile.headline}</Text>}
          {profile.bio && <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>{profile.bio}</Text>}

          {profile.categories && profile.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              {profile.categories.map((cat) => (
                <View key={cat} style={[styles.categoryChip, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                    {getServiceCategoryLabel(cat)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {profile.default_rate && (
            <View style={styles.rateDisplay}>
              <Text style={[styles.rateLabel, { color: theme.colors.textSecondary }]}>Default Rate:</Text>
              <Text style={[styles.rateValue, { color: theme.colors.text }]}>
                {profile.rate_currency || 'USD'} {profile.default_rate.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ============================================================================
  // BOOKINGS SECTION
  // ============================================================================

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'decline' | 'complete' | 'cancel') => {
    if (!session) return;

    let newStatus: string;
    switch (action) {
      case 'confirm':
        newStatus = 'confirmed_awaiting_payment';
        break;
      case 'decline':
      case 'cancel':
        newStatus = 'cancelled';
        break;
      case 'complete':
        newStatus = 'completed';
        break;
      default:
        return;
    }

    try {
      await updateBookingStatus(userId, bookingId, newStatus as any, undefined, { session });
      await loadDashboardData();
      Alert.alert('Success', `Booking ${action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'cancelled'}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#facc15'; // yellow
      case 'confirmed_awaiting_payment':
        return '#60a5fa'; // blue
      case 'paid':
      case 'completed':
        return '#34d399'; // green
      case 'cancelled':
        return '#f87171'; // red
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderBookingsSection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Bookings</Text>

        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <View key={booking.id} style={[styles.bookingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingClientInfo}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="person" size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.bookingClientName, { color: theme.colors.text }]}>
                      {booking.booker?.display_name || booking.booker?.username || 'Client'}
                    </Text>
                    <Text style={[styles.bookingId, { color: theme.colors.textMuted }]}>ID: {booking.id.substring(0, 8)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(booking.status) }]}>
                    {booking.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <Text style={[styles.bookingOffering, { color: theme.colors.text }]}>
                  {booking.offering?.title || 'Custom service'}
                </Text>
                {booking.scheduled_start && booking.scheduled_end && (
                  <Text style={[styles.bookingTime, { color: theme.colors.textSecondary }]}>
                    {new Date(booking.scheduled_start).toLocaleString()} → {new Date(booking.scheduled_end).toLocaleString()}
                  </Text>
                )}
                <Text style={[styles.bookingAmount, { color: theme.colors.text }]}>
                  {booking.currency} {booking.price_total?.toFixed(2) || '0.00'}
                </Text>
              </View>

              {booking.booking_notes && (
                <Text style={[styles.bookingNotes, { color: theme.colors.textSecondary }]}>{booking.booking_notes}</Text>
              )}

              <View style={styles.bookingActions}>
                {booking.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#34d399' }]}
                      onPress={() => handleBookingAction(booking.id, 'confirm')}
                    >
                      <Text style={styles.actionButtonText}>Confirm Slot</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#f87171' }]}
                      onPress={() => handleBookingAction(booking.id, 'decline')}
                    >
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </>
                )}
                {booking.status === 'confirmed_awaiting_payment' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#f87171' }]}
                    onPress={() => handleBookingAction(booking.id, 'cancel')}
                  >
                    <Text style={styles.actionButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
                {booking.status === 'paid' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleBookingAction(booking.id, 'complete')}
                  >
                    <LinearGradient colors={['#34d399', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.completeButtonGradient}>
                      <Text style={styles.actionButtonText}>Mark Completed</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No bookings yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
              Bookings will appear here when clients request your services.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // OFFERINGS SECTION
  // ============================================================================

  const handleSaveOffering = async () => {
    if (!offeringForm.title.trim() || !offeringForm.rate_amount || offeringForm.rate_amount <= 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!session) return;

    try {
      if (editingOffering) {
        await updateServiceOffering(userId, editingOffering.id, offeringForm, { session });
        Alert.alert('Success', 'Offering updated');
      } else {
        await createServiceOffering(userId, offeringForm, { session });
        Alert.alert('Success', 'Offering created');
      }
      setShowOfferingForm(false);
      setEditingOffering(null);
      setOfferingForm({
        title: '',
        category: 'sound_engineering',
        rate_amount: 0,
        rate_currency: 'USD',
        rate_unit: 'per_hour',
        is_active: true,
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error saving offering:', error);
      Alert.alert('Error', 'Failed to save offering');
    }
  };

  const handleEditOffering = (offering: ServiceOffering) => {
    setEditingOffering(offering);
    setOfferingForm({
      title: offering.title,
      category: offering.category as ServiceCategory,
      rate_amount: offering.rate_amount ?? 0,
      rate_currency: offering.rate_currency,
      rate_unit: (offering.rate_unit ?? 'per_hour') as ServiceOfferingInput['rate_unit'],
      is_active: offering.is_active ?? true,
      description: offering.description ?? '',
    });
    setShowOfferingForm(true);
  };

  const handleDeleteOffering = async (offeringId: string) => {
    Alert.alert('Delete Offering', 'Are you sure you want to delete this offering?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deleteServiceOffering(userId, offeringId, { session });
            await loadDashboardData();
            Alert.alert('Success', 'Offering deleted');
          } catch (error) {
            console.error('Error deleting offering:', error);
            Alert.alert('Error', 'Failed to delete offering');
          }
        },
      },
    ]);
  };

  const handleToggleOfferingActive = async (offering: ServiceOffering) => {
    if (!session) return;
    try {
      await updateServiceOffering(userId, offering.id, { is_active: !offering.is_active }, { session });
      await loadDashboardData();
    } catch (error) {
      console.error('Error toggling offering:', error);
      Alert.alert('Error', 'Failed to update offering');
    }
  };

  const renderOfferingsSection = () => {
    const offerings = profile?.offerings || [];

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Service Offerings</Text>

        {/* Offering Form */}
        {showOfferingForm && (
          <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              {editingOffering ? 'Edit Offering' : 'Add New Offering'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Title (e.g., Full mix & master)"
              placeholderTextColor={theme.colors.textMuted}
              value={offeringForm.title}
              onChangeText={(text) => setOfferingForm((prev) => ({ ...prev, title: text }))}
            />

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
                <TouchableOpacity
                  style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                    {getServiceCategoryLabel(offeringForm.category)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formRowItem}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Rate Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="150.00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={offeringForm.rate_amount?.toString() || ''}
                  onChangeText={(text) => setOfferingForm((prev) => ({ ...prev, rate_amount: parseFloat(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Currency</Text>
                <TouchableOpacity
                  style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                    {offeringForm.rate_currency} - {currencyService.getCurrencyName(offeringForm.rate_currency)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formRowItem}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Rate Unit</Text>
                <TouchableOpacity
                  style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowRateUnitPicker(true)}
                >
                  <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                    {offeringForm.rate_unit.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={offeringForm.description || ''}
              onChangeText={(text) => setOfferingForm((prev) => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, offeringForm.is_active && styles.checkboxChecked]}
                onPress={() => setOfferingForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
              >
                {offeringForm.is_active && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>Active by default</Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowOfferingForm(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveOffering}>
                <LinearGradient colors={['#f97316', '#fb7185']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>{editingOffering ? 'Update' : 'Add'} Offering</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add Offering Button */}
        {!showOfferingForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowOfferingForm(true)}>
            <LinearGradient colors={['#f97316', '#fb7185']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addButtonGradient}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add offering</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Offerings List */}
        {offerings.length > 0 ? (
          offerings.map((offering) => (
            <View key={offering.id} style={[styles.offeringCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.offeringHeader}>
                <View style={styles.offeringTitleRow}>
                  <Text style={[styles.offeringTitle, { color: theme.colors.text }]}>{offering.title}</Text>
                  {offering.is_active && (
                    <View style={[styles.activeBadge, { backgroundColor: '#34d399' + '20' }]}>
                      <Text style={[styles.activeBadgeText, { color: '#34d399' }]}>Active</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[styles.offeringCategory, { color: theme.colors.textSecondary }]}>
                {getServiceCategoryLabel(offering.category)}
              </Text>

              <Text style={[styles.offeringRate, { color: theme.colors.text }]}>
                {offering.rate_amount} {offering.rate_currency} / {(offering.rate_unit ?? '').replace(/_/g, ' ')}
              </Text>

              {offering.description && (
                <Text style={[styles.offeringDescription, { color: theme.colors.textSecondary }]}>{offering.description}</Text>
              )}

              <View style={styles.offeringActions}>
                <TouchableOpacity
                  style={[styles.offeringActionButton, { backgroundColor: theme.colors.primary + '20' }]}
                  onPress={() => handleToggleOfferingActive(offering)}
                >
                  <Ionicons name={offering.is_active ? 'eye-off' : 'eye'} size={16} color={theme.colors.primary} />
                  <Text style={[styles.offeringActionText, { color: theme.colors.primary }]}>
                    {offering.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.offeringActionButton, { backgroundColor: theme.colors.accentBlue + '20' }]}
                  onPress={() => handleEditOffering(offering)}
                >
                  <Ionicons name="create" size={16} color={theme.colors.accentBlue} />
                  <Text style={[styles.offeringActionText, { color: theme.colors.accentBlue }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.offeringActionButton, { backgroundColor: '#f87171' + '20' }]}
                  onPress={() => handleDeleteOffering(offering.id)}
                >
                  <Ionicons name="trash" size={16} color="#f87171" />
                  <Text style={[styles.offeringActionText, { color: '#f87171' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          !showOfferingForm && (
            <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                You haven't added any offerings yet. Use the form above to outline your services.
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  // ============================================================================
  // PORTFOLIO SECTION
  // ============================================================================

  const handleSavePortfolioItem = async () => {
    if (!portfolioForm.media_url.trim()) {
      Alert.alert('Error', 'Please provide a media URL');
      return;
    }

    if (!session) return;

    try {
      await addPortfolioItem(userId, portfolioForm, { session });
      Alert.alert('Success', 'Portfolio item added');
      setShowPortfolioForm(false);
      setPortfolioForm({
        media_url: '',
        thumbnail_url: '',
        caption: '',
        sort_order: 0,
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      Alert.alert('Error', 'Failed to add portfolio item');
    }
  };

  const handleDeletePortfolioItem = async (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this portfolio item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deletePortfolioItem(userId, itemId, { session });
            await loadDashboardData();
            Alert.alert('Success', 'Portfolio item deleted');
          } catch (error) {
            console.error('Error deleting portfolio item:', error);
            Alert.alert('Error', 'Failed to delete portfolio item');
          }
        },
      },
    ]);
  };

  const isVideoUrl = (url: string): boolean => {
    return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const renderPortfolioSection = () => {
    const portfolio = profile?.portfolio || [];

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Portfolio</Text>

        {/* Portfolio Form */}
        {showPortfolioForm && (
          <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>Add Portfolio Item</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Media URL (https://...)"
              placeholderTextColor={theme.colors.textMuted}
              value={portfolioForm.media_url}
              onChangeText={(text) => setPortfolioForm((prev) => ({ ...prev, media_url: text }))}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Thumbnail URL (Optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={portfolioForm.thumbnail_url}
              onChangeText={(text) => setPortfolioForm((prev) => ({ ...prev, thumbnail_url: text }))}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Caption (Optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={portfolioForm.caption}
              onChangeText={(text) => setPortfolioForm((prev) => ({ ...prev, caption: text }))}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPortfolioForm(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePortfolioItem}>
                <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Add Portfolio Item</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add Portfolio Button */}
        {!showPortfolioForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowPortfolioForm(true)}>
            <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addButtonGradient}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add portfolio item</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Portfolio Grid */}
        {portfolio.length > 0 ? (
          <View style={styles.portfolioGrid}>
            {portfolio.map((item) => {
              const isVideo = isVideoUrl(item.media_url);
              return (
                <View key={item.id} style={[styles.portfolioItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.portfolioThumbnail} />
                  ) : (
                    <View style={[styles.portfolioPlaceholder, { backgroundColor: theme.colors.border }]}>
                      <Ionicons name={isVideo ? 'play-circle' : 'image'} size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                  {isVideo && (
                    <View style={styles.playButtonOverlay}>
                      <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={[styles.portfolioCaption, { color: theme.colors.text }]} numberOfLines={2}>
                    {item.caption || 'Portfolio item'}
                  </Text>
                  <Text style={[styles.portfolioDate, { color: theme.colors.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.portfolioActions}>
                    <TouchableOpacity
                      style={styles.portfolioActionButton}
                      onPress={() => (isVideo ? setSelectedVideo(item.media_url) : Linking.openURL(item.media_url))}
                    >
                      <Ionicons name="open-outline" size={16} color={theme.colors.accentBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.portfolioActionButton} onPress={() => handleDeletePortfolioItem(item.id)}>
                      <Ionicons name="trash" size={16} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          !showPortfolioForm && (
            <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No portfolio items yet. Add renders, mixing samples, or behind-the-scenes media to boost trust.
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  // ============================================================================
  // AVAILABILITY SECTION (Section 7)
  // ============================================================================

  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilitySlotInput>({
    start_time: '',
    end_time: '',
    recurrence: 'none',
    is_bookable: true,
  });

  const handleSaveAvailabilitySlot = async () => {
    if (!availabilityForm.start_time || !availabilityForm.end_time) {
      Alert.alert('Error', 'Please provide start and end times');
      return;
    }

    if (!session) return;

    try {
      await addAvailabilitySlot(userId, availabilityForm, { session });
      Alert.alert('Success', 'Availability slot added');
      setShowAvailabilityForm(false);
      setAvailabilityForm({
        start_time: '',
        end_time: '',
        recurrence: 'none',
        is_bookable: true,
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding availability slot:', error);
      Alert.alert('Error', 'Failed to add availability slot');
    }
  };

  const handleDeleteAvailabilitySlot = async (availabilityId: string) => {
    Alert.alert('Delete Slot', 'Are you sure you want to delete this availability slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deleteAvailabilitySlot(userId, availabilityId, { session });
            await loadDashboardData();
            Alert.alert('Success', 'Availability slot deleted');
          } catch (error) {
            console.error('Error deleting availability slot:', error);
            Alert.alert('Error', 'Failed to delete availability slot');
          }
        },
      },
    ]);
  };

  const renderAvailabilitySection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Availability</Text>

        {/* Availability Form */}
        {showAvailabilityForm && (
          <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>Add Availability Slot</Text>

            <Text style={[styles.label, { color: theme.colors.text }]}>Start Time</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="YYYY-MM-DDTHH:mm (ISO 8601)"
              placeholderTextColor={theme.colors.textMuted}
              value={availabilityForm.start_time}
              onChangeText={(text) => setAvailabilityForm((prev) => ({ ...prev, start_time: text }))}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>End Time</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="YYYY-MM-DDTHH:mm (ISO 8601)"
              placeholderTextColor={theme.colors.textMuted}
              value={availabilityForm.end_time}
              onChangeText={(text) => setAvailabilityForm((prev) => ({ ...prev, end_time: text }))}
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, availabilityForm.is_bookable && styles.checkboxChecked]}
                onPress={() => setAvailabilityForm((prev) => ({ ...prev, is_bookable: !prev.is_bookable }))}
              >
                {availabilityForm.is_bookable && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>Clients can book this slot</Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAvailabilityForm(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAvailabilitySlot}>
                <LinearGradient colors={['#14b8a6', '#3b82f6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Add Slot</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add Slot Button */}
        {!showAvailabilityForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAvailabilityForm(true)}>
            <LinearGradient colors={['#14b8a6', '#3b82f6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addButtonGradient}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add slot</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Availability List */}
        {availability.length > 0 ? (
          availability.map((slot) => (
            <View key={slot.id} style={[styles.availabilityCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.availabilityHeader}>
                <View style={styles.availabilityTimeRange}>
                  <Text style={[styles.availabilityTime, { color: theme.colors.text }]}>
                    {new Date((slot as any).start_at ?? (slot as any).start_time).toLocaleString()} → {new Date((slot as any).end_at ?? (slot as any).end_time).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (slot.is_bookable ? '#34d399' : '#f87171') + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: slot.is_bookable ? '#34d399' : '#f87171' }]}>
                    {slot.is_bookable ? 'Bookable' : 'Unavailable'}
                  </Text>
                </View>
              </View>
              {(slot as any).recurrence_rule && (slot as any).recurrence_rule !== 'none' && (
                <View style={styles.recurringIndicator}>
                  <Ionicons name="repeat" size={16} color={theme.colors.accentPurple} />
                  <Text style={[styles.recurringText, { color: theme.colors.textSecondary }]}>Recurring</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteAvailabilitySlot(slot.id)}
              >
                <Ionicons name="trash" size={16} color="#f87171" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          !showAvailabilityForm && (
            <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                You haven't added any availability slots yet. Add recurring or one-off availability to accept bookings.
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  // ============================================================================
  // GIG ALERTS SECTION (Section 9)
  // ============================================================================

  const renderGigAlertsSection = () => {
    const saveGigAlerts = async (updated: GigAlertPreferences) => {
      setSavingGigAlerts(true);
      await serviceDiscoveryService.saveGigAlertPreferences(userId, updated);
      setSavingGigAlerts(false);
    };

    const toggleAlertCategory = (cat: string) => {
      setGigAlertPrefs((prev) => {
        const current = prev.alert_categories ?? [];
        const next = current.includes(cat as any)
          ? current.filter((c) => c !== cat)
          : [...current, cat as any];
        const updated = { ...prev, alert_categories: next.length > 0 ? next : null };
        saveGigAlerts(updated);
        return updated;
      });
    };

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <View style={[styles.sectionHeader, { marginBottom: 4 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gig Alerts</Text>
          {savingGigAlerts && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
        <Text style={[styles.gigAlertsSubtitle, { color: theme.colors.textSecondary }]}>
          Get notified when someone near you needs your services.
        </Text>

        {/* Master toggle */}
        <View style={[styles.gigAlertRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.gigAlertLabel, { color: theme.colors.text }]}>Enable gig notifications</Text>
          <Switch
            value={gigAlertPrefs.gig_alerts_enabled}
            onValueChange={(v) => {
              const updated = { ...gigAlertPrefs, gig_alerts_enabled: v };
              setGigAlertPrefs(updated);
              saveGigAlerts(updated);
            }}
            trackColor={{ false: theme.colors.border, true: '#DC2626' }}
            thumbColor="#fff"
          />
        </View>

        {/* Category selection */}
        {gigAlertPrefs.gig_alerts_enabled && (
          <>
            <Text style={[styles.gigAlertSectionLabel, { color: theme.colors.textSecondary }]}>
              NOTIFY ME FOR
            </Text>
            <Text style={[styles.gigAlertHint, { color: theme.colors.textSecondary }]}>
              Select categories. Leave all unselected for all gig types.
            </Text>
            <View style={styles.gigCategoryChips}>
              {SERVICE_CATEGORY_OPTIONS.map(({ value, label }) => {
                const selected = (gigAlertPrefs.alert_categories ?? []).includes(value as any);
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.gigCategoryChip,
                      {
                        backgroundColor: selected ? '#DC2626' : theme.colors.surface,
                        borderColor: selected ? '#DC2626' : theme.colors.border,
                      },
                    ]}
                    onPress={() => toggleAlertCategory(value)}
                  >
                    <Text style={[styles.gigCategoryChipText, { color: selected ? '#fff' : theme.colors.text }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Availability */}
            <Text style={[styles.gigAlertSectionLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
              AVAILABILITY
            </Text>
            {(
              [
                { value: 'available', label: 'Available now' },
                { value: 'not_available', label: 'Not available' },
              ] as const
            ).map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={styles.availabilityRow}
                onPress={() => {
                  const updated = { ...gigAlertPrefs, availability_status: value };
                  setGigAlertPrefs(updated);
                  saveGigAlerts(updated);
                }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: gigAlertPrefs.availability_status === value ? '#DC2626' : theme.colors.border },
                  ]}
                >
                  {gigAlertPrefs.availability_status === value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={[styles.availabilityLabel, { color: theme.colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  };

  // REVIEWS SECTION (Section 8)
  // ============================================================================

  const renderReviewsSection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Reviews</Text>

        {reviews.length > 0 ? (
          reviews.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.reviewHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="person" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.reviewInfo}>
                  <Text style={[styles.reviewerName, { color: theme.colors.text }]}>
                    {review.reviewer_id ? `User ${review.reviewer_id.substring(0, 8)}` : 'Anonymous'}
                  </Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= review.rating ? '#facc15' : theme.colors.textMuted}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.reviewDate, { color: theme.colors.textMuted }]}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>

              {review.comment && <Text style={[styles.reviewComment, { color: theme.colors.textSecondary }]}>{review.comment}</Text>}
              {review.booking_id && (
                <Text style={[styles.reviewBookingRef, { color: theme.colors.textMuted }]}>
                  Booking: {review.booking_id.substring(0, 8)}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { borderColor: theme.colors.borderCard }]}>
            <Ionicons name="star-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No reviews yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
              Reviews from clients will appear here after completed bookings.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Main Background Gradient - Uses theme colors */}
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <BackButton onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Profile' as never);
            }
          }} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Service Provider Dashboard</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading dashboard...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isOwnDashboard = userId === user?.id;

  const checklistHasCompletedProfile = !!(
    checklistBasicProfile?.display_name &&
    checklistBasicProfile?.avatar_url &&
    checklistBasicProfile?.bio &&
    (checklistBasicProfile?.genres?.length ?? 0) > 0
  );

  const checklistHasSpProfile = !!(
    (profile?.categories?.length ?? 0) > 0 &&
    profile?.headline
  );

  const checklistHasVerification =
    profile?.is_verified === true ||
    verificationStatus?.status === 'approved' ||
    verificationStatus?.status === 'pending';

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Profile' as never);
          }
        }} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Service Provider Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.contentWrapper}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Getting Started checklist — own dashboard only, hidden once all steps complete */}
        {isOwnDashboard && (
          <GettingStartedChecklist
            userId={userId}
            hasCompletedProfile={checklistHasCompletedProfile}
            hasSpProfile={checklistHasSpProfile}
            hasPayoutMethod={checklistHasPayoutMethod}
            hasVerification={checklistHasVerification}
            hasFirstTrack={checklistHasFirstTrack}
            onGoToProfile={() => navigation.navigate('Profile' as never)}
            onGoToSpOnboarding={() => navigation.navigate('ServiceProviderOnboarding' as never)}
            onGoToPaymentMethods={() => navigation.navigate('PaymentMethods' as never)}
            onStartVerification={handleStartVerification}
            onGoToUpload={() => navigation.navigate('Upload' as never)}
          />
        )}

        {/* Section 0: Earnings & Payouts */}
        {renderEarningsSection()}

        {/* Section 1: Badges */}
        {renderBadgesSection()}

        {/* Section 2: Verification */}
        {renderVerificationSection()}

        {/* Section 3: Profile */}
        {renderProfileSection()}

        {/* Section 4: Bookings */}
        {renderBookingsSection()}

        {/* Section 5: Offerings */}
        {renderOfferingsSection()}

        {/* Section 6: Portfolio */}
        {renderPortfolioSection()}

        {/* Section 7: Availability */}
        {renderAvailabilitySection()}

        {/* Section 8: Reviews */}
        {renderReviewsSection()}

        {/* Section 9: Gig Alerts */}
        {renderGigAlertsSection()}
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {SUPPORTED_CURRENCIES.map((currency) => {
                const currencyInfo = currencyService.getCurrencyInfo(currency);
                const isSelected = offeringForm.rate_currency === currency;
                return (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      {
                        backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      setOfferingForm((prev) => ({ ...prev, rate_currency: currency }));
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <View style={styles.currencyOptionContent}>
                      <Text style={[styles.currencyCode, { color: theme.colors.text }]}>{currency}</Text>
                      <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>
                        {currencyInfo.name} ({currencyInfo.symbol})
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {SERVICE_CATEGORIES.map((category) => {
                const isSelected = offeringForm.category === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.currencyOption,
                      {
                        backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      setOfferingForm((prev) => ({ ...prev, category }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={styles.currencyOptionContent}>
                      <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                        {getServiceCategoryLabel(category)}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rate Unit Picker Modal */}
      <Modal visible={showRateUnitPicker} transparent animationType="slide" onRequestClose={() => setShowRateUnitPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Rate Unit</Text>
              <TouchableOpacity onPress={() => setShowRateUnitPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            {(['per_hour', 'per_track', 'per_project', 'fixed'] as const).map((unit) => {
              const isSelected = offeringForm.rate_unit === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.currencyOption,
                    {
                      backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setOfferingForm((prev) => ({ ...prev, rate_unit: unit }));
                    setShowRateUnitPicker(false);
                  }}
                >
                  <View style={styles.currencyOptionContent}>
                    <Text style={[styles.currencyCode, { color: theme.colors.text }]}>
                      {unit.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={selectedVideo !== null} transparent animationType="fade" onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedVideo(null)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedVideo && getVideoEmbedUrl(selectedVideo) && (
              <View style={styles.videoContainer}>
                {/* Note: In a real app, you'd use react-native-webview or similar for embedded videos */}
                <Text style={styles.videoPlaceholder}>Video Player</Text>
                <Text style={styles.videoUrl}>{getVideoEmbedUrl(selectedVideo)}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Gig Alerts Section
  gigAlertsSubtitle: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 18,
    marginBottom: 16,
  },
  gigAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  gigAlertLabel: {
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: -0.4,
    flex: 1,
  },
  gigAlertSectionLabel: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  gigAlertHint: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  gigCategoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gigCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  gigCategoryChipText: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  availabilityLabel: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Profile Section
  profileContent: {
    gap: 12,
  },
  profileDisplayName: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileHeadline: {
    fontSize: 16,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateLabel: {
    fontSize: 14,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Bookings Section
  bookingCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingClientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookingId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 12,
    gap: 4,
  },
  bookingOffering: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookingTime: {
    fontSize: 14,
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  bookingNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  completeButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Offerings Section
  formCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formRowItem: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  offeringCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  offeringHeader: {
    marginBottom: 8,
  },
  offeringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offeringTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  offeringCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  offeringRate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  offeringDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  offeringActions: {
    flexDirection: 'row',
    gap: 8,
  },
  offeringActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  offeringActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Portfolio Section
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  portfolioThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  portfolioPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  portfolioCaption: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  portfolioDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  portfolioActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portfolioActionButton: {
    padding: 8,
  },
  // Empty State
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Video Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  videoUrl: {
    color: '#999999',
    fontSize: 12,
  },
  // Picker bottom sheet (Category, Currency, Rate Unit)
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
  },
  // Legacy Currency Picker Modal (kept for reference, replaced by pickerSheet)
  currencyModalContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 8,
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyOptionContent: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currencyName: {
    fontSize: 14,
  },
  // Badges Section
  badgeContent: {
    gap: 16,
  },
  badgeTierCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  badgeTierLabel: {
    fontSize: 12,
  },
  badgeTierValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  badgeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  badgeStat: {
    alignItems: 'center',
  },
  badgeStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeStatLabel: {
    fontSize: 12,
  },
  // Verification Section
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifiedBannerText: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifiedSubtitle: {
    fontSize: 13,
  },
  verificationComingSoon: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  verificationComingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  verificationComingSoonBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  verificationBenefits: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 4,
  },
  verificationBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationBenefitText: {
    fontSize: 13,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  verificationDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
  // Availability Section
  availabilityCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTimeRange: {
    flex: 1,
  },
  availabilityTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  recurringText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    alignSelf: 'flex-end',
  },
  // Reviews Section
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewBookingRef: {
    fontSize: 12,
  },
  // Earnings Section
  earningsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  earningsLoadingText: {
    fontSize: 14,
  },
  earningsCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  earningsCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  earningsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  payoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  payoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  earningsInfo: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
