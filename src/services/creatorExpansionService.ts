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
  return apiFetch(`/api/service-providers`, {
    method: 'POST',
    body: JSON.stringify(profile),
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
 */
export async function fetchDiscoverServiceProviders(
  options?: AuthOptions
): Promise<ServiceProviderCard[]> {
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

  return [];
}

/**
 * Search service providers
 */
export async function searchServiceProviders(
  query: string,
  options?: AuthOptions
): Promise<ServiceProviderCard[]> {
  const response = await apiFetch<{ results: Array<{ type: string; [key: string]: any }> }>(
    `/api/search?query=${encodeURIComponent(query)}`,
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

