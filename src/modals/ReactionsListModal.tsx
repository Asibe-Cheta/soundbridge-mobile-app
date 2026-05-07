import React, { useState, useEffect, useRef } from 'react';
import VerifiedAvatar from '../components/VerifiedAvatar';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

type ReactionType = 'support' | 'love' | 'fire' | 'congrats';

const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  support:  { emoji: '👍', label: 'Like' },
  love:     { emoji: '❤️', label: 'Love' },
  fire:     { emoji: '🔥', label: 'Fire' },
  congrats: { emoji: '👏', label: 'Congrats' },
};

interface Reactor {
  user_id: string;
  reaction_type: ReactionType;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
  headline: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  postId: string;
  reactionsCount: { support: number; love: number; fire: number; congrats: number };
}

export default function ReactionsListModal({ visible, onClose, postId, reactionsCount }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReactionType | 'all'>('all');

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const totalReactions =
    reactionsCount.support + reactionsCount.love + reactionsCount.fire + reactionsCount.congrats;

  // Animate in / out
  useEffect(() => {
    if (visible) {
      setActiveFilter('all');
      fetchReactors();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const fetchReactors = async () => {
    setLoading(true);
    try {
      // Step 1: fetch all reactions for this post
      const { data: reactions, error: reactionsError } = await supabase
        .from('post_reactions')
        .select('user_id, reaction_type')
        .eq('post_id', postId);

      if (reactionsError) throw reactionsError;
      if (!reactions || reactions.length === 0) {
        setReactors([]);
        return;
      }

      // Step 2: fetch profiles for those users
      const userIds = [...new Set(reactions.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, professional_headline, is_verified')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const mapped: Reactor[] = reactions.map(r => {
        const p = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          reaction_type: r.reaction_type as ReactionType,
          display_name: p?.display_name ?? p?.username ?? 'Unknown',
          username: p?.username ?? '',
          avatar_url: p?.avatar_url ?? null,
          is_verified: p?.is_verified ?? false,
          headline: p?.professional_headline ?? null,
        };
      });

      setReactors(mapped);
    } catch (err: any) {
      console.error('Failed to fetch reactors:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    activeFilter === 'all' ? reactors : reactors.filter(r => r.reaction_type === activeFilter);

  // Only show filter tabs for reaction types that have at least 1
  const tabs: Array<{ key: ReactionType | 'all'; emoji?: string; count: number }> = [
    { key: 'all', count: totalReactions },
    ...(['support', 'love', 'fire', 'congrats'] as ReactionType[])
      .filter(t => reactionsCount[t] > 0)
      .map(t => ({ key: t, emoji: REACTION_META[t].emoji, count: reactionsCount[t] })),
  ];

  const handleUserPress = (userId: string) => {
    onClose();
    navigation.navigate('CreatorProfile', { userId });
  };

  const renderReactor = ({ item }: { item: Reactor }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => handleUserPress(item.user_id)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <VerifiedAvatar avatarUrl={item.avatar_url} isVerified={item.is_verified} size={44} />
        {/* Reaction badge */}
        <View style={[styles.reactionBadge, { borderColor: theme.colors.background }]}>
          <Text style={styles.reactionBadgeEmoji}>
            {REACTION_META[item.reaction_type]?.emoji ?? '👍'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {item.display_name}
        </Text>
        {item.headline ? (
          <Text style={[styles.headline, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.headline}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 8 },
        ]}
      >
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Reactions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={[styles.tabsRow, { borderBottomColor: theme.colors.border }]}>
          {tabs.map(tab => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && [styles.tabActive, { borderBottomColor: theme.colors.primary }],
                ]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
              >
                {tab.key === 'all' ? (
                  <Text style={[styles.tabLabel, { color: isActive ? theme.colors.primary : theme.colors.textSecondary }]}>
                    All {tab.count}
                  </Text>
                ) : (
                  <View style={styles.tabInner}>
                    <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                    <Text style={[styles.tabCount, { color: isActive ? theme.colors.primary : theme.colors.textSecondary }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} size="large" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.user_id + item.reaction_type}
            renderItem={renderReactor}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                No reactions yet
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 17,
  },
  closeBtn: {
    padding: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  tabEmoji: {
    fontSize: 18,
  },
  tabCount: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: 48,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBadgeEmoji: {
    fontSize: 13,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  headline: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 17,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 82,
  },
  empty: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
