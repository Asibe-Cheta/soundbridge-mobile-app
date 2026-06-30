/**
 * TestFeedScreen — production feed UI (velvet redesign).
 * All design elements translated from the VelvetSound / aura.build template:
 *   Screen 01 (Entrance): editorial header, social proof, left-border tagline, genre strip
 *   Screen 02 (Collection): text-only filter tabs, full-bleed card containers, badge language
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Modal,
  Linking,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { walkthroughable, useCopilot } from 'react-native-copilot';
import proResourceAnalytics from '../services/ProResourceAnalyticsService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import { useFeed } from '../hooks/useFeed';
import PostCard from '../components/PostCard';
import EventPostCard from '../components/EventPostCard';
import EventsStrip from '../components/EventsStrip';
import EarlyAdopterConversionModal from '../components/EarlyAdopterConversionModal';
import { useEarlyAdopterConversion } from '../hooks/useEarlyAdopterConversion';
import CreatePostModal from '../components/CreatePostModal';
import TestCreatePostModal from '../components/TestCreatePostModal';
import CommentsModal from '../modals/CommentsModal';
import TipModal from '../components/TipModal';
import { feedService } from '../services/api/feedService';
import { supabase, dbHelpers } from '../lib/supabase';
import { deepLinkingService } from '../services/DeepLinkingService';
import { socialService } from '../services/api/socialService';
import { imageSaveService } from '../services/ImageSaveService';
import { Alert } from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { checkShouldShowTour } from '../services/tourService';
import { SkeletonFeed } from '../components/SkeletonLoader';
import GoogleCalendarNudgeBanner from '../components/GoogleCalendarNudgeBanner';
import GoogleCalendarPrivacyModal from '../components/GoogleCalendarPrivacyModal';
import { calendarNudgeService } from '../services/CalendarNudgeService';
import { calendarIntegrationService } from '../services/CalendarIntegrationService';
import { useEventMatchIntelligence } from '../contexts/EventMatchIntelligenceContext';
import EventPromotionTrackingService from '../services/EventPromotionTrackingService';

const WalkthroughableView = walkthroughable(View);
const { width: SCREEN_W } = Dimensions.get('window');

// Screen 02 — collection tab labels
const FILTER_TABS = ['For You', 'Following', 'Events'];
// Screen 01 — genre / brand strip (3 items, grayscale, opacity-40)
const GENRE_STRIP = ['Electronic', 'R&B', 'Hip-Hop'];

// ─────────────────────────────────────────────────────────────
// Waveform bar config — directly mirrored from LiveAudioBanner
// ─────────────────────────────────────────────────────────────
const BAR_COUNT = 26;
const MAX_BAR_H = 52;
const MIN_BAR_H = 6;
const BAR_CONFIGS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const seed1 = (i * 127 + 31) % 97;
  const seed2 = (i * 61 + 17) % 83;
  const seed3 = (i * 43 + 7) % 71;
  const seed4 = (i * 89 + 53) % 59;
  const seed5 = (i * 37 + 11) % 53;
  const palette = ['#A78BFA', '#C084FC', '#EC4899', '#F43F5E', '#FB7185', '#E879A0', '#F472B6'];
  return {
    highH: MIN_BAR_H + (seed1 / 97) * (MAX_BAR_H - MIN_BAR_H),
    lowH: MIN_BAR_H + (seed2 / 83) * 18,
    duration: 500 + (seed3 / 71) * 1100,
    delay: (seed4 / 59) * 1200,
    color: palette[seed5 % palette.length],
  };
});

// ─────────────────────────────────────────────────────────────
// LiveAudioCard — Screen 02 card design + original waveform bars
// ─────────────────────────────────────────────────────────────
function LiveAudioCard({ onPress }: { onPress: () => void }) {
  const { theme: cardTheme } = useTheme();
  const barAnims = useRef(
    BAR_CONFIGS.map(c => new Animated.Value(c.lowH + (c.highH - c.lowH) * 0.5))
  ).current;

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    const stop = () => {
      loops.forEach((l) => l.stop());
      loops = [];
    };
    const start = () => {
      stop();
      loops = BAR_CONFIGS.map((c, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(c.delay),
            Animated.timing(barAnims[i], { toValue: c.highH, duration: c.duration, useNativeDriver: false }),
            Animated.timing(barAnims[i], { toValue: c.lowH, duration: c.duration, useNativeDriver: false }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else if (next === 'background' || next === 'inactive') stop();
    });

    return () => {
      sub.remove();
      stop();
    };
  }, []);

  return (
    <TouchableOpacity style={cardStyles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Background lifestyle image */}
      <Image
        source={require('../../assets/banner-bg2.JPG')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Red → black → blue gradient overlay */}
      <LinearGradient
        colors={['rgba(220,38,38,0.82)', 'rgba(8,4,22,0.72)', 'rgba(25,20,130,0.75)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated waveform bars — bottom-aligned, same as original */}
      <View style={cardStyles.waveformContainer} pointerEvents="none">
        {barAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[cardStyles.waveBar, {
              height: anim,
              opacity: 0.13 + (i % 3) * 0.02,
              backgroundColor: BAR_CONFIGS[i].color,
              shadowColor: BAR_CONFIGS[i].color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }]}
          />
        ))}
      </View>

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(20,4,60,0.94)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={cardStyles.bottomGradient}
      />

      {/* LIVE badge */}
      <View style={cardStyles.badge}>
        <View style={cardStyles.liveDot} />
        <Text style={cardStyles.badgeText}>LIVE</Text>
      </View>

      {/* Content at bottom */}
      <View style={cardStyles.content}>
        <Text style={cardStyles.title}>Live Audio Sessions</Text>
        <Text style={cardStyles.subtitle}>Join live rooms · Host your own · Connect in real-time</Text>
        <View style={cardStyles.ctaRow}>
          <Text style={cardStyles.ctaText}>Explore Live Rooms</Text>
          {/* Screen 01 frosted glass circle button — same design, fitted to banner */}
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.glassCircle}
          >
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <Ionicons name="arrow-up-outline" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// SoundAcademyCard — Screen 02 card design, deep purple
// ─────────────────────────────────────────────────────────────
function SoundAcademyCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={cardStyles.card} activeOpacity={0.88} onPress={onPress}>
      {/* Deep purple gradient */}
      <LinearGradient
        colors={['#1C1235', '#2A1650', '#1C1235']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(139,92,246,0.35)', 'transparent', 'rgba(88,28,135,0.25)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* SA logo — prominent, fully contained, not clipped */}
      <Image
        source={require('../../assets/sa-2.png')}
        style={cardStyles.saLogoBg}
        resizeMode="contain"
      />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(10,4,28,0.95)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={cardStyles.bottomGradient}
      />

      {/* Badge top-left */}
      <View style={[cardStyles.badge, cardStyles.saBadge]}>
        <View style={[cardStyles.liveDot, { backgroundColor: '#A78BFA' }]} />
        <Text style={[cardStyles.badgeText, { color: '#C4B5FD' }]}>EDUCATION PARTNER</Text>
      </View>

      {/* Content overlaid at bottom */}
      <View style={cardStyles.content}>
        <Text style={cardStyles.title}>
          Level Up{' '}<Text style={{ color: 'rgba(255,255,255,0.9)' }}>Your Sound</Text>
        </Text>
        <Text style={cardStyles.subtitle}>World-class audio engineering &amp; DJ courses · Pro Tools certified</Text>
        <View style={cardStyles.ctaRow}>
          <Text style={cardStyles.ctaText}>Explore Courses</Text>
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.glassCircle}
          >
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <Ionicons name="arrow-up-outline" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Shared card styles (Screen 02 htmlCard design language)
const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '65%',
  },
  badge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  saBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(139,92,246,0.4)',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
  content: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  glassCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  waveformContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    gap: 3,
    zIndex: 1,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
  },
  saLogoBg: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 150,
    height: 150,
    opacity: 0.38,
    zIndex: 0,
  },
});

export default function TestFeedScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { user, userProfile, session } = useAuth();
  const { matchByEventId, refresh: refreshEventMatches } = useEventMatchIntelligence();
  const { showToast } = useToast();
  const { start: startTour } = useCopilot();
  const {
    posts, loading, refreshing, hasMore, error,
    refresh, loadMore, addReaction, deletePost, updatePostLocally,
  } = useFeed();

  const [activeFilter, setActiveFilter] = useState('For You');

  // Following tab — set of user IDs the logged-in user follows
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  // Events tab — same source as Discover screen
  const [feedEvents, setFeedEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAuthorId, setTipAuthorId] = useState('');
  const [tipAuthorName, setTipAuthorName] = useState('');

  const isExpiredEarlyAdopter =
    userProfile?.early_adopter === true &&
    userProfile?.subscription_tier === 'free' &&
    !!userProfile?.subscription_period_end &&
    new Date(userProfile.subscription_period_end) < new Date();
  const {
    shouldShow: showEarlyAdopterModal,
    copyVariant: eaCopyVariant,
    onRemindLater: onEaRemindLater,
    onDismissPermanently: onEaDismissPermanently,
    onConverted: onEaConverted,
  } = useEarlyAdopterConversion(isExpiredEarlyAdopter, userProfile?.subscription_period_end);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifAlreadyDenied, setNotifAlreadyDenied] = useState(false);
  const notifCheckedThisSession = useRef(false);

  const [showCalendarNudge, setShowCalendarNudge] = useState(false);
  const [showCalendarPrivacy, setShowCalendarPrivacy] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const calendarNudgeCheckedRef = useRef(false);
  const flatListRef = useRef<any>(null);
  useScrollToTop(flatListRef);

  useFocusEffect(useCallback(() => {
    refreshEventMatches();
  }, [refreshEventMatches]));

  useFocusEffect(useCallback(() => {
    const unsub = (navigation as any).addListener?.('tabPress', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      refresh();
    });
    return unsub;
  }, [navigation, refresh]));

  useFocusEffect(useCallback(() => {
    if (!user?.id || !session || calendarNudgeCheckedRef.current) return;
    calendarNudgeCheckedRef.current = true;
    (async () => {
      try {
        const evaluation = await calendarNudgeService.evaluateNudge(user.id, session);
        if (evaluation.shouldShow) {
          await calendarNudgeService.recordNudgeShown(user.id);
          setShowCalendarNudge(true);
        }
      } catch {}
    })();
  }, [user?.id, session]));

  useFocusEffect(useCallback(() => {
    if (!user?.id || notifCheckedThisSession.current) return;
    notifCheckedThisSession.current = true;
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          setNotifAlreadyDenied(status === 'denied');
          setTimeout(() => setShowNotifModal(true), 1500);
        }
      } catch {}
    })();
  }, [user?.id]));

  useEffect(() => {
    (async () => {
      const ok = await checkShouldShowTour();
      if (ok && posts.length > 0) setTimeout(() => startTour(), 1000);
    })();
  }, [posts.length]);

  useEffect(() => {
    if (!user?.id || posts.length === 0) return;
    (async () => {
      try {
        const postIds = posts.map(p => p.id);
        const { data: bookmarks, error } = await socialService.getBookmarks(user.id, 'post', 100, 0);
        if (!error && bookmarks)
          setSavedPosts(new Set(bookmarks.filter(b => postIds.includes(b.content_id)).map(b => b.content_id)));
      } catch {}
    })();
  }, [posts.length, user?.id]);

  // Load who the logged-in user follows (once on mount)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(({ data }) => {
        if (data) setFollowingIds(new Set(data.map((f: any) => f.following_id)));
      });
  }, [user?.id]);

  // Load events when Events tab is selected (same source as Discover screen)
  useEffect(() => {
    if (activeFilter !== 'Events') return;
    if (feedEvents.length > 0) return; // already loaded
    setEventsLoading(true);
    dbHelpers.getEvents(30).then(({ data }) => {
      setFeedEvents(data || []);
      setEventsLoading(false);
    });
  }, [activeFilter]);

  // ── Handlers (unchanged) ────────────────────────────────────
  const handleCalendarNudgeDismiss = async () => {
    if (user?.id) await calendarNudgeService.markHiddenForCurrentSession(user.id);
    setShowCalendarNudge(false);
  };

  const handleCalendarNudgeConnect = () => setShowCalendarPrivacy(true);

  const handleCalendarPrivacyContinue = async () => {
    if (!session) return;
    setCalendarBusy(true);
    try {
      const result = await calendarIntegrationService.connect(session);
      setShowCalendarPrivacy(false);
      if (result.success) {
        setShowCalendarNudge(false);
        showToast(
          'Google Calendar connected. SoundBridge will now find events that fit around your schedule.',
          'success',
          5000,
        );
      } else if (result.error && !result.error.toLowerCase().includes('cancel')) {
        Alert.alert('Connection failed', result.error);
      }
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleCreatePost = () => setIsCreateModalVisible(true);
  const handleReactionPress = async (postId: string, t: 'support' | 'love' | 'fire' | 'congrats') => {
    try { await addReaction(postId, t); } catch {}
  };
  const handleCommentPress = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) setSelectedPostForComments(post);
  };
  const handlePostPress = (postId: string) => navigation.navigate('PostDetail' as never, { postId } as never);
  const handleEditPost = (post: Post) => { setEditingPost(post); setIsCreateModalVisible(true); };
  const handleDeletePost = async (postId: string) => {
    try { await deletePost(postId); } catch { Alert.alert('Error', 'Failed to delete drop.'); }
  };
  const handleSharePost = async (post: Post) => {
    try { await deepLinkingService.sharePost(post.id, post.content.substring(0, 100)); } catch {}
  };
  const handleRepost = async (post: Post, withComment?: boolean, comment?: string) => {
    try {
      if (post.user_reposted) {
        await feedService.unrepost(post.reposted_from_id || post.id);
        await refresh(); showToast('Repost removed', 'success');
      } else {
        await feedService.repost(post.reposted_from_id || post.id, withComment || false, comment);
        await refresh(); showToast('Your post was sent', 'success');
      }
    } catch (e: any) { showToast(e.message || 'Failed. Please try again.', 'error'); }
  };
  const handleSavePost = async (postId: string) => {
    try {
      const { data, error } = await socialService.toggleBookmark({ content_id: postId, content_type: 'post' });
      if (error) throw error;
      if (data) setSavedPosts(p => new Set(p).add(postId));
      else setSavedPosts(p => { const s = new Set(p); s.delete(postId); return s; });
    } catch { Alert.alert('Error', 'Failed to save drop.'); }
  };
  const handleUnsavePost = (postId: string) => handleSavePost(postId);
  const handleSaveImage = async (imageUrl: string) => {
    try { await imageSaveService.saveImageWithFeedback(imageUrl); } catch {}
  };
  const handleAuthorPress = (authorId: string) =>
    navigation.navigate('CreatorProfile' as never, { creatorId: authorId } as never);
  const handleTip = (authorId: string, authorName: string) => {
    setTipAuthorId(authorId); setTipAuthorName(authorName); setShowTipModal(true);
  };

  // Data for editorial header
  const stackAvatars = [
    userProfile?.avatar_url,
    ...posts.slice(0, 3).map(p => p.author?.avatar_url).filter(Boolean),
  ].filter(Boolean).slice(0, 3) as string[];

  // Following: filter already-loaded posts to only those from followed users
  const followingPosts = posts.filter(p => followingIds.has(p.author.id));

  // Active data for the FlatList — switch by tab
  const activeData: any[] =
    activeFilter === 'Following' ? followingPosts :
    activeFilter === 'Events'   ? feedEvents :
    posts;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? theme.colors.backgroundGradient.start : theme.colors.background }]}>
      <LinearGradient
        colors={isDark
          ? [theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]
          : [theme.colors.background, theme.colors.background, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <FlatList
          ref={flatListRef}
          data={activeData}
          keyExtractor={(item, idx) => `${item.id ?? idx}-${idx}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeFilter === 'For You' ? refreshing : false}
              onRefresh={activeFilter === 'For You' ? refresh : undefined}
              tintColor="rgba(255,255,255,0.35)"
              colors={['rgba(255,255,255,0.35)']}
            />
          }
          onEndReached={activeFilter === 'For You' ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={5}
          windowSize={10}

          // ── RENDER ITEM ──────────────────────────────────────
          renderItem={({ item, index }) => {
            // Events tab — inline event card
            if (activeFilter === 'Events') {
              return (
                <TouchableOpacity
                  style={styles.eventCardWrap}
                  activeOpacity={0.85}
                  onPress={() => {
                    EventPromotionTrackingService.trackView(item.id, 'feed_card');
                    navigation.navigate('EventDetails' as never, { eventId: item.id } as never);
                  }}
                >
                  {item.image_url && (
                    <Image source={{ uri: item.image_url }} style={styles.eventCardImage} />
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(8,8,15,0.92)']}
                    style={styles.eventCardGradient}
                  />
                  <View style={styles.eventCardContent}>
                    <View style={styles.eventDateBadge}>
                      <Text style={styles.eventDateText}>
                        {new Date(item.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.eventCardTitle} numberOfLines={2}>{item.title}</Text>
                    {item.location && (
                      <Text style={styles.eventCardLocation} numberOfLines={1}>
                        <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.5)" /> {item.location}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }

            // For You + Following — post cards
            return (
              <>
                <View style={[styles.postCardWrap, { borderColor: theme.colors.border }]}>
                  {item.post_type === 'event' && item.event_id ? (
                    <EventPostCard
                      post={item}
                      onReactionPress={t => handleReactionPress(item.id, t)}
                      onCommentPress={() => handleCommentPress(item.id)}
                      onShare={handleSharePost}
                      onSave={handleSavePost}
                      onUnsave={handleUnsavePost}
                      onAuthorPress={handleAuthorPress}
                      onEventTap={eid => EventPromotionTrackingService.trackView(eid, 'feed_card')}
                      isSaved={savedPosts.has(item.id)}
                      showForYouBadge={matchByEventId.has(item.event_id)}
                      personalisedReason={matchByEventId.get(item.event_id)?.personalised_reason}
                    />
                  ) : (
                    <PostCard
                      post={item}
                      onPress={() => handlePostPress(item.id)}
                      onReactionPress={t => handleReactionPress(item.id, t)}
                      onCommentPress={() => handleCommentPress(item.id)}
                      onEdit={handleEditPost}
                      onDelete={handleDeletePost}
                      onShare={handleSharePost}
                      onSave={handleSavePost}
                      onUnsave={handleUnsavePost}
                      onSaveImage={handleSaveImage}
                      onAuthorPress={handleAuthorPress}
                      onRepost={handleRepost}
                      onTip={handleTip}
                      onBlocked={async () => { await refresh(); }}
                      onReported={async () => {}}
                      isSaved={savedPosts.has(item.id)}
                    />
                  )}
                </View>
                {user && activeFilter === 'For You' && (index + 1) % 8 === 0 && (
                  <View style={styles.eventsStripWrap}>
                    <EventsStrip userId={user.id} />
                  </View>
                )}
              </>
            );
          }}

          ListHeaderComponent={
            <>
              {showCalendarNudge && activeFilter === 'For You' && (
                <GoogleCalendarNudgeBanner
                  onConnect={handleCalendarNudgeConnect}
                  onDismiss={handleCalendarNudgeDismiss}
                />
              )}

              {/* ════════════════════════════════════════════
                  SCREEN 01 — ENTRANCE: Editorial header
                  "Your Feed" two-tone, divider, social proof,
                  left-border tagline, genre strip, drop prompt
                ════════════════════════════════════════════ */}
              <View style={styles.editorialHeader}>
                {/* Ambient gradient — subtle in light mode, deep in dark */}
                {/* No overlay — let the root purple gradient show through */}

                {/* ── Wordmark ── */}
                <View style={styles.editorialTop}>
                  <View style={styles.wordmarkRow}>
                    <Text style={[styles.wordmark, { color: theme.colors.text }]}>
                      Your<Text style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }}> Feed</Text>
                    </Text>
                  </View>

                  <View style={[styles.wordmarkDivider, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                  {/* Social proof */}
                  <View style={styles.socialProofRow}>
                    <View style={styles.avatarStack}>
                      {stackAvatars.length > 0
                        ? stackAvatars.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={[styles.stackAvatar, i > 0 && { marginLeft: -12 }]} />
                          ))
                        : [0, 1, 2].map(i => (
                            <View key={i} style={[styles.stackAvatarPlaceholder, i > 0 && { marginLeft: -12 },
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                              <Ionicons name="person" size={11} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
                            </View>
                          ))}
                    </View>
                    <View style={{ gap: 3 }}>
                      <View style={styles.starsRow}>
                        {[0, 1, 2, 3, 4].map(i => (
                          <Ionicons key={i} name="star" size={10} color={isDark ? '#fff' : '#DC2626'} />
                        ))}
                      </View>
                      <Text style={[styles.socialProofLabel, { color: theme.colors.textSecondary }]}>
                        Active music community
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Bottom section ── */}
                <View style={styles.editorialBottom}>
                  <Text style={[styles.taglineText, {
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.65)',
                  }]}>DROP. DISCOVER. CONNECT.</Text>

                  <WalkthroughableView
                    order={1}
                    name="create_drop_earn"
                    text="Tap here to drop content and GET TIPPED! Share music, updates, or studio sessions. You keep 95%. Build your network and grow."
                  >
                    <TouchableOpacity onPress={handleCreatePost} activeOpacity={0.82} style={[styles.createPromptCard, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
                    }]}>
                      {userProfile?.avatar_url
                        ? <Image source={{ uri: userProfile.avatar_url }} style={styles.createAvatar} />
                        : <View style={[styles.createAvatarPlaceholder, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          }]}>
                            <Ionicons name="person" size={15} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
                          </View>
                      }
                      <Text style={[styles.createPromptText, {
                        color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)',
                      }]}>Drop something…</Text>
                      <LinearGradient
                        colors={['#DC2626', '#EC4899']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.createPromptBtn}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </WalkthroughableView>
                </View>
              </View>

              {/* ════════════════════════════════════════════
                  SCREEN 02 — COLLECTION: Text-only filter tabs
                  font-light ~28px, active = full opacity weight-500
                ════════════════════════════════════════════ */}
              <View style={[styles.tabsSection, {
                borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
              }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
                  {FILTER_TABS.map(tab => (
                    <TouchableOpacity key={tab} onPress={() => setActiveFilter(tab)} style={styles.tab}>
                      <Text style={[styles.tabText,
                        activeFilter === tab
                          ? { color: theme.colors.text, fontWeight: '500' }
                          : { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' },
                      ]}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Live Audio + Sound Academy — Screen 02 card design */}
              <LiveAudioCard onPress={() => navigation.navigate('LiveSessions' as never)} />
              <SoundAcademyCard onPress={() => {
                proResourceAnalytics.track('explore_courses_tap');
                (navigation as any).navigate('ProResources');
              }} />

              {/* Section label above posts — Screen 01 number/label pattern */}
              <View style={styles.sectionLabel}>
                <View style={[styles.sectionLabelLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
                <Text style={[styles.sectionLabelText, { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)' }]}>LATEST DROPS</Text>
                <View style={[styles.sectionLabelLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
              </View>
            </>
          }

          ListFooterComponent={
            activeFilter === 'For You' && loading && posts.length > 0
              ? <View style={styles.footerMsg}><Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Loading more…</Text></View>
              : activeFilter === 'For You' && !hasMore && posts.length > 0
              ? <View style={styles.footerMsg}><Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>You're all caught up</Text></View>
              : null
          }

          ListEmptyComponent={
            activeFilter === 'Events' && eventsLoading
              ? <View style={styles.footerMsg}><Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Loading events…</Text></View>
              : activeFilter === 'Events' && feedEvents.length === 0 && !eventsLoading
              ? <View style={styles.footerMsg}><Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>No upcoming events</Text></View>
              : activeFilter === 'Following' && followingPosts.length === 0 && !loading
              ? <View style={styles.footerMsg}><Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>No posts from people you follow yet</Text></View>
              : activeFilter === 'For You' && loading && posts.length === 0
              ? <SkeletonFeed />
              : activeFilter === 'For You' && error && posts.length === 0
              ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
              : null
          }
        />
      </SafeAreaView>

      {/* ── Modals ─────────────────────────────────────────── */}
      {/* TestCreatePostModal — redesigned visual shell */}
      <TestCreatePostModal
        visible={isCreateModalVisible && !editingPost}
        onClose={() => setIsCreateModalVisible(false)}
        onSubmit={async () => {
          await refresh();
          showToast('Your drop was posted', 'success');
        }}
      />
      {/* Real CreatePostModal for editing existing posts */}
      <CreatePostModal
        visible={isCreateModalVisible && !!editingPost}
        onClose={() => { setIsCreateModalVisible(false); setEditingPost(null); }}
        onSubmit={async (data) => {
          if (editingPost) {
            try {
              const up = await feedService.updatePost(editingPost.id, data);
              if (up) updatePostLocally(up);
              setEditingPost(null); setIsCreateModalVisible(false);
            } catch { Alert.alert('Error', 'Failed to update drop.'); }
          } else {
            await refresh(); setIsCreateModalVisible(false);
          }
        }}
        editingPost={editingPost}
      />

      {selectedPostForComments && (
        <CommentsModal
          visible={!!selectedPostForComments}
          post={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
          onViewFullPost={(postId) => { setSelectedPostForComments(null); handlePostPress(postId); }}
        />
      )}

      <TipModal
        visible={showTipModal}
        creatorId={tipAuthorId}
        creatorName={tipAuthorName}
        onClose={() => setShowTipModal(false)}
        onTipSuccess={() => {}}
      />

      <GoogleCalendarPrivacyModal
        visible={showCalendarPrivacy}
        onContinue={handleCalendarPrivacyContinue}
        onCancel={() => !calendarBusy && setShowCalendarPrivacy(false)}
        loading={calendarBusy}
      />

      <EarlyAdopterConversionModal
        visible={showEarlyAdopterModal}
        copyVariant={eaCopyVariant}
        onContinuePremium={() => { onEaConverted(); navigation.navigate('Upgrade' as never); }}
        onRemindLater={onEaRemindLater}
        onContinueFree={onEaDismissPermanently}
      />

      {/* Notification permission sheet */}
      <Modal visible={showNotifModal} transparent animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <BlurView intensity={22} tint="dark" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ padding: 28, paddingBottom: 44 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 24 }} />
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <LinearGradient colors={['#EC4899', '#9333EA']} style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="notifications" size={30} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={{ color: '#fff', fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.2 }}>SoundBridge works best with notifications on</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 20 }}>
                This app is built for timely alerts. Off = you miss matched events, paid gigs, sales moments, and personalised growth nudges.
              </Text>
              {[
                { icon: 'flash-outline', text: "Urgent gigs — Paid, time-critical. No alert = you're not in the running." },
                { icon: 'calendar-outline', text: 'Events matched to you — Local + your interests. Off = your crowd fills the room without you.' },
                { icon: 'cash-outline', text: 'Audio sales & drops — Off = others see it first.' },
                { icon: 'trending-up-outline', text: "Personalised career tips — Right-time nudges to grow. Off = you're on your own." },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13, gap: 12 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(236,72,153,0.18)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Ionicons name={item.icon as any} size={15} color="#EC4899" />
                  </View>
                  <Text style={{ flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20 }}>{item.text}</Text>
                </View>
              ))}
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20, lineHeight: 17 }}>You choose categories and quiet hours — we don't blast you.</Text>
              <TouchableOpacity style={{ borderRadius: 999, overflow: 'hidden', marginBottom: 12 }} activeOpacity={0.85}
                onPress={async () => { setShowNotifModal(false); if (notifAlreadyDenied) Linking.openSettings(); else await Notifications.requestPermissionsAsync(); }}>
                <LinearGradient colors={['#EC4899', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 999 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{notifAlreadyDenied ? 'Open Settings' : 'Allow notifications'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNotifModal(false)} activeOpacity={0.6} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14 }}>Not now</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 120 },

  // Post card — contained card with radius and border
  postCardWrap: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
  },

  // ── Editorial header — Screen 01 ─────────────────────────
  editorialHeader: {
    paddingTop: 16,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  editorialTop: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  editorialBottom: {
    paddingHorizontal: 20,
    gap: 16,
  },

  // Screen 01: "VelvetSound" two-tone wordmark row
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 46,
    fontWeight: '300',
    letterSpacing: -1.2,
    lineHeight: 48,
  },

  // Screen 01: border-b border-white/10
  wordmarkDivider: {
    borderBottomWidth: 1,
    marginBottom: 16,
  },

  // Screen 01: avatar stack + star row
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.5)',
    opacity: 0.82,
  },
  stackAvatarPlaceholder: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  socialProofLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.1 },

  // Screen 01: left-border tagline
  taglineBlock: {
    borderLeftWidth: 1.5,
    paddingLeft: 14,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    lineHeight: 18,
  },

  // Screen 01: brand logos row (opacity-40, grayscale)
  genreStrip: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    paddingTop: 14,
    opacity: 0.4,
  },
  genreLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Create post prompt
  createPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  createAvatar: { width: 32, height: 32, borderRadius: 16 },
  createAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  createPromptText: { flex: 1, fontSize: 14, letterSpacing: 0.1 },
  createPromptBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Tabs — Screen 02 text-only large tabs ─────────────────
  tabsSection: {
    borderTopWidth: 1,
    marginBottom: 4,
  },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 12 },
  tabText: { fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },

  // ── Section divider ───────────────────────────────────────
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
    gap: 12,
  },
  sectionLabelLine: { flex: 1, height: 1 },
  sectionLabelText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },


  // ── Events tab cards ──────────────────────────────────────
  eventCardWrap: {
    marginHorizontal: 16, marginBottom: 12,
    height: 200, borderRadius: 20, overflow: 'hidden',
  },
  eventCardImage: { width: '100%', height: '100%' },
  eventCardGradient: { ...StyleSheet.absoluteFillObject },
  eventCardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  eventDateBadge: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, marginBottom: 6,
  },
  eventDateText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  eventCardTitle: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 22, marginBottom: 4 },
  eventCardLocation: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // ── Events strip ──────────────────────────────────────────
  eventsStripWrap: { marginTop: 8, marginBottom: 8 },

  // ── Footer / empty states ─────────────────────────────────
  footerMsg: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 13, letterSpacing: 0.2 },
  errorBox: { margin: 16, padding: 16, backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: 12 },
  errorText: { color: '#F87171', fontSize: 13 },
});
