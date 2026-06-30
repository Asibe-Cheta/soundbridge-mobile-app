import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase } from '../lib/supabase'; // used for tracks, events, profile
import { feedService } from '../services/api/feedService';
import type { Post } from '../types/feed.types';
import PostCard from '../components/PostCard';
import TipModal from '../components/TipModal';
import { communityService } from '../services/CommunityService';
import { SystemTypography as Typography } from '../constants/Typography';

interface RouteParams {
  creatorId: string;
}

interface CommunityCreator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  genre?: string;
  role?: string;
}

interface CommunityTrack {
  id: string;
  title: string;
  cover_art_url?: string;
  file_url?: string;
  duration?: number;
  play_count?: number;
  likes_count?: number;
  genre?: string;
  created_at: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  event_date: string;
  location?: string;
  venue?: string;
}

interface CommunityMember {
  follower_id: string;
  avatar_url?: string;
  display_name?: string;
}

export default function CommunityScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, session } = useAuth();
  const { play, addToQueue } = useAudioPlayer();

  const { creatorId } = route.params as RouteParams;

  const [creator, setCreator] = useState<CommunityCreator | null>(null);
  const [tracks, setTracks] = useState<CommunityTrack[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [isCommunityMember, setIsCommunityMember] = useState(false);

  useEffect(() => {
    loadAll();
  }, [creatorId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadTracks(),
        loadEvents(),
        loadPosts(),
        loadMembers(),
        communityService.isMember(creatorId).then(setIsCommunityMember),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, genre, role')
      .eq('id', creatorId)
      .single();
    if (!error && data) setCreator(data);
  };

  const loadTracks = async () => {
    const { data } = await supabase
      .from('audio_tracks')
      .select('id, title, cover_art_url, file_url, duration, play_count, likes_count, genre, created_at')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(3);
    setTracks(data || []);
  };

  const loadEvents = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('events')
      .select('id, title, event_date, location, venue')
      .eq('creator_id', creatorId)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(5);
    setEvents(data || []);
  };

  const loadPosts = async () => {
    try {
      const { posts: fetched } = await feedService.getUserPosts(creatorId, 0, 5);
      setPosts(fetched || []);
    } catch {
      setPosts([]);
    }
  };

  const loadMembers = async () => {
    const [count, previews] = await Promise.all([
      communityService.getMemberCount(creatorId),
      communityService.getMemberPreviews(creatorId, user?.id, 5),
    ]);
    setMemberCount(count);
    setMembers(
      previews.map((p) => ({
        follower_id: p.id,
        avatar_url: p.avatar_url,
        display_name: p.display_name,
      }))
    );
  };

  const handleTrackPress = async (track: CommunityTrack) => {
    if (!track.file_url) return;
    try {
      await play({
        id: track.id,
        title: track.title,
        creator: {
          id: creatorId,
          username: creator?.username || '',
          display_name: creator?.display_name || '',
        },
        duration: track.duration,
        file_url: track.file_url,
        cover_image_url: track.cover_art_url,
        artwork_url: track.cover_art_url,
        plays_count: track.play_count,
        likes_count: track.likes_count,
        created_at: track.created_at,
      });
      const others = tracks.filter((t) => t.id !== track.id);
      others.forEach((t) => {
        if (!t.file_url) return;
        addToQueue({
          id: t.id,
          title: t.title,
          creator: {
            id: creatorId,
            username: creator?.username || '',
            display_name: creator?.display_name || '',
          },
          duration: t.duration,
          file_url: t.file_url,
          cover_image_url: t.cover_art_url,
          artwork_url: t.cover_art_url,
          plays_count: t.play_count,
          likes_count: t.likes_count,
          created_at: t.created_at,
        });
      });
    } catch {
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const navigateToCreatorProfile = () => {
    navigation.navigate('CreatorProfile' as never, { creatorId } as never);
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!creator) return null;

  const bioText = creator.bio || '';
  const bioTruncated = bioText.length > 120 && !bioExpanded;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {creator.avatar_url ? (
            <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
            </View>
          )}

          <Text style={[styles.creatorName, { color: theme.colors.text }]}>
            {creator.display_name}
          </Text>

          {creator.genre && (
            <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '25' }]}>
              <Text style={[styles.genreText, { color: theme.colors.primary }]}>
                {creator.genre}
              </Text>
            </View>
          )}

          {bioText.length > 0 && (
            <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)} activeOpacity={0.8}>
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]} numberOfLines={bioTruncated ? 2 : undefined}>
                {bioText}
              </Text>
              {bioText.length > 120 && (
                <Text style={[styles.bioToggle, { color: theme.colors.primary }]}>
                  {bioExpanded ? 'Show less' : 'more'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={[styles.memberCountLabel, { color: theme.colors.textSecondary }]}>
            {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'} in this community
          </Text>

          {isCommunityMember && (
            <View style={[styles.memberBadge, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
              <Text style={[styles.memberBadgeText, { color: theme.colors.primary }]}>Community Member</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.tipButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowTipModal(true)}
          >
            <Ionicons name="heart" size={16} color="#FFFFFF" />
            <Text style={styles.tipButtonText}>Send a Tip</Text>
          </TouchableOpacity>
        </View>

        {/* Latest Music */}
        {tracks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Latest Music</Text>
            {tracks.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={[styles.trackCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderCard }]}
                onPress={() => handleTrackPress(track)}
                activeOpacity={0.75}
              >
                {track.cover_art_url ? (
                  <Image source={{ uri: track.cover_art_url }} style={styles.trackCover} />
                ) : (
                  <View style={[styles.trackCover, styles.trackCoverPlaceholder, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
                  </View>
                )}
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                  {track.genre && (
                    <Text style={[styles.trackMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {track.genre}
                    </Text>
                  )}
                  {track.duration && (
                    <Text style={[styles.trackDuration, { color: theme.colors.textMuted }]}>
                      {formatDuration(track.duration)}
                    </Text>
                  )}
                </View>
                <View style={[styles.playButton, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={navigateToCreatorProfile} style={styles.seeAllLink}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See all music</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Events</Text>
            {events.map((event) => (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderCard }]}
              >
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                    {formatEventDate(event.event_date)}
                  </Text>
                  {(event.venue || event.location) && (
                    <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                      {' '}{event.venue || event.location}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.viewEventButton, { borderColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('EventDetails' as never, { event } as never)}
                >
                  <Text style={[styles.viewEventText, { color: theme.colors.primary }]}>View Event</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Posts */}
        {posts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              From {creator.display_name}
            </Text>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onAuthorPress={() => navigateToCreatorProfile()}
                onTip={() => setShowTipModal(true)}
              />
            ))}
            <TouchableOpacity onPress={navigateToCreatorProfile} style={styles.seeAllLink}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See all posts</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Community Members Preview */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Others in this community</Text>
            <View style={styles.membersRow}>
              {members.map((member) => (
                <View key={member.follower_id} style={styles.memberAvatarWrapper}>
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
              ))}
              {memberCount > members.length + 1 && (
                <Text style={[styles.othersLabel, { color: theme.colors.textSecondary }]}>
                  and {(memberCount - members.length - 1).toLocaleString()} others
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <TipModal
        visible={showTipModal}
        creatorId={creatorId}
        creatorName={creator.display_name}
        onClose={() => setShowTipModal(false)}
        onTipSuccess={() => setShowTipModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 72,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bio: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  bioToggle: {
    ...Typography.label,
    textAlign: 'center',
    marginBottom: 12,
  },
  memberCountLabel: {
    ...Typography.label,
    marginTop: 8,
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  memberBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  tipButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    padding: 10,
    gap: 12,
  },
  trackCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  trackCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    gap: 3,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  trackMeta: {
    fontSize: 13,
  },
  trackDuration: {
    fontSize: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    padding: 14,
  },
  eventInfo: {
    flex: 1,
    gap: 3,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 13,
  },
  viewEventButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  viewEventText: {
    fontSize: 13,
    fontWeight: '600',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberAvatarWrapper: {},
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  othersLabel: {
    fontSize: 13,
  },
  bottomPad: {
    height: 40,
  },
});
