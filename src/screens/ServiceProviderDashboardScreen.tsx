import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { currencyService } from '../services/CurrencyService';
import BackButton from '../components/BackButton';
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
  submitVerificationRequest,
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  fetchProviderReviews,
  type ServiceProviderProfileResponse,
  type ServiceOfferingInput,
  type PortfolioItemInput,
  type VerificationRequestInput,
  type AvailabilitySlotInput,
} from '../services/creatorExpansionService';
import type {
  ServiceBooking,
  ServiceCategory,
  ServiceOffering,
  ServicePortfolioItem,
  BadgeInsights,
  VerificationStatusResponse,
  ServiceProviderAvailability,
  ServiceReview,
} from '../types';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'sound_engineering',
  'mixing_mastering',
  'music_production',
  'audio_editing',
  'vocal_tuning',
  'sound_design',
  'audio_restoration',
  'podcast_production',
  'live_sound',
  'consulting',
];

// Get all supported currencies from CurrencyService
const SUPPORTED_CURRENCIES = currencyService.getSupportedCurrencies().sort();

export default function ServiceProviderDashboardScreen() {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get userId from route params or fallback to current user
  const routeParams = route.params as { userId?: string } | undefined;
  const userId = routeParams?.userId || user?.id || '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ServiceProviderProfileResponse | null>(null);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [badgeInsights, setBadgeInsights] = useState<BadgeInsights | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  const [availability, setAvailability] = useState<ServiceProviderAvailability[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);

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
    display_order: 0,
  });

  // Portfolio video modal
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  // Currency picker modal
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

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

      const [profileData, bookingsData, badgeData, verificationData, reviewsData] = await Promise.allSettled([
        fetchServiceProviderProfile(userId, ['offerings', 'portfolio', 'reviews', 'availability'], { session }),
        fetchProviderBookings(userId, { session }),
        fetchBadgeInsights(userId, { session }),
        fetchVerificationStatus(userId, { session }),
        fetchProviderReviews(userId, { session }),
      ]);

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

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
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
              {badgeInsights.average_rating && (
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

  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationForm, setVerificationForm] = useState<VerificationRequestInput>({
    governmentIdUrl: '',
    selfieUrl: '',
    businessDocUrl: '',
    notes: '',
  });

  const handleSubmitVerification = async () => {
    if (!verificationForm.governmentIdUrl.trim() || !verificationForm.selfieUrl.trim()) {
      Alert.alert('Error', 'Please provide Government ID URL and Selfie URL');
      return;
    }

    if (!session) return;

    try {
      await submitVerificationRequest(userId, verificationForm, { session });
      Alert.alert('Success', 'Verification request submitted');
      setShowVerificationForm(false);
      setVerificationForm({
        governmentIdUrl: '',
        selfieUrl: '',
        businessDocUrl: '',
        notes: '',
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification request');
    }
  };

  const renderVerificationSection = () => {
    if (!verificationStatus) return null;

    // Handle prerequisites as object (from API) or array (from type definition)
    // API returns: { [key: string]: { met: boolean; required: boolean; value: any } }
    const prerequisites = verificationStatus.prerequisites;
    
    // Convert object to array if needed
    let prerequisitesArray: Array<{ key: string; label: string; satisfied: boolean; details?: string }> = [];
    
    if (Array.isArray(prerequisites)) {
      // Already an array (legacy format)
      prerequisitesArray = prerequisites;
    } else if (prerequisites && typeof prerequisites === 'object') {
      // Object format from API - convert to array
      const prerequisiteLabels: Record<string, string> = {
        completeProfile: 'Complete Profile',
        activeOffering: 'Active Offering',
        portfolioItems: 'Portfolio Items',
        completedBookings: 'Completed Bookings',
        averageRating: 'Average Rating',
        connectAccount: 'Connect Account',
      };
      
      prerequisitesArray = Object.entries(prerequisites).map(([key, value]: [string, any]) => ({
        key,
        label: prerequisiteLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        satisfied: value.met === true,
        details: value.required ? (value.met ? 'Completed' : 'Required') : 'Optional',
      }));
    }

    const allPrerequisitesMet = prerequisitesArray.length > 0 && prerequisitesArray.every((p) => p.satisfied);

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Verification</Text>

        {/* Prerequisites Checklist */}
        <View style={styles.prerequisitesList}>
          {prerequisitesArray.map((prereq) => (
            <View
              key={prereq.key}
              style={[
                styles.prerequisiteCard,
                { backgroundColor: prereq.satisfied ? '#bbf7d0' + '20' : '#fca5a5' + '20', borderColor: prereq.satisfied ? '#bbf7d0' : '#fca5a5' },
              ]}
            >
              <Ionicons
                name={prereq.satisfied ? 'checkmark-circle' : 'alert-circle'}
                size={24}
                color={prereq.satisfied ? '#34d399' : '#f87171'}
              />
              <View style={styles.prerequisiteContent}>
                <Text style={[styles.prerequisiteLabel, { color: prereq.satisfied ? '#bbf7d0' : '#fca5a5' }]}>
                  {prereq.label}
                </Text>
                {prereq.details && (
                  <Text style={[styles.prerequisiteDetails, { color: theme.colors.textSecondary }]}>{prereq.details}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Last Submission Info */}
        {verificationStatus.last_submission && (
          <View style={[styles.submissionInfo, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.submissionTitle, { color: theme.colors.text }]}>Last Submission</Text>
            <Text style={[styles.submissionDate, { color: theme.colors.textSecondary }]}>
              {new Date(verificationStatus.last_submission.submitted_at).toLocaleString()}
            </Text>
            {verificationStatus.last_submission.notes && (
              <Text style={[styles.submissionNotes, { color: theme.colors.textSecondary }]}>
                {verificationStatus.last_submission.notes}
              </Text>
            )}
          </View>
        )}

        {/* Verification Form */}
        {showVerificationForm && (
          <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>Submit Verification Request</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Government ID URL (required)"
              placeholderTextColor={theme.colors.textMuted}
              value={verificationForm.governmentIdUrl}
              onChangeText={(text) => setVerificationForm((prev) => ({ ...prev, governmentIdUrl: text }))}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Selfie with ID URL (required)"
              placeholderTextColor={theme.colors.textMuted}
              value={verificationForm.selfieUrl}
              onChangeText={(text) => setVerificationForm((prev) => ({ ...prev, selfieUrl: text }))}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Business Document URL (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={verificationForm.businessDocUrl}
              onChangeText={(text) => setVerificationForm((prev) => ({ ...prev, businessDocUrl: text }))}
            />

            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Notes for review (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={verificationForm.notes}
              onChangeText={(text) => setVerificationForm((prev) => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowVerificationForm(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmitVerification}
                disabled={!allPrerequisitesMet}
              >
                <LinearGradient
                  colors={['#DC2626', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.saveButtonGradient, !allPrerequisitesMet && { opacity: 0.5 }]}
                >
                  <Text style={styles.saveButtonText}>Submit Verification Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Submit Button */}
        {!showVerificationForm && verificationStatus.status !== 'approved' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowVerificationForm(true)}
            disabled={!allPrerequisitesMet}
          >
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.addButtonGradient, !allPrerequisitesMet && { opacity: 0.5 }]}
            >
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Submit Verification Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Status Display */}
        {verificationStatus.status === 'approved' && (
          <View style={[styles.statusBadge, { backgroundColor: '#34d399' + '20' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#34d399" />
            <Text style={[styles.statusBadgeText, { color: '#34d399' }]}>Verified</Text>
          </View>
        )}
        {verificationStatus.status === 'pending' && (
          <View style={[styles.statusBadge, { backgroundColor: '#facc15' + '20' }]}>
            <Ionicons name="time" size={20} color="#facc15" />
            <Text style={[styles.statusBadgeText, { color: '#facc15' }]}>Pending Review</Text>
          </View>
        )}
        {verificationStatus.status === 'rejected' && (
          <View style={[styles.statusBadge, { backgroundColor: '#f87171' + '20' }]}>
            <Ionicons name="close-circle" size={20} color="#f87171" />
            <Text style={[styles.statusBadgeText, { color: '#f87171' }]}>Rejected</Text>
          </View>
        )}
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
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
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
      rate_amount: offering.rate_amount,
      rate_currency: offering.rate_currency,
      rate_unit: offering.rate_unit,
      is_active: offering.is_active ?? true,
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
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                    {offeringForm.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
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
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                    {offeringForm.rate_unit.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
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
                {offering.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>

              <Text style={[styles.offeringRate, { color: theme.colors.text }]}>
                {offering.rate_amount} {offering.rate_currency} / {offering.rate_unit.replace(/_/g, ' ')}
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
        display_order: 0,
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
                    {new Date(slot.start_time).toLocaleString()} → {new Date(slot.end_time).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (slot.is_bookable ? '#34d399' : '#f87171') + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: slot.is_bookable ? '#34d399' : '#f87171' }]}>
                    {slot.is_bookable ? 'Bookable' : 'Unavailable'}
                  </Text>
                </View>
              </View>
              {slot.is_recurring && (
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
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.currencyModalContent, { backgroundColor: theme.colors.surface, maxHeight: '70%' }]}>
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
  // Currency Picker Modal
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
  prerequisitesList: {
    gap: 12,
    marginBottom: 16,
  },
  prerequisiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  prerequisiteContent: {
    flex: 1,
  },
  prerequisiteLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  prerequisiteDetails: {
    fontSize: 12,
  },
  submissionInfo: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  submissionDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  submissionNotes: {
    fontSize: 14,
    fontStyle: 'italic',
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
});
