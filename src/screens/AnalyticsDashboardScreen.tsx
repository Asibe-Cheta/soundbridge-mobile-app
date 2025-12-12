import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';
import { contentCacheService } from '../services/contentCacheService';

interface AnalyticsData {
  stats: {
    totalPlays: number;
    totalLikes: number;
    totalShares: number;
    totalDownloads: number;
    followers: number;
    following: number;
    tracks: number;
    events: number;
  };
  recentTracks: Array<{
    id: string;
    title: string;
    duration: string;
    plays: number;
    likes: number;
    uploadedAt: string;
    coverArt?: string;
  }>;
  recentEvents: Array<{
    id: string;
    title: string;
    date: string;
    attendees: number;
    location: string;
    status: 'upcoming' | 'past' | 'cancelled';
  }>;
  monthlyPlays: number;
  engagementRate: number;
  topGenre: string;
  monthlyPlaysChange: number;
  engagementRateChange: number;
}

const CACHE_KEY = 'ANALYTICS_DASHBOARD';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function AnalyticsDashboardScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async (forceRefresh = false) => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = await contentCacheService.getCache(CACHE_KEY);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('📦 Using cached analytics data');
          setAnalytics(cached.data);
          setLoading(false);
          // Still fetch in background to update cache
          fetchAnalytics(true);
          return;
        }
      }

      await fetchAnalytics(false);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      // Try to load from cache even if expired
      const cached = await contentCacheService.getCache(CACHE_KEY);
      if (cached) {
        setAnalytics(cached.data);
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnalytics = async (background = false) => {
    if (!session) return;

    try {
      if (!background) {
        setLoading(true);
      }

      const result = await profileService.getAnalytics(session);
      
      if (result.success && result.analytics) {
        setAnalytics(result.analytics);
        lastFetchTime.current = Date.now();
        
        // Cache the data
        await contentCacheService.saveCache('ANALYTICS', CACHE_KEY, result.analytics);
      } else {
        console.warn('⚠️ Analytics API returned no data');
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      if (!background) {
        throw error;
      }
    } finally {
      if (!background) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics(true);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return num.toFixed(1) + '%';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <Ionicons name="trending-up" size={16} color="#4CAF50" />;
    } else if (change < 0) {
      return <Ionicons name="trending-down" size={16} color="#F44336" />;
    }
    return <Ionicons name="remove" size={16} color={theme.colors.textSecondary} />;
  };

  const renderStatCard = (
    title: string,
    value: number | string,
    icon: string,
    color: string,
    subtitle?: string,
    trend?: number
  ) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            {getTrendIcon(trend)}
            <Text style={[styles.trendText, { color: trend > 0 ? '#4CAF50' : trend < 0 ? '#F44336' : theme.colors.textSecondary }]}>
              {trend > 0 ? '+' : ''}{formatPercentage(trend)}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderProgressBar = (label: string, value: number, max: number, color: string) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.colors.text }]}>{label}</Text>
          <Text style={[styles.progressValue, { color: theme.colors.text }]}>
            {formatNumber(value)} / {formatNumber(max)}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressPercentage, { color: theme.colors.textSecondary }]}>
          {formatPercentage(percentage)}
        </Text>
      </View>
    );
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Analytics</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="bar-chart-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No analytics data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Analytics</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Total Plays', analytics.stats.totalPlays, 'play-circle', '#2196F3')}
            {renderStatCard('Total Likes', analytics.stats.totalLikes, 'heart', '#DC2626')}
            {renderStatCard('Followers', analytics.stats.followers, 'people', '#8B5CF6')}
            {renderStatCard('Tracks', analytics.stats.tracks, 'musical-notes', '#10B981')}
          </View>
        </View>

        {/* Engagement Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Engagement</Text>
          <View style={[styles.engagementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.engagementHeader}>
              <Text style={[styles.engagementLabel, { color: theme.colors.text }]}>Engagement Rate</Text>
              <View style={styles.trendContainer}>
                {getTrendIcon(analytics.engagementRateChange)}
                <Text style={[styles.trendText, { color: analytics.engagementRateChange > 0 ? '#4CAF50' : analytics.engagementRateChange < 0 ? '#F44336' : theme.colors.textSecondary }]}>
                  {analytics.engagementRateChange > 0 ? '+' : ''}{formatPercentage(analytics.engagementRateChange)}
                </Text>
              </View>
            </View>
            <Text style={[styles.engagementValue, { color: theme.colors.primary }]}>
              {formatPercentage(analytics.engagementRate)}
            </Text>
            {renderProgressBar('Engagement', analytics.stats.totalLikes, analytics.stats.totalPlays, theme.colors.primary)}
          </View>

          <View style={[styles.monthlyPlaysCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.engagementHeader}>
              <Text style={[styles.engagementLabel, { color: theme.colors.text }]}>Monthly Plays</Text>
              <View style={styles.trendContainer}>
                {getTrendIcon(analytics.monthlyPlaysChange)}
                <Text style={[styles.trendText, { color: analytics.monthlyPlaysChange > 0 ? '#4CAF50' : analytics.monthlyPlaysChange < 0 ? '#F44336' : theme.colors.textSecondary }]}>
                  {analytics.monthlyPlaysChange > 0 ? '+' : ''}{formatPercentage(analytics.monthlyPlaysChange)}
                </Text>
              </View>
            </View>
            <Text style={[styles.engagementValue, { color: theme.colors.primary }]}>
              {formatNumber(analytics.monthlyPlays)}
            </Text>
          </View>

          {analytics.topGenre && (
            <View style={[styles.genreCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="musical-note" size={20} color={theme.colors.primary} />
              <View style={styles.genreInfo}>
                <Text style={[styles.genreLabel, { color: theme.colors.textSecondary }]}>Top Genre</Text>
                <Text style={[styles.genreValue, { color: theme.colors.text }]}>{analytics.topGenre}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Additional Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Additional Metrics</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Shares', analytics.stats.totalShares, 'share-social', '#FF9800')}
            {renderStatCard('Downloads', analytics.stats.totalDownloads, 'download', '#9C27B0')}
            {renderStatCard('Following', analytics.stats.following, 'person-add', '#00BCD4')}
            {renderStatCard('Events', analytics.stats.events, 'calendar', '#E91E63')}
          </View>
        </View>

        {/* Recent Tracks */}
        {analytics.recentTracks && analytics.recentTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Tracks</Text>
            {analytics.recentTracks.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={[styles.trackCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('TrackDetails' as never, { trackId: track.id } as never)}
              >
                {track.coverArt && (
                  <Image source={{ uri: track.coverArt }} style={styles.trackCover} />
                )}
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <View style={styles.trackStats}>
                    <View style={styles.trackStatItem}>
                      <Ionicons name="play" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                        {formatNumber(track.plays)}
                      </Text>
                    </View>
                    <View style={styles.trackStatItem}>
                      <Ionicons name="heart" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                        {formatNumber(track.likes)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Events */}
        {analytics.recentEvents && analytics.recentEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Events</Text>
            {analytics.recentEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('EventDetails' as never, { eventId: event.id } as never)}
              >
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={styles.eventDetails}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.eventDetailText, { color: theme.colors.textSecondary }]}>
                      {new Date(event.date).toLocaleDateString()}
                    </Text>
                    {event.location && (
                      <>
                        <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} style={styles.eventIcon} />
                        <Text style={[styles.eventDetailText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {event.location}
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={styles.eventStats}>
                    <View style={[styles.eventStatusBadge, {
                      backgroundColor: event.status === 'upcoming' ? '#4CAF50' + '20' : event.status === 'past' ? '#9E9E9E' + '20' : '#F44336' + '20',
                    }]}>
                      <Text style={[styles.eventStatusText, {
                        color: event.status === 'upcoming' ? '#4CAF50' : event.status === 'past' ? '#9E9E9E' : '#F44336',
                      }]}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.eventAttendees, { color: theme.colors.textSecondary }]}>
                      {event.attendees} attendees
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  engagementCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  engagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  engagementLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  engagementValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  monthlyPlaysCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  genreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  genreInfo: {
    flex: 1,
  },
  genreLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  genreValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    gap: 16,
  },
  trackStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackStatText: {
    fontSize: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eventIcon: {
    marginLeft: 8,
  },
  eventDetailText: {
    fontSize: 12,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventAttendees: {
    fontSize: 12,
  },
});

