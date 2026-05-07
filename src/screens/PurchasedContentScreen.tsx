/**
 * Purchased Content Screen
 * Displays all content purchased by the user
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { contentPurchaseService } from '../services/ContentPurchaseService';
import { supabase } from '../lib/supabase';
import type { UserPurchasedContent } from '../types/paid-content';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';

type FilterType = 'all' | 'track' | 'album' | 'podcast';

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all',     label: 'All',      icon: 'grid-outline' },
  { key: 'track',   label: 'Tracks',   icon: 'musical-note-outline' },
  { key: 'album',   label: 'Albums',   icon: 'albums-outline' },
  { key: 'podcast', label: 'Podcasts', icon: 'mic-outline' },
];

export default function PurchasedContentScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play, currentTrack, isPlaying } = useAudioPlayer();

  const [purchases, setPurchases] = useState<UserPurchasedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;
      const data = await contentPurchaseService.getUserPurchasedContent(session.data.session);
      setPurchases(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
      Alert.alert('Error', 'Failed to load purchased content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPurchases();
  }, []);

  const handleDownload = async (purchase: UserPurchasedContent) => {
    Alert.alert(
      'Download',
      `Download "${purchase.content.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              const session = await supabase.auth.getSession();
              if (!session.data.session) return;
              await contentPurchaseService.downloadContent(
                session.data.session,
                purchase.content_id,
                purchase.content_type
              );
              Alert.alert('Success', 'Download started!');
            } catch {
              Alert.alert('Error', 'Failed to download content');
            }
          },
        },
      ]
    );
  };

  const handlePlay = async (purchase: UserPurchasedContent) => {
    if (purchase.content_type !== 'track') {
      Alert.alert('Coming Soon', 'Playback for albums and podcasts is coming soon!');
      return;
    }
    try {
      await play({
        id: purchase.content.id,
        title: purchase.content.title,
        description: purchase.content.description,
        file_url: purchase.content.file_url,
        cover_image_url: purchase.content.cover_art_url,
        duration: purchase.content.duration,
        created_at: purchase.content.created_at,
        creator_id: purchase.content.creator_id,
        creator: purchase.content.creator,
        is_paid: true,
        price: purchase.price_paid,
        currency: purchase.currency,
      });
    } catch {
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };
    return `${symbols[currency] ?? currency}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const typeIcon = (type: string) => {
    if (type === 'track') return 'musical-note';
    if (type === 'album') return 'albums';
    return 'mic';
  };

  const filteredPurchases =
    filterType === 'all' ? purchases : purchases.filter(p => p.content_type === filterType);

  // ─── Card ────────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: UserPurchasedContent }) => {
    const isCurrentTrack = currentTrack?.id === item.content.id;
    const isPlayingThis = isCurrentTrack && isPlaying;

    return (
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => handlePlay(item)}
        activeOpacity={0.8}
      >
        <BlurView
          intensity={18}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[
            styles.card,
            {
              borderColor: isCurrentTrack
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          {/* Cover art */}
          <View style={styles.coverWrapper}>
            {item.content.cover_art_url ? (
              <Image source={{ uri: item.content.cover_art_url }} style={styles.cover} />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons name={typeIcon(item.content_type) as any} size={28} color={theme.colors.primary} />
              </View>
            )}
            {isPlayingThis && (
              <View style={[styles.playingBadge, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="volume-high" size={12} color="#FFF" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {item.content.title}
            </Text>
            <Text style={[styles.artist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.content.creator?.display_name || 'Unknown Artist'}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.typePill, { backgroundColor: theme.colors.primary + '18' }]}>
                <Text style={[styles.typeText, { color: theme.colors.primary }]}>
                  {item.content_type.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatDate(item.purchased_at)}
              </Text>
            </View>

            <Text style={[styles.priceText, { color: theme.colors.text }]}>
              {formatPrice(item.price_paid, item.currency)}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => handlePlay(item)}
            >
              <Ionicons name={isPlayingThis ? 'pause' : 'play'} size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleDownload(item)}
            >
              <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  // ─── Empty state ─────────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIconRing, { backgroundColor: theme.colors.primary + '15' }]}>
        <Ionicons name="musical-notes-outline" size={44} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No purchased content yet
      </Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
        Unlock exclusive tracks, albums, and podcasts from your favourite creators.
      </Text>
      <TouchableOpacity
        style={styles.discoverBtn}
        onPress={() => navigation.navigate('Discover' as never)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.discoverBtnGradient}
        >
          <Ionicons name="compass-outline" size={18} color="#FFF" />
          <Text style={styles.discoverBtnText}>Discover Music</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.centred} edges={['top']}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading your library…
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* ── Top bar ── */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { color: theme.colors.text }]}>My Library</Text>
            <Text style={[styles.topBarCount, { color: theme.colors.textSecondary }]}>
              {filteredPurchases.length} {filteredPurchases.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={styles.topBarSpacer} />
        </View>

        {/* ── Filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(f => {
            const active = filterType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilterType(f.key)}
                activeOpacity={0.75}
                style={styles.filterPillWrapper}
              >
                {active ? (
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'BB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterPill}
                  >
                    <Ionicons name={f.icon as any} size={14} color="#FFF" />
                    <Text style={[styles.filterLabel, { color: '#FFF' }]}>{f.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.filterPill, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
                    <Ionicons name={f.icon as any} size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>{f.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── List ── */}
        <FlatList
          data={filteredPurchases}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  topBarCount: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
    marginTop: 2,
  },
  topBarSpacer: { width: 40 },

  // Filter tabs
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterPillWrapper: {},
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterLabel: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Card
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    overflow: 'hidden',
  },
  coverWrapper: { position: 'relative' },
  cover: { width: 72, height: 72, borderRadius: 10 },
  coverPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  title: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 15,
  },
  artist: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 9,
  },
  metaText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 11,
  },
  priceText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
  },
  actions: { gap: 8 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 72,
    gap: 12,
  },
  emptyIconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 20,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  discoverBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 4,
  },
  discoverBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
  },
  discoverBtnText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    color: '#FFF',
    fontSize: 15,
  },
});
