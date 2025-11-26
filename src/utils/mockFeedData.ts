import { Post, PostAuthor } from '../types/feed.types';

export const mockAuthors: PostAuthor[] = [
  {
    id: 'author-1',
    username: 'sarah_johnson',
    display_name: 'Sarah Johnson',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    headline: 'Gospel Singer & Worship Leader',
    role: 'creator',
  },
  {
    id: 'author-2',
    username: 'marcus_beats',
    display_name: 'Marcus Williams',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    headline: 'Music Producer | Afrobeats & Hip-Hop',
    role: 'creator',
  },
  {
    id: 'author-3',
    username: 'dj_temitope',
    display_name: 'DJ Temitope',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    headline: 'DJ & Producer | Lagos Nightlife',
    role: 'creator',
  },
  {
    id: 'author-4',
    username: 'the_jazz_lounge',
    display_name: 'The Jazz Lounge',
    avatar_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
    headline: 'Live Music Venue | Birmingham, UK',
    role: 'venue',
  },
];

export const mockPosts: Post[] = [
  {
    id: 'post-1',
    author: mockAuthors[1],
    content: '🎹 Looking for a talented bass player for an upcoming Afrobeats project! Must have experience with live recording and be available next month. DM me if interested! 🎸',
    post_type: 'opportunity',
    visibility: 'public',
    reactions_count: { support: 24, love: 8, fire: 12, congrats: 0 },
    comments_count: 7,
    user_reaction: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    author: mockAuthors[3],
    content: '🎷 Now booking for December! Open mic nights every Friday + weekend live performances. Limited slots available for acoustic sets and jazz ensembles. Apply through our website!',
    post_type: 'opportunity',
    visibility: 'public',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
    reactions_count: { support: 18, love: 34, fire: 9, congrats: 0 },
    comments_count: 12,
    user_reaction: 'love',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    author: mockAuthors[0],
    content: 'Excited to announce that my new worship single "Grace Overflow" is finally done! 🙌 Spent 6 months perfecting every detail with an amazing team. Preview dropping this Friday! 🎶✨',
    post_type: 'achievement',
    visibility: 'public',
    audio_url: 'https://example.com/preview.mp3', // 30-second preview
    reactions_count: { support: 45, love: 67, fire: 23, congrats: 89 },
    comments_count: 34,
    user_reaction: 'congrats',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-4',
    author: mockAuthors[2],
    content: 'Working on something special... 🔥 Blending Afrobeat rhythms with Gospel melodies. Any vocalists interested in collaborating? Looking for powerful, soulful voices! Drop your demos below 👇',
    post_type: 'collaboration',
    visibility: 'public',
    reactions_count: { support: 31, love: 19, fire: 44, congrats: 0 },
    comments_count: 28,
    user_reaction: 'fire',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

