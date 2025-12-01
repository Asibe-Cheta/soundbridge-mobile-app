// src/types/index.ts
import type {
  AudioTrack as SupabaseAudioTrack,
  BookingStatus,
  CreatorType,
  ProviderBadgeTier,
  PublicProfile,
  ServiceAvailability,
  ServiceBooking,
  ServiceCategory,
  ServiceOffering,
  ServiceProviderProfile,
  ServiceReview,
} from './database';

export type { BookingStatus, CreatorType, ServiceCategory, ProviderBadgeTier };

// Export block and report types
export type {
  BlockResponse,
  UnblockResponse,
  BlockStatus,
  BlockedUser,
  BlockedUsersListResponse,
} from './block.types';

export type {
  ReportType,
  ContentType,
  ReportContentDto,
  ReportResponse,
} from './report.types';

export interface CreatorSummary {
  id: string;
  username: string;
  display_name: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  location?: string | null;
  country?: string | null;
  genre?: string | null;
  creator_types?: CreatorType[];
  followers_count?: number;
  tracks_count?: number;
  events_count?: number;
  created_at: string;
  updated_at?: string | null;
}

export interface AudioTrack extends SupabaseAudioTrack {
  creator?: Pick<PublicProfile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

export interface EventSummary {
  id: string;
  title: string;
  description?: string | null;
  creator_id: string;
  event_date: string;
  location?: string | null;
  venue?: string | null;
  category?: string | null;
  price_gbp?: number | null;
  price_ngn?: number | null;
  max_attendees?: number | null;
  current_attendees?: number | null;
  likes_count?: number | null;
  image_url?: string | null;
  created_at?: string;
  organizer?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url?: string | null;
  };
}

export interface ServiceProviderCard {
  provider_id: string;
  display_name: string;
  headline?: string | null;
  badge_tier?: ProviderBadgeTier | null;
  average_rating?: number | null;
  review_count?: number | null;
  categories?: ServiceCategory[] | null;
  price_band?: string | null;
  default_rate?: number | null;
  rate_currency?: string | null;
  show_payment_protection?: boolean | null;
  first_booking_discount_enabled?: boolean | null;
  first_booking_discount_percent?: number | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  is_verified?: boolean;
}

export interface ServiceProviderProfileResponse extends ServiceProviderProfile {
  offerings?: ServiceOffering[];
  portfolio?: ServicePortfolioItem[];
  availability?: ServiceAvailability[];
  reviews?: ServiceReview[];
  badge_history?: ProviderBadgeHistoryItem[];
}

export interface ServicePortfolioItem {
  id: string;
  provider_id: string;
  media_url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  sort_order?: number | null;
  created_at: string;
}

export interface ProviderBadgeHistoryItem {
  id: string;
  provider_id: string;
  previous_badge?: ProviderBadgeTier | null;
  new_badge: ProviderBadgeTier;
  changed_at: string;
  context?: Record<string, unknown> | null;
}

export interface VerificationPrerequisite {
  key: string;
  label: string;
  satisfied: boolean;
  details?: string;
}

export interface VerificationStatusResponse {
  provider_id: string;
  status: 'not_requested' | 'pending' | 'approved' | 'rejected';
  requested_at?: string | null;
  reviewed_at?: string | null;
  reviewer?: {
    id: string;
    name?: string | null;
  } | null;
  badges?: {
    current_tier?: ProviderBadgeTier | null;
    completed_count?: number | null;
    next_milestone?: {
      tier: ProviderBadgeTier;
      required_bookings: number;
      required_rating: number;
    } | null;
  };
  prerequisites: VerificationPrerequisite[];
  last_submission?: {
    id: string;
    governmentIdUrl?: string;
    selfieUrl?: string;
    businessDocUrl?: string | null;
    notes?: string | null;
    submitted_at: string;
  } | null;
}

export interface BadgeInsights {
  provider_id: string;
  current_tier?: ProviderBadgeTier | null;
  completed_booking_count?: number | null;
  average_rating?: number | null;
  review_count?: number | null;
  show_payment_protection?: boolean | null;
  first_booking_discount_enabled?: boolean | null;
  first_booking_discount_percent?: number | null;
  history?: ProviderBadgeHistoryItem[];
}

export interface BookingSummary extends ServiceBooking {
  offering?: ServiceOffering | null;
  provider?: Pick<ServiceProviderProfile, 'user_id' | 'display_name' | 'headline' | 'badge_tier'> | null;
  booker?: Pick<PublicProfile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
}

export interface DiscoverServiceResponse {
  items: ServiceProviderCard[];
  meta?: {
    published_at: string;
    curated_by?: string;
  };
}
