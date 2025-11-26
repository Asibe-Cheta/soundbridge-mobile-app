import { ConnectionSuggestion, ConnectionRequest, Connection } from '../types/network.types';

export const mockConnectionSuggestions: ConnectionSuggestion[] = [
  {
    id: 'suggestion-1',
    username: 'marcus_beats',
    display_name: 'Marcus Williams',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    headline: 'Music Producer | Afrobeats & Hip-Hop',
    mutual_connections: 12,
    reason: 'Works in Afrobeats & Hip-Hop',
  },
  {
    id: 'suggestion-2',
    username: 'dj_temitope',
    display_name: 'DJ Temitope',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    headline: 'DJ & Producer | Lagos Nightlife',
    mutual_connections: 8,
    reason: 'Based in Lagos, Nigeria',
  },
  {
    id: 'suggestion-3',
    username: 'jazz_vocalist',
    display_name: 'Elena Martinez',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    headline: 'Jazz Vocalist & Songwriter',
    mutual_connections: 5,
    reason: 'Works in Jazz & Gospel',
  },
  {
    id: 'suggestion-4',
    username: 'bass_master',
    display_name: 'James Thompson',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    headline: 'Bass Player | Session Musician',
    mutual_connections: 3,
    reason: 'Session musician',
  },
  {
    id: 'suggestion-5',
    username: 'sound_engineer_pro',
    display_name: 'Alex Chen',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    headline: 'Sound Engineer | Studio Owner',
    mutual_connections: 7,
    reason: 'Sound engineering professional',
  },
];

export const mockConnectionRequests: ConnectionRequest[] = [
  {
    id: 'request-1',
    from_user_id: 'user-dj-temitope',
    to_user_id: 'current-user',
    message: 'Would love to connect and collaborate on some Afrobeat projects! I saw your work and it\'s amazing.',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    from_user: {
      id: 'user-dj-temitope',
      username: 'dj_temitope',
      display_name: 'DJ Temitope',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      headline: 'DJ & Producer | Lagos Nightlife',
    },
  },
  {
    id: 'request-2',
    from_user_id: 'user-jazz-vocalist',
    to_user_id: 'current-user',
    message: 'Hi! I\'m organizing a jazz festival next month and would love to discuss potential collaboration opportunities.',
    status: 'pending',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    from_user: {
      id: 'user-jazz-vocalist',
      username: 'jazz_vocalist',
      display_name: 'Elena Martinez',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
      headline: 'Jazz Vocalist & Songwriter',
    },
  },
  {
    id: 'request-3',
    from_user_id: 'user-bass-master',
    to_user_id: 'current-user',
    message: 'Looking for a producer for my upcoming album. Your style matches perfectly!',
    status: 'pending',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    from_user: {
      id: 'user-bass-master',
      username: 'bass_master',
      display_name: 'James Thompson',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
      headline: 'Bass Player | Session Musician',
    },
  },
];

export const mockConnections: Connection[] = [
  {
    id: 'connection-1',
    user_id: 'current-user',
    connected_user_id: 'user-sarah',
    connected_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    user: {
      id: 'user-sarah',
      username: 'sarah_johnson',
      display_name: 'Sarah Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      headline: 'Gospel Singer & Worship Leader',
    },
  },
  {
    id: 'connection-2',
    user_id: 'current-user',
    connected_user_id: 'user-marcus',
    connected_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
    user: {
      id: 'user-marcus',
      username: 'marcus_beats',
      display_name: 'Marcus Williams',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      headline: 'Music Producer | Afrobeats & Hip-Hop',
    },
  },
  {
    id: 'connection-3',
    user_id: 'current-user',
    connected_user_id: 'user-jazz-lounge',
    connected_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 1.5 months ago
    user: {
      id: 'user-jazz-lounge',
      username: 'the_jazz_lounge',
      display_name: 'The Jazz Lounge',
      avatar_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
      headline: 'Live Music Venue | Birmingham, UK',
    },
  },
  {
    id: 'connection-4',
    user_id: 'current-user',
    connected_user_id: 'user-alex',
    connected_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
    user: {
      id: 'user-alex',
      username: 'sound_engineer_pro',
      display_name: 'Alex Chen',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
      headline: 'Sound Engineer | Studio Owner',
    },
  },
  {
    id: 'connection-5',
    user_id: 'current-user',
    connected_user_id: 'user-elena',
    connected_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago
    user: {
      id: 'user-elena',
      username: 'jazz_vocalist',
      display_name: 'Elena Martinez',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
      headline: 'Jazz Vocalist & Songwriter',
    },
  },
];

export const mockOpportunities = [
  {
    id: 'opp-1',
    type: 'collaboration',
    title: 'Looking for Gospel Vocalist for Worship Album',
    description: 'We\'re producing a new worship album and need a powerful gospel vocalist. Must have experience with live recording and be available for studio sessions in Lagos next month.',
    posted_by: {
      id: 'user-marcus',
      username: 'marcus_beats',
      display_name: 'Marcus Williams',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    },
    posted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: false,
  },
  {
    id: 'opp-2',
    type: 'event',
    title: 'Jazz Festival - Birmingham, UK',
    description: 'Now booking for December! Open mic nights every Friday + weekend live performances. Limited slots available for acoustic sets and jazz ensembles.',
    posted_by: {
      id: 'user-jazz-lounge',
      username: 'the_jazz_lounge',
      display_name: 'The Jazz Lounge',
      avatar_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
    },
    posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: true,
  },
  {
    id: 'opp-3',
    type: 'job',
    title: 'Session Bass Player Needed',
    description: 'Looking for an experienced bass player for upcoming Afrobeats project. Must have experience with live recording and be available next month.',
    posted_by: {
      id: 'user-marcus',
      username: 'marcus_beats',
      display_name: 'Marcus Williams',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    },
    posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_featured: false,
  },
];

