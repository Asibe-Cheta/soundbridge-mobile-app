// Backend urgent_status values on opportunity_posts (gig_type = 'urgent')
export type GigStatus = 'searching' | 'confirmed' | 'completed' | 'cancelled';

export type GigResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// Urgent gigs are stored as opportunity_posts rows with gig_type = 'urgent'.
// IDs are opportunity_posts.id. The status field is urgent_status on the DB.
export interface UrgentGig {
  id: string;
  created_by: string;       // opportunity_posts.user_id (the requester)
  gig_type: 'urgent' | 'planned';
  title: string;
  description?: string;
  skill_required: string;
  genre: string[];
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_radius_km: number;
  date_needed: string;         // ISO datetime — when gig is needed
  duration_hours: number;
  payment_amount: number;
  payment_currency: string;
  payment_status: 'pending' | 'escrowed' | 'released' | 'refunded';
  urgent_status: GigStatus;    // maps to opportunity_posts.urgent_status
  selected_provider_id?: string;
  project_id?: string;         // set by backend when status becomes 'confirmed'
  expires_at: string;          // date_needed + 4h (set by backend)
  created_at: string;
  updated_at: string;
  // Computed for display (API attaches these)
  distance_km?: number;
  match_score?: number;
  requester?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    is_verified?: boolean;
    rating?: number;
    review_count?: number;
  };
}

export interface GigResponse {
  id: string;
  gig_id: string;
  provider_id: string;
  status: GigResponseStatus;
  response_time_seconds?: number;
  message?: string;
  notified_at: string;
  responded_at?: string;
  created_at: string;
  // Populated for requester's view (API attaches these)
  provider?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    is_verified?: boolean;
    headline?: string;
    rating?: number;
    review_count?: number;
    distance_km?: number;
    hourly_rate?: number;
    per_gig_rate?: number;
  };
}

// Disputes table shape (for DisputeDetailScreen future use)
export interface Dispute {
  id: string;
  project_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string;
  evidence_urls: string[] | null;
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'resolved_split';
  counter_response: string | null;
  counter_evidence_urls: string[] | null;
  resolution_notes: string | null;
  split_percent: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
