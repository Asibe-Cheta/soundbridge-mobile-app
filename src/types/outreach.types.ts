export type ContactType = 'institution' | 'artist' | 'choir' | 'church' | 'venue' | 'media' | 'partner' | 'other';

export interface OutreachContact {
  id: string;
  contact_name: string;
  organisation_name: string | null;
  contact_type: ContactType;
  notes: string | null;
  meeting_held: boolean;
  meeting_held_at: string | null;
  on_platform: boolean;
  on_platform_at: string | null;
  profile_completed: boolean;
  profile_completed_at: string | null;
  has_invited_others: boolean;
  has_invited_others_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachMeeting {
  id: string;
  contact_id: string;
  scheduled_at: string;
  meeting_link_or_location: string | null;
  reminder_sent: boolean;
  created_by: string;
  created_at: string;
  contact_name?: string;
}

export const CONTACT_TYPES: ContactType[] = [
  'institution', 'artist', 'choir', 'church', 'venue', 'media', 'partner', 'other',
];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  institution: 'Institution',
  artist: 'Artist',
  choir: 'Choir',
  church: 'Church',
  venue: 'Venue',
  media: 'Media',
  partner: 'Partner',
  other: 'Other',
};

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  institution: '#3B82F6',
  artist: '#8B5CF6',
  choir: '#EC4899',
  church: '#F59E0B',
  venue: '#10B981',
  media: '#06B6D4',
  partner: '#F97316',
  other: '#6B7280',
};

// CSV import helpers
export const CSV_TYPE_MAP: Record<string, ContactType> = {
  institution: 'institution',
  artist: 'artist',
  choir: 'choir',
  church: 'church',
  venue: 'venue',
  media: 'media',
  partner: 'partner',
  other: 'other',
};

export const CSV_REQUIRED_HEADERS = [
  'Contact Name',
  'Organisation Name',
  'Contact Type',
  'Meeting Held',
  'On Platform',
  'Profile Completed',
  'Invited Others',
  'Notes',
] as const;
