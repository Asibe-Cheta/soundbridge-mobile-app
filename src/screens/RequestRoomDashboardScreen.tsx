import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  Share,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { walletService } from '../services/WalletService';
import { SystemTypography as Typography } from '../constants/Typography';
import { MicGlowIcon, WaveformBars, useWaveformAnims } from '../components/RequestRoomBanner';

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#6D28D9';
const SESSION_BASE_URL = 'https://soundbridge.live/request';

interface RequestRoomSession {
  id: string;
  creator_id: string;
  session_name: string | null;
  minimum_tip_amount: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  total_tips_collected: number;
  total_requests_received: number;
}

interface RequestRoomRequest {
  id: string;
  session_id: string;
  song_request: string;
  tipper_name: string;
  tip_amount: number;
  status: 'pending' | 'playing' | 'done';
  created_at: string;
}

interface RouteParams {
  session: RequestRoomSession;
  creatorName: string;
}

export default function RequestRoomDashboardScreen({ route, navigation }: any) {
  const { session: initialSession, creatorName }: RouteParams = route.params;
  const { theme } = useTheme();
  const { session: authSession } = useAuth();

  const [requests, setRequests] = useState<RequestRoomRequest[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Derived — avoids double-counting when same tipper sends multiple requests
  const tipperCount = new Set(requests.map((r) => r.tipper_name)).size;

  const [tipFlash, setTipFlash] = useState<{ name: string; amount: number } | null>(null);
  const tipAnimValue = useRef(new Animated.Value(0)).current;

  const sessionId = initialSession.id;
  const sessionUrl = `${SESSION_BASE_URL}/${sessionId}`;
  const subscriptionRef = useRef<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useWaveformAnims();

  useEffect(() => {
    loadInitialRequests();
    subscribeToRequests();
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const loadInitialRequests = async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('request_room_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      setLoadError(`Could not load requests: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      setRequests(data);
      const total = data.reduce((sum: number, r: RequestRoomRequest) => sum + r.tip_amount, 0);
      setTotalEarned(total);
      return;
    }

    // request_room_requests is empty — fall back to wallet transactions.
    // The wallet records every tip including request room tips (description:
    // "Request Room tip: {song_request}"), and is the proven source of truth.
    // This covers sessions where request_room_requests wasn't yet populated.
    if (!authSession) return;
    try {
      const walletData = await walletService.getWalletTransactionsSafe(authSession, 100, 0);
      const sessionTips = walletData.transactions.filter(
        (tx) =>
          tx.transaction_type === 'tip_received' &&
          (tx.metadata as any)?.source === 'request_room' &&
          (tx.metadata as any)?.session_id === sessionId
      );
      if (sessionTips.length > 0) {
        const mapped: RequestRoomRequest[] = sessionTips.map((tx) => ({
          id: tx.id,
          session_id: sessionId,
          song_request: tx.description?.replace('Request Room tip: ', '') || 'Song Request',
          tipper_name: (tx.metadata as any)?.tipper_name || 'Fan',
          tip_amount: tx.amount,
          status: 'pending' as const,
          created_at: tx.created_at,
        }));
        setRequests(mapped);
        const total = sessionTips.reduce((sum, tx) => sum + tx.amount, 0);
        setTotalEarned(total);
      }
    } catch (e) {
      console.error('Wallet fallback failed:', e);
    }
  };

  const subscribeToRequests = () => {
    subscriptionRef.current = supabase
      .channel(`request_room:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_room_requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newRequest = payload.new as RequestRoomRequest;
          setRequests((prev) => [newRequest, ...prev]);
          setTotalEarned((prev) => prev + newRequest.tip_amount);
          triggerTipAnimation(newRequest.tipper_name, newRequest.tip_amount);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'request_room_requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as RequestRoomRequest;
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r))
          );
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('Request room subscription error:', err);
        else console.log('Request room subscription status:', status);
      });
  };

  const triggerTipAnimation = (name: string, amount: number) => {
    setTipFlash({ name, amount });
    tipAnimValue.setValue(0);
    Animated.sequence([
      Animated.timing(tipAnimValue, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(tipAnimValue, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setTipFlash(null));
  };

  const updateRequestStatus = async (requestId: string, status: 'playing' | 'done') => {
    await supabase
      .from('request_room_requests')
      .update({ status })
      .eq('id', requestId);
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Request a song and tip me live! ${sessionUrl}`,
        url: sessionUrl,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'This will deactivate your link and QR code. Your earnings and request history will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsEnding(true);
              await supabase
                .from('request_room_sessions')
                .update({
                  status: 'ended',
                  ended_at: new Date().toISOString(),
                  total_tips_collected: totalEarned,
                  total_requests_received: requests.length,
                })
                .eq('id', sessionId);
              navigation.goBack();
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            } finally {
              setIsEnding(false);
            }
          },
        },
      ]
    );
  };

  const renderRequestItem = useCallback(
    ({ item }: { item: RequestRoomRequest }) => {
      const isPending = item.status === 'pending';
      const isPlaying = item.status === 'playing';
      const isDone = item.status === 'done';

      return (
        <View
          style={[
            styles.requestCard,
            {
              backgroundColor: isPlaying ? 'rgba(239,68,68,0.1)' : theme.colors.card,
              borderColor: isPlaying ? 'rgba(239,68,68,0.4)' : theme.colors.border,
            },
          ]}
        >
          {isPlaying && (
            <View style={styles.playingBadge}>
              <Ionicons name="musical-note" size={10} color="#FFFFFF" />
              <Text style={styles.playingBadgeText}>PLAYING</Text>
            </View>
          )}

          <View style={styles.requestCardTop}>
            <View style={styles.requestInfo}>
              <Text style={[styles.songName, { color: theme.colors.text }]} numberOfLines={2}>
                {item.song_request}
              </Text>
              <Text style={[styles.tipperName, { color: theme.colors.textSecondary }]}>
                {item.tipper_name}
              </Text>
            </View>
            <View style={styles.requestAmount}>
              <LinearGradient
                colors={[PURPLE_DARK, PURPLE]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.amountBadge}
              >
                <Text style={styles.amountText}>${item.tip_amount.toFixed(2)}</Text>
              </LinearGradient>
            </View>
          </View>

          {!isDone && (
            <View style={styles.requestActions}>
              {isPending && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.12)' }]}
                  onPress={() => updateRequestStatus(item.id, 'playing')}
                >
                  <Ionicons name="play" size={14} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Playing</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                onPress={() => updateRequestStatus(item.id, 'done')}
              >
                <Ionicons name="checkmark" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isDone && (
            <View style={styles.doneTag}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.doneTagText, { color: theme.colors.textSecondary }]}>Done</Text>
            </View>
          )}
        </View>
      );
    },
    [theme]
  );

  const renderListHeader = () => (
    <View>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[PURPLE_DARK, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statIconBg}
          >
            <Ionicons name="cash" size={16} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${totalEarned.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Earned</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[PURPLE_DARK, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statIconBg}
          >
            <Ionicons name="list" size={16} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{requests.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Requests</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[PURPLE_DARK, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statIconBg}
          >
            <Ionicons name="people" size={16} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{tipperCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tippers</Text>
        </View>
      </View>

      {/* Share Row */}
      <View style={styles.shareRow}>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={handleShareLink}
        >
          <Ionicons name="share-outline" size={18} color={PURPLE} />
          <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>Share Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => setShowQR(true)}
        >
          <Ionicons name="qr-code-outline" size={18} color={PURPLE} />
          <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Min tip notice */}
      <View style={[styles.minTipRow, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="information-circle-outline" size={15} color={theme.colors.textSecondary} />
        <Text style={[styles.minTipText, { color: theme.colors.textSecondary }]}>
          Minimum tip: ${initialSession.minimum_tip_amount.toFixed(2)}
        </Text>
      </View>

      {requests.length > 0 && (
        <Text style={[styles.queueTitle, { color: theme.colors.text }]}>Request Queue</Text>
      )}
    </View>
  );

  const renderEmptyQueue = () => (
    <View style={styles.emptyQueue}>
      <Ionicons name="musical-notes-outline" size={56} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyQueueTitle, { color: theme.colors.text }]}>
        Waiting for requests
      </Text>
      {loadError ? (
        <Text style={[styles.emptyQueueText, { color: '#EF4444' }]}>{loadError}</Text>
      ) : (
        <Text style={[styles.emptyQueueText, { color: theme.colors.textSecondary }]}>
          Share your link or QR code so your audience can send song requests and tips.
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <WaveformBars barAnims={barAnims} />
          <View style={styles.headerInner}>
            <View style={styles.headerLeft}>
              <MicGlowIcon size={28} />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {initialSession.session_name || 'Request Room'}
                </Text>
                <Text style={styles.headerSubtitle}>{creatorName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.livePulseWrapper}>
                <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
                <Animated.View style={[styles.liveDotOuter, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.liveDotInner} />
              </View>
              <TouchableOpacity
                style={[styles.endButton, { opacity: isEnding ? 0.6 : 1 }]}
                onPress={handleEndSession}
                disabled={isEnding}
              >
                <LinearGradient
                  colors={['#DC2626', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.endButtonGradient}
                >
                  <Text style={styles.endButtonText}>End Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Request list */}
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyQueue}
        />

        {/* Tip flash animation */}
        {tipFlash && (
          <Animated.View
            style={[
              styles.tipFlash,
              {
                opacity: tipAnimValue,
                transform: [
                  {
                    translateY: tipAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tipFlashGradient}
            >
              <Text style={styles.tipFlashEmoji}>💰</Text>
              <Text style={styles.tipFlashText}>
                {tipFlash.name} tipped ${tipFlash.amount.toFixed(2)}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.qrOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowQR(false)}
          />
          <View style={[styles.qrModal, { backgroundColor: theme.colors.background }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: theme.colors.text }]}>
                {initialSession.session_name || 'Request Room'}
              </Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.qrModalSubtitle, { color: theme.colors.textSecondary }]}>
              Scan to make a song request
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={sessionUrl}
                size={220}
                backgroundColor="#ffffff"
                color="#111111"
                logo={require('../../assets/images/logos/logo-trans-lockup.png')}
                logoSize={44}
                logoBackgroundColor="#ffffff"
                logoBorderRadius={4}
                logoMargin={3}
              />
            </View>

            <Text style={[styles.qrUrl, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {sessionUrl}
            </Text>

            <TouchableOpacity
              style={[styles.qrShareButton, { backgroundColor: PURPLE }]}
              onPress={() => {
                setShowQR(false);
                handleShareLink();
              }}
            >
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.qrShareButtonText}>Share Link Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  safeArea: { flex: 1 },
  header: {
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.body.fontFamily,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Typography.body.fontFamily,
  },
  livePulseWrapper: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  glowRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  liveDotOuter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
  liveDotInner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  endButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  endButtonGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Typography.body.fontFamily,
  },
  shareRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },
  minTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  minTipText: {
    fontSize: 12,
    fontFamily: Typography.body.fontFamily,
  },
  queueTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    fontFamily: Typography.body.fontFamily,
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    marginBottom: 8,
    backgroundColor: '#EF4444',
  },
  playingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestInfo: { flex: 1 },
  songName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Typography.body.fontFamily,
  },
  tipperName: {
    fontSize: 13,
    fontFamily: Typography.body.fontFamily,
  },
  requestAmount: {},
  amountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  amountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  doneTagText: {
    fontSize: 12,
    fontFamily: Typography.body.fontFamily,
  },
  emptyQueue: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  emptyQueueTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Typography.body.fontFamily,
  },
  emptyQueueText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Typography.body.fontFamily,
  },
  tipFlash: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tipFlashGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tipFlashEmoji: { fontSize: 18 },
  tipFlashText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    fontFamily: Typography.body.fontFamily,
  },
  qrModalSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    alignSelf: 'flex-start',
    fontFamily: Typography.body.fontFamily,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  qrUrl: {
    fontSize: 11,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Typography.body.fontFamily,
  },
  qrShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  qrShareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
});
