import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import type { Post } from '../types/feed.types';
import EventForYouBadge from './EventForYouBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  venue: string | null;
  category: string | null;
  image_url: string | null;
  ticket_price: number | null;
  tickets_available: number | null;
  country: string | null;
}

interface EventPostCardProps {
  post: Post;
  onReactionPress?: (type: 'support' | 'love' | 'fire' | 'congrats') => void;
  onCommentPress?: () => void;
  onShare?: (post: Post) => void;
  onSave?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
  onEventTap?: (eventId: string) => void;
  isSaved?: boolean;
  personalisedReason?: string | null;
  showForYouBadge?: boolean;
}

// ─── Module-level event cache (avoids repeated DB fetches per session) ────────
const eventCache = new Map<string, EventData | null>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} at ${hh}:${mm}`;
}

function getCurrencySymbol(country: string | null): string {
  if (!country) return '£';
  const c = country.toLowerCase();
  if (c.includes('nigeria') || c === 'ng') return '₦';
  if (c.includes('ghana') || c === 'gh') return '₵';
  if (c.includes('kenya') || c === 'ke') return 'KSh ';
  if (c.includes('united states') || c === 'us' || c === 'usa') return '$';
  if (c.includes('canada') || c === 'ca') return 'CA$';
  if (c.includes('europe') || c === 'eu') return '€';
  return '£';
}

function totalReactions(post: Post): number {
  if (!post.reactions_count) return 0;
  return Object.values(post.reactions_count).reduce((s, v) => s + (v as number), 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventPostCard({
  post,
  onReactionPress,
  onCommentPress,
  onShare,
  onSave,
  onUnsave,
  onAuthorPress,
  onEventTap,
  isSaved = false,
  personalisedReason = null,
  showForYouBadge = false,
}: EventPostCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const isDark = theme.isDark;
  const cardWidth = Dimensions.get('window').width;

  const [event, setEvent] = useState<EventData | null>(
    post.event_id && eventCache.has(post.event_id) ? eventCache.get(post.event_id)! : null
  );
  const [loading, setLoading] = useState(!event && !!post.event_id);
  const [expanded, setExpanded] = useState(false);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!post.event_id || event) return;
    fetchEvent(post.event_id);
  }, [post.event_id]);

  const fetchEvent = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id,title,description,event_date,location,venue,category,image_url,ticket_price,tickets_available,country')
        .eq('id', eventId)
        .single();
      if (mounted.current) {
        const result = error ? null : (data as EventData);
        eventCache.set(eventId, result);
        setEvent(result);
        setLoading(false);
        // Analytics: track feed impression (silently ignores if column doesn't exist)
        if (result) {
          supabase.from('events')
            .update({ feed_impressions: (result as any).feed_impressions + 1 })
            .eq('id', eventId)
            .then(() => {}).catch(() => {});
        }
      }
    } catch {
      if (mounted.current) setLoading(false);
    }
  };

  const handleCTAPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (event) {
      // Analytics: track CTA tap (silently ignores if column doesn't exist)
      supabase.from('events')
        .update({ feed_cta_taps: ((event as any).feed_cta_taps || 0) + 1 })
        .eq('id', event.id)
        .then(() => {}).catch(() => {});
    }
    if (post.event_id) onEventTap?.(post.event_id);
    (navigation as any).navigate('EventDetails', {
      eventId: post.event_id,
      ...(event ? { event } : {}),
    });
  };

  const getCTALabel = (): string => {
    if (!event) return 'View Event';
    if (event.ticket_price && event.ticket_price > 0) {
      return `Buy Ticket — ${getCurrencySymbol(event.country)}${event.ticket_price}`;
    }
    if (event.tickets_available !== null && event.tickets_available > 0) {
      return 'Register Free';
    }
    return 'View Event';
  };

  const reactionCount = totalReactions(post);
  const commentCount = post.comments_count || 0;

  // ─── Loading / no-event fallback ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderCard }]}>
        <View style={styles.loadingHeader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading event…</Text>
        </View>
      </View>
    );
  }

  if (!event) return null;

  const coverHeight = imageRatio ? Math.min(Math.round(cardWidth / imageRatio), cardWidth * 0.6) : 200;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderCard }]}>

      {/* ── Header strip ───────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#DC2626', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerStrip}
      >
        <Ionicons name="calendar" size={14} color="#fff" />
        <Text style={styles.headerLabel}>EVENT</Text>
      </LinearGradient>

      {/* ── Cover image ────────────────────────────────────────────────────── */}
      <TouchableOpacity activeOpacity={0.92} onPress={handleCTAPress} style={{ position: 'relative' }}>
        {showForYouBadge ? (
          <EventForYouBadge style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }} />
        ) : null}
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={{ width: cardWidth, height: coverHeight }}
            resizeMode="cover"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width > 0 && height > 0) setImageRatio(width / height);
            }}
          />
        ) : (
          <LinearGradient
            colors={['#1E1235', '#3B1D8A', '#1E1235']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: cardWidth, height: 160, justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 }} numberOfLines={2}>
              {event.title}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* ── Event details ──────────────────────────────────────────────────── */}
      <View style={styles.details}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {formatFullDate(event.event_date)}
          </Text>
        </View>

        {(event.venue || event.location) ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {[event.venue, event.location].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}

        {event.category ? (
          <View style={styles.metaRow}>
            <Ionicons name="musical-note-outline" size={13} color={theme.colors.textSecondary} />
            <View style={styles.genreTag}>
              <Text style={styles.genreText}>{event.category}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Creator row ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.creatorRow, { borderTopColor: theme.colors.border }]}
        onPress={() => onAuthorPress?.(post.author.id)}
        activeOpacity={0.7}
      >
        {post.author.avatar_url ? (
          <Image source={{ uri: post.author.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary + '22' }]}>
            <Ionicons name="person" size={14} color={theme.colors.primary} />
          </View>
        )}
        <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
          {post.author.display_name}
        </Text>
        <Text style={[styles.creatorLabel, { color: theme.colors.textSecondary }]}>
          {' '}is hosting an event
        </Text>
      </TouchableOpacity>

      {/* ── Description ────────────────────────────────────────────────────── */}
      {(event.description || post.content) ? (
        <View style={styles.descSection}>
          <Text
            style={[styles.description, { color: theme.colors.text }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {event.description || post.content}
          </Text>
          {!expanded && (
            <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={[styles.seeMore, { color: theme.colors.primary }]}>See more</Text>
            </TouchableOpacity>
          )}
          {personalisedReason ? (
            <Text style={[styles.personalisedReason, { color: theme.colors.textSecondary }]}>
              {personalisedReason}
            </Text>
          ) : null}
        </View>
      ) : personalisedReason ? (
        <View style={styles.descSection}>
          <Text style={[styles.personalisedReason, { color: theme.colors.textSecondary }]}>
            {personalisedReason}
          </Text>
        </View>
      ) : null}

      {/* ── CTA button ─────────────────────────────────────────────────────── */}
      <View style={styles.ctaSection}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleCTAPress} style={styles.ctaButton}>
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>{getCTALabel()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Social actions ─────────────────────────────────────────────────── */}
      <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReactionPress?.('support'); }}
        >
          <Ionicons
            name={post.user_reaction ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={post.user_reaction ? theme.colors.primary : theme.colors.textSecondary}
          />
          {reactionCount > 0 && (
            <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>{reactionCount}</Text>
          )}
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onCommentPress?.(); }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
          {commentCount > 0 && (
            <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>{commentCount}</Text>
          )}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onShare?.(post); }}
        >
          <Ionicons name="arrow-redo-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            isSaved ? onUnsave?.(post.id) : onSave?.(post.id);
          }}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 0,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 13,
  },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  headerLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  details: {
    padding: 14,
    gap: 6,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
  },
  genreTag: {
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  genreText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  creatorLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  descSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  seeMore: {
    fontSize: 13,
    fontWeight: '600',
  },
  personalisedReason: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  ctaSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  ctaButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
