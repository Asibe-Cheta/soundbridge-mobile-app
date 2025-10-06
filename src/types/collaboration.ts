// src/types/collaboration.ts
// TypeScript interfaces for Creator Collaboration Calendar System

export interface CreatorAvailability {
  id: string;
  creator_id: string;
  start_date: string; // ISO 8601 timestamp
  end_date: string;   // ISO 8601 timestamp
  is_available: boolean;
  max_requests_per_slot: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CollaborationRequest {
  id: string;
  requester_id: string;
  creator_id: string;
  availability_id: string;
  proposed_start_date: string; // ISO 8601 timestamp
  proposed_end_date: string;   // ISO 8601 timestamp
  subject: string;
  message: string;
  response_message?: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  
  // Populated relationships
  requester?: UserProfile;
  creator?: UserProfile;
  availability?: CreatorAvailability;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  collaboration_enabled?: boolean;
  auto_decline_unavailable?: boolean;
  min_notice_days?: number;
}

export interface BookingStatus {
  creator_id: string;
  collaboration_enabled: boolean;
  is_accepting_requests: boolean;
  next_available_slot?: string;
  total_availability_slots: number;
  available_slots: number;
  pending_requests: number;
  min_notice_days: number;
}

export interface AvailabilitySlot {
  id: string;
  startDate: Date;
  endDate: Date;
  maxRequests: number;
  currentRequests: number;
  notes?: string;
  isAvailable: boolean;
  isFullyBooked: boolean;
}

export interface CreateAvailabilityRequest {
  startDate: Date;
  endDate: Date;
  maxRequests: number;
  notes?: string;
}

export interface CreateCollaborationRequest {
  creatorId: string;
  availabilityId: string;
  proposedStartDate: Date;
  proposedEndDate: Date;
  subject: string;
  message: string;
}

export interface RespondToRequestData {
  requestId: string;
  response: 'accepted' | 'declined';
  responseMessage?: string;
}

export interface CollaborationFilters {
  type?: 'sent' | 'received';
  status?: RequestStatus;
  page?: number;
  limit?: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Notification types
export interface CollaborationNotification {
  type: 'collaboration.request.received' | 'collaboration.request.accepted' | 'collaboration.request.declined' | 'collaboration.slot.expiring';
  recipient: string;
  title: string;
  body: string;
  action: string;
  data: {
    request_id?: string;
    creator_id?: string;
    requester_id?: string;
    availability_id?: string;
  };
}

// Validation helpers
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TimeSlotValidation {
  isWithinAvailability: boolean;
  isValidRange: boolean;
  hasCapacity: boolean;
  meetsMinNotice: boolean;
  errors: string[];
}
