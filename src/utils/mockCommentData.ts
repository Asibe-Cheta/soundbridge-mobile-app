import { Comment, PostAuthor } from '../types/feed.types';

export const mockCommentAuthors: PostAuthor[] = [
  {
    id: 'comment-author-1',
    username: 'marcus_beats',
    display_name: 'Marcus Williams',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    headline: 'Music Producer | Afrobeats & Hip-Hop',
    role: 'creator',
  },
  {
    id: 'comment-author-2',
    username: 'dj_temitope',
    display_name: 'DJ Temitope',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    headline: 'DJ & Producer | Lagos Nightlife',
    role: 'creator',
  },
  {
    id: 'comment-author-3',
    username: 'jazz_vocalist',
    display_name: 'Elena Martinez',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    headline: 'Jazz Vocalist & Songwriter',
    role: 'creator',
  },
  {
    id: 'comment-author-4',
    username: 'bass_master',
    display_name: 'James Thompson',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    headline: 'Bass Player | Session Musician',
    role: 'creator',
  },
];

export const mockComments: Comment[] = [
  {
    id: 'comment-1',
    post_id: 'post-3',
    user: mockCommentAuthors[0],
    content: 'Congratulations! Can\'t wait to hear it 🔥 This is going to be amazing!',
    likes_count: 12,
    user_liked: false,
    replies_count: 2,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'comment-2',
    post_id: 'post-3',
    user: mockCommentAuthors[1],
    content: 'So excited for this! The preview sounds incredible. When\'s the full release?',
    likes_count: 8,
    user_liked: true,
    replies_count: 0,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  },
  {
    id: 'comment-3',
    post_id: 'post-3',
    user: mockCommentAuthors[2],
    content: 'Beautiful work! The production quality is outstanding. Looking forward to the full track!',
    likes_count: 15,
    user_liked: false,
    replies_count: 1,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: 'comment-4',
    post_id: 'post-1',
    user: mockCommentAuthors[3],
    content: 'I\'m interested! I have 10+ years of experience with live recording. DM me your details!',
    likes_count: 3,
    user_liked: false,
    replies_count: 0,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 'comment-5',
    post_id: 'post-2',
    user: mockCommentAuthors[0],
    content: 'This venue looks amazing! Would love to perform there someday.',
    likes_count: 5,
    user_liked: false,
    replies_count: 0,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
];

export const mockReplies: Comment[] = [
  {
    id: 'reply-1',
    post_id: 'post-3',
    user: mockCommentAuthors[3],
    content: 'Thanks Marcus! Really appreciate the support 🙌',
    likes_count: 2,
    user_liked: false,
    replies_count: 0,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
  {
    id: 'reply-2',
    post_id: 'post-3',
    user: mockCommentAuthors[1],
    content: 'Friday! Can\'t wait to share it with everyone.',
    likes_count: 1,
    user_liked: false,
    replies_count: 0,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'reply-3',
    post_id: 'post-3',
    user: mockCommentAuthors[0],
    content: 'Thank you Elena! Means a lot coming from you.',
    likes_count: 4,
    user_liked: true,
    replies_count: 0,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  },
];

