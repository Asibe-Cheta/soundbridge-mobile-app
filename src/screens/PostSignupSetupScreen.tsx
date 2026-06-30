import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { walletService } from '../services/WalletService';
import GettingStartedChecklist from '../components/GettingStartedChecklist';
import { postSignupSetupState } from '../services/PostSignupSetupState';

type BasicProfile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
};

export default function PostSignupSetupScreen() {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [basicProfile, setBasicProfile] = useState<BasicProfile | null>(null);
  const [hasSpProfile, setHasSpProfile] = useState(false);
  const [hasPayoutMethod, setHasPayoutMethod] = useState(false);
  const [hasVerification, setHasVerification] = useState(false);
  const [hasFirstTrack, setHasFirstTrack] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadData(user.id);
  }, [user?.id]);

  const loadData = async (userId: string) => {
    try {
      const [profileResult, tracksResult, spResult, verifyResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, avatar_url, bio, genres, is_verified')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('audio_tracks')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', userId),
        supabase
          .from('service_provider_profiles')
          .select('headline, categories')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('verification_requests')
          .select('status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.data) {
        setBasicProfile(profileResult.data);
        setHasVerification(
          profileResult.data.is_verified === true ||
          verifyResult.data?.status === 'approved' ||
          verifyResult.data?.status === 'pending'
        );
      }
      setHasFirstTrack((tracksResult.count ?? 0) > 0);
      setHasSpProfile(!!(spResult.data?.headline && (spResult.data?.categories?.length ?? 0) > 0));

      if (session) {
        walletService.getWithdrawalMethods(session)
          .then((result: any) => {
            const count = result?.count ?? result?.methods?.length ?? 0;
            if (count > 0) setHasPayoutMethod(true);
          })
          .catch(() => {});
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    await postSignupSetupState.markSeen(user!.id);
  };

  const hasCompletedProfile = !!(
    basicProfile?.display_name &&
    basicProfile?.avatar_url &&
    basicProfile?.bio &&
    (basicProfile?.genres?.length ?? 0) > 0
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Ionicons name="rocket-outline" size={32} color="#818CF8" />
            </View>
            <Text style={[styles.heading, { color: theme.colors.text }]}>
              Let's get you set up properly
            </Text>
            <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
              These steps take a few minutes and make a real difference to how quickly people find and book you.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <GettingStartedChecklist
              userId={user?.id ?? ''}
              hasCompletedProfile={hasCompletedProfile}
              hasSpProfile={hasSpProfile}
              hasPayoutMethod={hasPayoutMethod}
              hasVerification={hasVerification}
              hasFirstTrack={hasFirstTrack}
              onGoToProfile={() => (navigation as any).navigate('EditProfile')}
              onGoToSpOnboarding={() => (navigation as any).navigate('ServiceProviderOnboarding')}
              onGoToPaymentMethods={() => (navigation as any).navigate('PaymentMethods')}
              onStartVerification={() => (navigation as any).navigate('Verification')}
              onGoToUpload={() => (navigation as any).navigate('Upload')}
            />
          )}

          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Continue to SoundBridge</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text style={[styles.skipNote, { color: theme.colors.textSecondary }]}>
            You can complete any of these steps later from your profile.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  subheading: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skipNote: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
