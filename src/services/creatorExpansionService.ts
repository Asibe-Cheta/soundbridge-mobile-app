/**
 * Creator Expansion Service
 * 
 * Centralized API client for creator type expansion features including:
 * - Creator type management
 * - Service provider profiles
 * - Service offerings, portfolio, availability
 * - Bookings and payments
 * - Verification and badges
 * - Reviews and ratings
 */

import { Session } from '@supabase/supabase-js';
import { apiFetch, getApiBaseUrl } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import type {
  CreatorType,
  ServiceProviderCard,
  ServiceProviderProfileResponse,
  ServiceOffering,
  ServicePortfolioItem,
  ServiceProviderAvailability,
  ServiceReview,
  ServiceBooking,
  BookingStatus,
  VerificationStatusResponse,
  BadgeInsights,
  ServiceCategory,
} from '../types';

export interface AuthOptions {
  session?: Session | null;
  accessToken?: string;
}

function buildOptions(options?: AuthOptions): { session?: Session | null; accessToken?: string } {
  return {
    session: options?.session,
    accessToken: options?.accessToken,
  };
}

// ============================================================================
// SERVICE CATEGORY VALIDATION
// ============================================================================

/**
 * Valid service categories as per web app team confirmation
 * Complete list of 9 categories - API will reject any other category
 */
const VALID_SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
] as const;

/**
 * Validate if a category is a valid service category
 */
export function isValidServiceCategory(category: string): category is ServiceCategory {
  return VALID_SERVICE_CATEGORIES.includes(category as ServiceCategory);
}

/**
 * Filter and validate service categories, removing any invalid ones
 * Returns only valid categories that the API will accept
 */
export function validateServiceCategories(categories: string[]): ServiceCategory[] {
  return categories.filter(isValidServiceCategory);
}

// ============================================================================
// CREATOR TYPE MANAGEMENT
// ============================================================================

/**
 * Fetch creator types for a user
 */
export async function fetchCreatorTypes(
  userId: string,
  options?: AuthOptions
): Promise<CreatorType[]> {
  const response = await apiFetch<{ creatorTypes: CreatorType[] }>(
    `/api/users/${userId}/creator-types`,
    {
      method: 'GET',
      ...buildOptions(options),
    }
  );
  return response.creatorTypes || [];
}

/**
 * Update creator types for a user (full replacement)
 * Note: Include all existing types plus new ones - this is a full replacement, not additive
 */
export async function updateCreatorTypes(
  userId: string,
  creatorTypes: CreatorType[],
  options?: AuthOptions
): Promise<{ success: boolean; creatorTypes: CreatorType[] }> {
  return apiFetch(`/api/users/${userId}/creator-types`, {
    method: 'POST',
    body: JSON.stringify({ creatorTypes }),
    ...buildOptions(options),
  });
}

/**
 * Add service_provider creator type to user
 * Convenience function that fetches current types and adds service_provider
 */
export async function becomeServiceProvider(
  userId: string,
  options?: AuthOptions
): Promise<{ success: boolean; creatorTypes: CreatorType[] }> {
  const currentTypes = await fetchCreatorTypes(userId, options);
  
  // Check if already has service_provider
  if (currentTypes.includes('service_provider')) {
    return {
      success: true,
      creatorTypes: currentTypes,
    };
  }

  // Add service_provider to existing types
  const updatedTypes = [...currentTypes, 'service_provider'];
  return updateCreatorTypes(userId, updatedTypes, options);
}

// ============================================================================
// SERVICE PROVIDER PROFILE MANAGEMENT
// ============================================================================

export interface ServiceProviderProfileInput {
  displayName: string; // Required
  headline?: string;
  bio?: string;
  categories?: string[];
  defaultRate?: number;
  rateCurrency?: string;
}

/**
 * Fetch service provider profile
 */
export async function fetchServiceProviderProfile(
  userId: string,
  include?: string[],
  options?: AuthOptions
): Promise<ServiceProviderProfileResponse | null> {
  const includeParam = include?.length ? `?include=${include.join(',')}` : '';
  
  try {
    // Response structure: { provider: ..., offerings?: ..., portfolio?: ..., availability?: ..., reviews?: ... }
    const response = await apiFetch<{
      provider: ServiceProviderProfileResponse;
      offerings?: ServiceOffering[];
      portfolio?: ServicePortfolioItem[];
      availability?: ServiceProviderAvailability[];
      reviews?: ServiceReview[];
    }>(
      `/api/service-providers/${userId}${includeParam}`,
      {
        method: 'GET',
        ...buildOptions(options),
      }
    );
    
    // Transform response to match expected structure
    return {
      ...response.provider,
      offerings: response.offerings,
      portfolio: response.portfolio,
      availability: response.availability,
      reviews: response.reviews,
    } as ServiceProviderProfileResponse;
  } catch (error: any) {
    // Handle 404 - profile doesn't exist yet
    if (error?.status === 404) {
      console.log('ℹ️ Service provider profile not found (404)');
      return null;
    }
    throw error;
  }
}

/**
 * Create or update service provider profile
 */
export async function upsertServiceProviderProfile(
  userId: string,
  profile: ServiceProviderProfileInput,
  options?: AuthOptions
): Promise<ServiceProviderProfileResponse> {
  // Validate categories before sending to API
  const validatedProfile = {
    ...profile,
    categories: profile.categories ? validateServiceCategories(profile.categories) : undefined,
  };

  return apiFetch(`/api/service-providers`, {
    method: 'POST',
    body: JSON.stringify(validatedProfile),
    ...buildOptions(options),
  });
}

// ============================================================================
// SERVICE OFFERINGS MANAGEMENT
// ============================================================================

export interface ServiceOfferingInput {
  title: string; // Required
  category: string; // Required, valid category
  rate_amount: number; // Required
  rate_currency: string; // Required, valid currency
  rate_unit: 'per_hour' | 'per_track' | 'per_project' | 'fixed'; // Required
  is_active?: boolean; // Optional, defaults to true
}

/**
 * List service offerings for a provider
 */
export async function fetchServiceOfferings(
  userId: string,
  options?: AuthOptions
): Promise<ServiceOffering[]> {
  const profile = await fetchServiceProviderProfile(userId, ['offerings'], options);
  return profile?.offerings || [];
}

/**
 * Create a new service offering
 */
export async function createServiceOffering(
  userId: string,
  offering: ServiceOfferingInput,
  options?: AuthOptions
): Promise<ServiceOffering> {
  // Validate category before sending to API
  if (!isValidServiceCategory(offering.category)) {
    throw new Error(`Invalid service category: ${offering.category}. Valid categories: ${VALID_SERVICE_CATEGORIES.join(', ')}`);
  }

  return apiFetch(`/api/service-providers/${userId}/offerings`, {
    method: 'POST',
    body: JSON.stringify(offering),
    ...buildOptions(options),
  });
}

/**
 * Update an existing service offering
 */
export async function updateServiceOffering(
  userId: string,
  offeringId: string,
  updates: Partial<ServiceOfferingInput>,
  options?: AuthOptions
): Promise<ServiceOffering> {
  // Validate category if it's being updated
  if (updates.category && !isValidServiceCategory(updates.category)) {
    throw new Error(`Invalid service category: ${updates.category}. Valid categories: ${VALID_SERVICE_CATEGORIES.join(', ')}`);
  }

  return apiFetch(`/api/service-providers/${userId}/offerings/${offeringId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    ...buildOptions(options),
  });
}

/**
 * Delete a service offering
 */
export async function deleteServiceOffering(
  userId: string,
  offeringId: string,
  options?: AuthOptions
): Promise<void> {
  await apiFetch(`/api/service-providers/${userId}/offerings/${offeringId}`, {
    method: 'DELETE',
    ...buildOptions(options),
  });
}

// ============================================================================
// PORTFOLIO MANAGEMENT
// ============================================================================

export interface PortfolioItemInput {
  media_url: string; // Required, full URL
  thumbnail_url?: string;
  caption?: string;
  display_order?: number;
}

/**
 * Add portfolio item
 */
export async function addPortfolioItem(
  userId: string,
  item: PortfolioItemInput,
  options?: AuthOptions
): Promise<ServicePortfolioItem> {
  return apiFetch(`/api/service-providers/${userId}/portfolio`, {
    method: 'POST',
    body: JSON.stringify(item),
    ...buildOptions(options),
  });
}

/**
 * Delete portfolio item
 */
export async function deletePortfolioItem(
  userId: string,
  itemId: string,
  options?: AuthOptions
): Promise<void> {
  await apiFetch(`/api/service-providers/${userId}/portfolio/${itemId}`, {
    method: 'DELETE',
    ...buildOptions(options),
  });
}

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

export interface AvailabilitySlotInput {
  start_time: string; // Required ISO 8601 datetime
  end_time: string; // Required ISO 8601 datetime
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  is_bookable?: boolean; // Optional, defaults to true
}

/**
 * Add availability slot
 */
export async function addAvailabilitySlot(
  userId: string,
  slot: AvailabilitySlotInput,
  options?: AuthOptions
): Promise<ServiceProviderAvailability> {
  return apiFetch(`/api/service-providers/${userId}/availability`, {
    method: 'POST',
    body: JSON.stringify(slot),
    ...buildOptions(options),
  });
}

/**
 * Delete availability slot
 */
export async function deleteAvailabilitySlot(
  userId: string,
  availabilityId: string,
  options?: AuthOptions
): Promise<void> {
  await apiFetch(`/api/service-providers/${userId}/availability/${availabilityId}`, {
    method: 'DELETE',
    ...buildOptions(options),
  });
}

// ============================================================================
// DISCOVERY & SEARCH
// ============================================================================

export interface DiscoverServiceResponse {
  services?: ServiceProviderCard[];
  items?: ServiceProviderCard[];
}

/**
 * Fetch service providers for discovery feed
 * Falls back to Supabase query if API endpoint is not available
 */
export async function fetchDiscoverServiceProviders(
  options?: AuthOptions
): Promise<ServiceProviderCard[]> {
  try {
    // Try API endpoint first
    const raw = await apiFetch<DiscoverServiceResponse | ServiceProviderCard[]>(
      '/api/discover?tab=services',
      buildOptions(options)
    );

    if (Array.isArray(raw)) {
      return raw;
    }

    if (raw && Array.isArray(raw.services)) {
      return raw.services;
    }

    if (raw && Array.isArray(raw.items)) {
      return raw.items;
    }
  } catch (error: any) {
    // If API endpoint returns 404 or fails, fall back to Supabase query
    if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      console.log('ℹ️ API endpoint not available, querying Supabase directly');
    } else {
      console.warn('⚠️ Error fetching from API, falling back to Supabase:', error);
    }
  }

  // Fallback: Query Supabase directly
  try {
    // First, get service provider profiles
    const { data: providers, error: providersError } = await supabase
      .from('service_provider_profiles')
      .select(`
        user_id,
        display_name,
        headline,
        badge_tier,
        average_rating,
        review_count,
        categories,
        default_rate,
        rate_currency,
        show_payment_protection,
        first_booking_discount_enabled,
        first_booking_discount_percent,
        is_verified
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (providersError) {
      console.error('Error querying service providers from Supabase:', providersError);
      return [];
    }

    if (!providers || providers.length === 0) {
      return [];
    }

    // Get profile data for each provider
    const userIds = providers.map(p => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url, username')
      .in('id', userIds);

    if (profilesError) {
      console.warn('Warning: Could not fetch profile data:', profilesError);
    }

    // Create a map of user_id to profile data
    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // Map to ServiceProviderCard format
    const serviceProviders: ServiceProviderCard[] = providers.map((provider: any) => {
      const profile = profileMap.get(provider.user_id);
      return {
        provider_id: provider.user_id,
        display_name: provider.display_name || '',
        headline: provider.headline,
        badge_tier: provider.badge_tier,
        average_rating: provider.average_rating,
        review_count: provider.review_count,
        categories: provider.categories,
        default_rate: provider.default_rate,
        rate_currency: provider.rate_currency,
        show_payment_protection: provider.show_payment_protection,
        first_booking_discount_enabled: provider.first_booking_discount_enabled,
        first_booking_discount_percent: provider.first_booking_discount_percent,
        image_url: profile?.avatar_url || null,
        cover_image_url: null, // Not available in service_provider_profiles table
        is_verified: provider.is_verified || false,
      };
    });

    return serviceProviders;
  } catch (error) {
    console.error('Error in Supabase fallback query:', error);
    return [];
  }
}

/**
 * Search service providers
 */
export async function searchServiceProviders(
  query: string,
  options?: AuthOptions
): Promise<ServiceProviderCard[]> {
  try {
    const response = await apiFetch<{ results: Array<{ type: string; [key: string]: any }> }>(
      `/api/search?q=${encodeURIComponent(query)}&type=professionals`,
      buildOptions(options)
    );

    // Filter for service type results
    const serviceResults = response.results
      ?.filter((item) => item.type === 'service')
      .map((item) => ({
        provider_id: item.id || item.user_id,
        display_name: item.display_name || '',
        headline: item.headline,
        badge_tier: item.badge_tier,
        average_rating: item.average_rating,
        review_count: item.review_count,
        categories: item.categories,
        price_band: item.price_band,
        default_rate: item.default_rate,
        rate_currency: item.rate_currency,
        show_payment_protection: item.show_payment_protection,
        first_booking_discount_enabled: item.first_booking_discount_enabled,
        first_booking_discount_percent: item.first_booking_discount_percent,
        image_url: item.image_url,
        cover_image_url: item.cover_image_url,
        is_verified: item.is_verified,
      })) || [];

    return serviceResults;
  } catch (error) {
    console.error('❌ Error searching service providers:', error);
    return [];
  }
}

// ============================================================================
// REVIEWS & RATINGS
// ============================================================================

export interface ReviewInput {
  provider_id: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  booking_reference?: string; // Optional booking ID
}

/**
 * Fetch reviews for a service provider
 */
export async function fetchProviderReviews(
  userId: string,
  options?: AuthOptions
): Promise<ServiceReview[]> {
  const profile = await fetchServiceProviderProfile(userId, ['reviews'], options);
  return profile?.reviews || [];
}

/**
 * Submit a review for a service provider
 */
export async function submitProviderReview(
  review: ReviewInput,
  options?: AuthOptions
): Promise<ServiceReview> {
  return apiFetch('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(review),
    ...buildOptions(options),
  });
}

// ============================================================================
// BOOKINGS MANAGEMENT
// ============================================================================

export interface CreateBookingInput {
  providerId: string;
  serviceOfferingId?: string; // Optional if custom booking
  venueId?: string; // Optional
  scheduledStart: string; // Required ISO 8601
  scheduledEnd: string; // Required ISO 8601
  timezone?: string; // Optional, defaults to UTC
  totalAmount: number; // Required
  currency: string; // Required, valid currency code
  bookingNotes?: string; // Optional
  bookingType: 'service' | 'venue'; // Required
}

export interface BookingResponse {
  booking: ServiceBooking;
}

/**
 * Create a booking
 */
export async function createServiceBooking(
  booking: CreateBookingInput,
  options?: AuthOptions
): Promise<BookingResponse> {
  return apiFetch(`/api/bookings`, {
    method: 'POST',
    body: JSON.stringify(booking),
    ...buildOptions(options),
  });
}

/**
 * List bookings for a provider
 */
export async function fetchProviderBookings(
  userId: string,
  options?: AuthOptions
): Promise<ServiceBooking[]> {
  // Response structure: { bookings: ServiceBooking[] }
  const response = await apiFetch<{ bookings: ServiceBooking[] }>(
    `/api/service-providers/${userId}/bookings`,
    {
      method: 'GET',
      ...buildOptions(options),
    }
  );
  return response.bookings || [];
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  userId: string,
  bookingId: string,
  status: BookingStatus,
  notes?: string,
  options?: AuthOptions
): Promise<ServiceBooking> {
  return apiFetch(`/api/service-providers/${userId}/bookings?bookingId=${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
    ...buildOptions(options),
  });
}

// ============================================================================
// PAYMENT INTENT
// ============================================================================

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}

/**
 * Get payment intent for a booking
 */
export async function getBookingPaymentIntent(
  bookingId: string,
  options?: AuthOptions
): Promise<PaymentIntentResponse> {
  return apiFetch(`/api/bookings/${bookingId}/payment-intent`, {
    method: 'POST',
    ...buildOptions(options),
  });
}

/**
 * Confirm payment for a booking
 */
export async function confirmBookingPayment(
  bookingId: string,
  options?: AuthOptions
): Promise<ServiceBooking> {
  return apiFetch(`/api/bookings/${bookingId}/confirm-payment`, {
    method: 'POST',
    ...buildOptions(options),
  });
}

// ============================================================================
// VERIFICATION & BADGES
// ============================================================================

/**
 * Fetch verification status
 */
export async function fetchVerificationStatus(
  userId: string,
  options?: AuthOptions
): Promise<VerificationStatusResponse | null> {
  try {
    // API returns: { status: { verificationStatus: string, prerequisites: object } }
    const response = await apiFetch<{
      status: {
        verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
        prerequisites: {
          [key: string]: {
            met: boolean;
            required: boolean;
            value: any;
          };
        };
      };
    }>(
      `/api/service-providers/${userId}/verification/status`,
      buildOptions(options)
    );
    
    // Transform API response to match VerificationStatusResponse type
    return {
      provider_id: userId,
      status: response.status.verificationStatus,
      prerequisites: response.status.prerequisites, // Keep as object, will be handled in UI
    } as VerificationStatusResponse;
  } catch (error: any) {
    // Handle 404 or 403 gracefully
    if (error?.status === 404 || error?.status === 403) {
      console.warn('⚠️ Verification status not available');
      return null;
    }
    throw error;
  }
}

export interface VerificationRequestInput {
  governmentIdUrl: string; // Required
  selfieUrl: string; // Required
  businessDocUrl?: string; // Optional
  notes?: string; // Optional
}

/**
 * Submit verification request
 */
export async function submitVerificationRequest(
  userId: string,
  request: VerificationRequestInput,
  options?: AuthOptions
): Promise<{ success: boolean; requestId: string }> {
  return apiFetch(`/api/service-providers/${userId}/verification/request`, {
    method: 'POST',
    body: JSON.stringify(request),
    ...buildOptions(options),
  });
}

/**
 * Fetch badge insights
 */
export async function fetchBadgeInsights(
  userId: string,
  options?: AuthOptions
): Promise<BadgeInsights | null> {
  try {
    // Response structure: { insights: BadgeInsights }
    const response = await apiFetch<{ insights: BadgeInsights }>(
      `/api/service-providers/${userId}/badges`,
      {
        method: 'GET',
        ...buildOptions(options),
      }
    );
    return response.insights;
  } catch (error: any) {
    // Handle 404 or other errors gracefully
    if (error?.status === 404 || error?.status === 403) {
      console.warn('⚠️ Badge insights not available');
      return null;
    }
    throw error;
  }
}

export interface TrustSettingsInput {
  showPaymentProtection?: boolean;
  firstBookingDiscountEnabled?: boolean;
  firstBookingDiscountPercent?: number; // 0-50
}

/**
 * Update trust settings (badge settings)
 */
export async function updateTrustSettings(
  userId: string,
  settings: TrustSettingsInput,
  options?: AuthOptions
): Promise<BadgeInsights> {
  return apiFetch(`/api/service-providers/${userId}/badges`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
    ...buildOptions(options),
  });
}

