export interface DayAvailability {
  available: boolean;
  hours?: 'all_day' | string; // e.g. "18:00-23:00"
}

export interface AvailabilitySchedule {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface UserAvailability {
  id: string;
  user_id: string;
  available_for_urgent_gigs: boolean;
  current_lat?: number;
  current_lng?: number;
  general_area?: string;
  general_area_lat?: number;
  general_area_lng?: number;
  max_radius_km: number;
  hourly_rate?: number;
  per_gig_rate?: number;
  rate_negotiable: boolean;
  availability_schedule: AvailabilitySchedule;
  last_location_update?: string;
  dnd_start?: string;   // e.g. "23:00"
  dnd_end?: string;     // e.g. "08:00"
  max_notifications_per_day: number;
  created_at: string;
  updated_at: string;
}
