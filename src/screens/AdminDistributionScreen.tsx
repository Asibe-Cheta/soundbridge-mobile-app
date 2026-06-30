import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';

interface DistributionRequest {
  id: string;
  creator_id: string;
  track_id: string;
  artist_name: string;
  track_title: string;
  genre: string | null;
  isrc_code: string | null;
  featured_artists: string | null;
  explicit_content: boolean;
  requested_release_date: string;
  creator_email: string;
  stripe_payment_id: string;
  amount_paid: number;
  email_sent_to_partner: boolean;
  track_status: string;
  track_went_live_at: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null };
}

function statusColor(s: string) {
  if (s === 'live') return '#10B981';
  if (s === 'processing') return '#F59E0B';
  if (s === 'failed') return '#EF4444';
  return '#8B5CF6';
}

function statusLabel(s: string) {
  if (s === 'submitted') return 'Submitted';
  if (s === 'processing') return 'Processing';
  if (s === 'live') return 'Live';
  if (s === 'failed') return 'Failed';
  return s;
}

export default function AdminDistributionScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();
  const isDark = theme.isDark;

  const [requests, setRequests] = useState<DistributionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingLive, setMarkingLive] = useState<string | null>(null);

  // Month stats derived from data
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthRequests = requests.filter(r => r.created_at >= monthStart);
  const thisMonthRevenue = thisMonthRequests.reduce((sum, r) => sum + Number(r.amount_paid), 0);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('distribution_requests')
      .select(`
        *,
        profile:profiles!distribution_requests_creator_id_fkey(display_name, username)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests((data ?? []).map((r: any) => ({
        ...r,
        profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
      })));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const handleMarkAsLive = (req: DistributionRequest) => {
    Alert.alert(
      'Mark as Live',
      `Mark "${req.track_title}" by ${req.artist_name} as live on streaming platforms?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Live', style: 'default',
          onPress: async () => {
            setMarkingLive(req.id);
            try {
              const now = new Date().toISOString();
              const { error: updateErr } = await supabase
                .from('distribution_requests')
                .update({ track_status: 'live', track_went_live_at: now })
                .eq('id', req.id);
              if (updateErr) throw updateErr;

              // Push notification to creator
              await supabase.from('notifications').insert({
                user_id: req.creator_id,
                type: 'distribution_live',
                title: 'Your track is live',
                body: `${req.track_title} is now available on Spotify, Apple Music and major streaming platforms.`,
                data: { request_id: req.id, track_id: req.track_id },
                read: false,
              });

              setRequests(prev =>
                prev.map(r => r.id === req.id ? { ...r, track_status: 'live', track_went_live_at: now } : r)
              );
              Alert.alert('Done', `"${req.track_title}" has been marked as live. Creator notified.`);
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not update status.');
            } finally {
              setMarkingLive(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: DistributionRequest }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTrack, { color: theme.colors.text }]} numberOfLines={1}>{item.track_title}</Text>
          <Text style={[styles.cardArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.artist_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.track_status) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor(item.track_status) }]}>{statusLabel(item.track_status)}</Text>
        </View>
      </View>

      {/* Details grid */}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {[
        { label: 'Creator', value: item.profile?.display_name ?? item.artist_name },
        { label: 'Email', value: item.creator_email },
        { label: 'Submitted', value: formatDate(item.created_at) },
        { label: 'Release date', value: formatDate(item.requested_release_date) },
        { label: 'Amount paid', value: `£${Number(item.amount_paid).toFixed(2)}` },
        { label: 'Email to MBG', value: item.email_sent_to_partner ? 'Sent' : 'Pending' },
        { label: 'ISRC', value: item.isrc_code ?? 'Not assigned' },
        { label: 'Genre', value: item.genre ?? '–' },
      ].map(f => (
        <View key={f.label} style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{f.label}</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]} numberOfLines={1}>{f.value}</Text>
        </View>
      ))}

      {/* Actions */}
      {item.track_status !== 'live' && item.track_status !== 'failed' && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity
            style={[styles.markLiveBtn, { backgroundColor: '#10B981' + '18', borderColor: '#10B981' + '50' }]}
            onPress={() => handleMarkAsLive(item)}
            disabled={markingLive === item.id}
            activeOpacity={0.8}
          >
            {markingLive === item.id ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <>
                <Ionicons name="radio-button-on" size={16} color="#10B981" />
                <Text style={[styles.markLiveBtnText, { color: '#10B981' }]}>Mark as Live</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
      {item.track_status === 'live' && item.track_went_live_at && (
        <Text style={[styles.liveDate, { color: theme.colors.textSecondary }]}>
          Went live: {formatDate(item.track_went_live_at)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: theme.colors.text }]}>Distribution Requests</Text>
          <View style={{ width: 38 }} />
        </View>

        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListHeaderComponent={
            loading ? null : (
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.statNum, { color: theme.colors.primary }]}>{thisMonthRequests.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Submissions this month</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.statNum, { color: '#10B981' }]}>£{thisMonthRevenue.toFixed(2)}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Revenue this month</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="layers-outline" size={44} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No distribution requests yet.</Text>
              </View>
            )
          }
          renderItem={renderItem}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16 },
  statNum: { fontSize: 26, fontWeight: '800', letterSpacing: -1, fontFamily: Typography.body.fontFamily },
  statLabel: { fontSize: 12, marginTop: 4, fontFamily: Typography.body.fontFamily },

  card: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  cardTrack: { fontSize: 16, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  cardArtist: { fontSize: 13, marginTop: 3, fontFamily: Typography.body.fontFamily },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: Typography.body.fontFamily },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 13, fontFamily: Typography.body.fontFamily },
  detailValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', fontFamily: Typography.body.fontFamily },

  markLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  markLiveBtnText: { fontSize: 14, fontWeight: '700', fontFamily: Typography.body.fontFamily },
  liveDate: { fontSize: 12, textAlign: 'center', marginTop: 8, fontFamily: Typography.body.fontFamily },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: Typography.body.fontFamily },
});
