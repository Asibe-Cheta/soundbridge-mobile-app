import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Image,
  Share,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  has_tipped: boolean;
  profile: { id: string; display_name: string; avatar_url: string | null };
}

interface CommunityUpdate {
  id: string;
  creator_id: string;
  content: string;
  image_url: string | null;
  posted_at: string;
}

export default function MyCommunityScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();
  const isDark = theme.isDark;

  const [members, setMembers]       = useState<Member[]>([]);
  const [updates, setUpdates]       = useState<CommunityUpdate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting]       = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: memberData } = await supabase
        .from('community_memberships')
        .select(`id, user_id, joined_at,
          profile:profiles!community_memberships_user_id_fkey(id, display_name, avatar_url)`)
        .eq('creator_id', user.id)
        .order('joined_at', { ascending: !sortNewest });

      const { data: tipData } = await supabase
        .from('tips').select('sender_id')
        .eq('recipient_id', user.id).eq('status', 'completed');

      const tipperSet = new Set((tipData ?? []).map((t: any) => t.sender_id));
      setMembers((memberData ?? []).map((m: any) => ({
        id: m.id, user_id: m.user_id, joined_at: m.joined_at,
        has_tipped: tipperSet.has(m.user_id),
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      })));

      const { data: updatesData } = await supabase
        .from('community_updates').select('*')
        .eq('creator_id', user.id).order('posted_at', { ascending: false });
      setUpdates(updatesData ?? []);
    } catch (err) {
      console.error('MyCommunityScreen fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, sortNewest]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const dismissComposer = () => {
    Keyboard.dismiss();
    setShowComposer(false);
    setComposerText('');
  };

  const postUpdate = async () => {
    if (!composerText.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { data: newUpdate, error } = await supabase
        .from('community_updates')
        .insert({ creator_id: user.id, content: composerText.trim() })
        .select().single();
      if (error) throw error;
      setUpdates(prev => [newUpdate, ...prev]);
      setComposerText('');
      setShowComposer(false);

      const { data: memberIds } = await supabase
        .from('community_memberships').select('user_id').eq('creator_id', user.id);
      if (memberIds && memberIds.length > 0) {
        const creatorName = userProfile?.display_name ?? 'A creator';
        await supabase.from('notifications').insert(
          memberIds.map((m: any) => ({
            user_id: m.user_id, type: 'community_update',
            title: `${creatorName} shared a community update`,
            body: composerText.trim().slice(0, 100),
            data: { update_id: newUpdate.id, creator_id: user.id }, read: false,
          }))
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to post update.');
    } finally { setPosting(false); }
  };

  const deleteUpdate = (id: string) => {
    Alert.alert('Delete update?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('community_updates').delete().eq('id', id);
        setUpdates(prev => prev.filter(u => u.id !== id));
      }},
    ]);
  };

  const shareMyFanLink = async () => {
    const username = userProfile?.username ?? user?.id;
    try { await Share.share({ message: `Join my community on SoundBridge: https://soundbridge.live/${username}` }); } catch {}
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const renderMember = ({ item }: { item: Member }) => (
    <View style={[styles.memberRow, { borderBottomColor: theme.colors.border }]}>
      {item.profile?.avatar_url ? (
        <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '22' }]}>
          <Ionicons name="person" size={18} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.profile?.display_name ?? 'Member'}
        </Text>
        <Text style={[styles.memberJoined, { color: theme.colors.textSecondary }]}>
          Joined {formatDate(item.joined_at)}
        </Text>
      </View>
      {item.has_tipped && (
        <View style={[styles.tipBadge, { backgroundColor: '#10B98118' }]}>
          <Ionicons name="heart" size={11} color="#10B981" />
          <Text style={styles.tipBadgeText}>Tipped</Text>
        </View>
      )}
    </View>
  );

  const renderUpdate = ({ item }: { item: CommunityUpdate }) => (
    <View style={[styles.updateCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.updateTop}>
        <View style={styles.updateLockRow}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.updateMeta, { color: theme.colors.textSecondary }]}>
            Community only · {formatTimeAgo(item.posted_at)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => deleteUpdate(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={15} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.updateContent, { color: theme.colors.text }]}>{item.content}</Text>
    </View>
  );

  const ListHeader = () => (
    <>
      {/* Member stat — editorial, no card box */}
      <View style={styles.statBlock}>
        <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{members.length}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
          {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* Empty state */}
      {members.length === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="people-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No one has joined yet.
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Share your fan link to start building your community.
          </Text>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.colors.primary }]}
            onPress={shareMyFanLink} activeOpacity={0.85}
          >
            <Ionicons name="share-social-outline" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share My Fan Link</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Member list */}
      {members.length > 0 && (
        <View style={[styles.memberCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.memberCardHeader}>
            <Text style={[styles.cardSectionLabel, { color: theme.colors.text }]}>Members</Text>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortNewest(p => !p)}>
              <Ionicons name="swap-vertical-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.sortBtnText, { color: theme.colors.textSecondary }]}>
                {sortNewest ? 'Newest' : 'Oldest'}
              </Text>
            </TouchableOpacity>
          </View>
          {members.map(m => <View key={m.id}>{renderMember({ item: m })}</View>)}
        </View>
      )}

      {/* Updates label */}
      {updates.length > 0 && (
        <Text style={[styles.cardSectionLabel, { color: theme.colors.text, marginTop: 32, marginBottom: 14 }]}>
          Community Updates
        </Text>
      )}
    </>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 80 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <FlatList
          data={updates}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={styles.scroll}
          renderItem={renderUpdate}
          ListHeaderComponent={
            <>
              {/* ── Floating nav row ── */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.postBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowComposer(true)} activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={15} color="#fff" />
                  <Text style={styles.postBtnText}>Post Update</Text>
                </TouchableOpacity>
              </View>

              {/* ── Editorial page title ── */}
              <View style={styles.titleBlock}>
                <Text style={[styles.titlePrimary, { color: theme.colors.text }]}>My</Text>
                <Text style={[styles.titleSecondary, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)' }]}>
                  Community
                </Text>
              </View>

              <ListHeader />
            </>
          }
          ListEmptyComponent={updates.length === 0 ? (
            <Text style={[styles.emptyUpdatesHint, { color: theme.colors.textSecondary }]}>
              No updates yet. Post something exclusive for your members.
            </Text>
          ) : null}
        />

        {/* ── Composer modal — BlurView, verbatim from TipModal ── */}
        <Modal visible={showComposer} animationType="slide" transparent statusBarTranslucent>
          <KeyboardAvoidingView style={styles.kavFull} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissComposer} />

            <BlurView
              intensity={Platform.OS === 'ios' ? 50 : 0}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.sheet,
                {
                  backgroundColor: Platform.OS === 'android'
                    ? (isDark ? '#0F0A1E' : '#F5F5FA')
                    : (isDark ? 'rgba(18,12,36,0.92)' : 'rgba(245,245,250,0.95)'),
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />

              <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.sheetLockRow}>
                  <Ionicons name="lock-closed" size={13} color={theme.colors.textSecondary} />
                  <Text style={[styles.sheetMetaText, { color: theme.colors.textSecondary }]}>
                    Visible to your community members only
                  </Text>
                </View>
                <TouchableOpacity onPress={dismissComposer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.composerInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Share an exclusive update with your community…"
                placeholderTextColor={theme.colors.textSecondary}
                value={composerText}
                onChangeText={setComposerText}
                multiline autoFocus maxLength={2000}
              />

              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {composerText.length}/2000
              </Text>

              <TouchableOpacity
                style={[styles.postToComBtn, { backgroundColor: composerText.trim() ? theme.colors.primary : theme.colors.border }]}
                onPress={postUpdate} disabled={!composerText.trim() || posting} activeOpacity={0.85}
              >
                {posting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.postToComBtnText}>Post to Community</Text>
                }
              </TouchableOpacity>
            </BlurView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  // ── Floating nav row ──
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },

  // ── Editorial two-tone title ──
  titleBlock: {
    marginTop: 20,
    marginBottom: 32,
  },
  titlePrimary: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 58,
    fontFamily: Typography.body.fontFamily,
  },
  titleSecondary: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 58,
    fontFamily: Typography.body.fontFamily,
  },

  // ── Stat block (editorial, no card) ──
  statBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 56,
    fontFamily: Typography.body.fontFamily,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.3,
    fontFamily: Typography.body.fontFamily,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 28,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
    fontFamily: Typography.body.fontFamily,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: Typography.body.fontFamily,
    maxWidth: 280,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 4,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },

  // ── Member card ──
  memberCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Typography.body.fontFamily,
  },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontSize: 13, fontFamily: Typography.body.fontFamily },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', fontFamily: Typography.body.fontFamily },
  memberJoined: { fontSize: 12, marginTop: 2, fontFamily: Typography.body.fontFamily },
  tipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  tipBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '600', fontFamily: Typography.body.fontFamily },

  // ── Update cards ──
  updateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  updateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  updateLockRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  updateMeta: { fontSize: 12, fontFamily: Typography.body.fontFamily },
  updateContent: { fontSize: 15, lineHeight: 24, fontFamily: Typography.body.fontFamily },
  emptyUpdatesHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 24,
    fontFamily: Typography.body.fontFamily,
  },

  // ── Composer modal ──
  kavFull: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, marginBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetLockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetMetaText: { fontSize: 13, fontFamily: Typography.body.fontFamily },
  composerInput: {
    fontSize: 16, lineHeight: 24, minHeight: 120, maxHeight: 220,
    textAlignVertical: 'top', marginBottom: 8,
    borderWidth: 1, borderRadius: 14, padding: 14,
    fontFamily: Typography.body.fontFamily,
  },
  charCount: {
    fontSize: 12, textAlign: 'right', marginBottom: 16,
    fontFamily: Typography.body.fontFamily,
  },
  postToComBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  postToComBtnText: {
    color: '#fff', fontSize: 15, fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
});
