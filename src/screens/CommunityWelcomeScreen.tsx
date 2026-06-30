import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { communityEntryService } from '../services/CommunityEntryService';
import { followService } from '../services/FollowService';

interface CreatorInfo {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  professional_headline?: string | null;
  genre?: string | null;
}

export default function CommunityWelcomeScreen() {
  const route = useRoute<any>();
  const { user, userProfile, refreshUser } = useAuth();

  const creatorId: string =
    route.params?.creatorId ?? userProfile?.community_entry_creator_id ?? '';

  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Subtle pulse animation on avatar ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (creatorId) {
      loadCreator();
      checkAlreadyFollowing();
      return;
    }
    // Profile row may lag — resolve from welcome-status API
    communityEntryService.getWelcomeStatus().then(async (status) => {
      if (!status.welcomeUsername) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, professional_headline, genre')
        .ilike('username', status.welcomeUsername!.toLowerCase().trim())
        .maybeSingle();
      if (data) {
        setCreator(data);
        checkAlreadyFollowing();
      }
    }).finally(() => setLoading(false));
  }, [creatorId]);

  const loadCreator = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, professional_headline, genre')
        .eq('id', creatorId)
        .single();
      if (data) setCreator(data);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  const checkAlreadyFollowing = async () => {
    if (!user?.id || !creatorId) return;
    const isFollowing = await followService.isFollowing(creatorId);
    if (isFollowing) setFollowing(true);
  };

  const handleFollow = async () => {
    if (submitting || !creatorId) return;
    setSubmitting(true);
    try {
      const result = await communityEntryService.completeEntry('follow', creatorId);
      if (!result.success) {
        setSubmitting(false);
        return;
      }
      await communityEntryService.clearWelcomePending();
      setFollowing(true);
      await communityEntryService.setPendingWelcomeNavigation({
        creatorId,
        welcomeFollow: true,
      });
      await refreshUser();
    } catch {
      setSubmitting(false);
    }
  };

  const handleExplore = async () => {
    if (submitting || !creatorId) return;
    setSubmitting(true);
    try {
      const result = await communityEntryService.completeEntry('explore', creatorId);
      if (!result.success) {
        setSubmitting(false);
        return;
      }
      await communityEntryService.clearWelcomePending();
      await refreshUser();
    } catch {
      setSubmitting(false);
    }
  };

  const displayName = creator?.display_name || 'this creator';
  const subline = creator?.genre || creator?.professional_headline || null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0D0D1A', '#13103A', '#0D0D1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#A855F7" />
          </View>
        ) : (
          <>
            {/* ── Top section — avatar ── */}
            <View style={styles.avatarSection}>
              <Animated.View style={[styles.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={['#A855F7', '#7C3AED', '#06B6D4', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ring}
                >
                  {creator?.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={56} color="rgba(255,255,255,0.4)" />
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>

              <Text style={styles.creatorName}>{displayName}</Text>
              {subline && <Text style={styles.creatorSub}>{subline}</Text>}
            </View>

            {/* ── Middle section — copy ── */}
            <View style={styles.copySection}>
              <Text style={styles.headline}>
                Welcome to {displayName}'s community.
              </Text>
              <Text style={styles.body}>
                You are now connected with {displayName} on SoundBridge. Follow them to get notified about new music, events and everything they create.
              </Text>
            </View>

            {/* ── Bottom section — CTAs ── */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={styles.followBtn}
                onPress={handleFollow}
                activeOpacity={0.88}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#7C3AED', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.followBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={following ? 'checkmark-circle' : 'person-add-outline'}
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.followBtnText}>
                        {following ? `Following ${displayName}` : `Follow ${displayName}`}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreLink}
                onPress={handleExplore}
                disabled={submitting}
              >
                <Text style={styles.exploreLinkText}>Explore SoundBridge</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D1A' },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Avatar section
  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  ringOuter: {
    marginBottom: 24,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  ring: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatar: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#1C1C2E',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  creatorSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '400',
  },

  // Copy section
  copySection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },

  // CTA section
  ctaSection: {
    paddingBottom: 16,
    gap: 12,
  },
  followBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  followBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  followBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  exploreLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  exploreLinkText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
});
