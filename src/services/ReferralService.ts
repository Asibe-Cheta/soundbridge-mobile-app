import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const REFERRAL_KEY = 'soundbridge_referral_code';
const LEGACY_REFERRAL_KEY = 'referral_code_data';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  storedAt: number;
}

class ReferralService {
  // ===== REFERRAL CODE STORAGE =====

  async storeReferralCode(code: string): Promise<void> {
    try {
      const normalized = code.toLowerCase().trim();
      await AsyncStorage.setItem(REFERRAL_KEY, normalized);
      const payload: StoredReferral = { code: normalized, storedAt: Date.now() };
      await AsyncStorage.setItem(LEGACY_REFERRAL_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  async getStoredReferralCode(): Promise<string | null> {
    try {
      const plain = await AsyncStorage.getItem(REFERRAL_KEY);
      if (plain) {
        return plain.toLowerCase().trim();
      }

      const legacyRaw = await AsyncStorage.getItem(LEGACY_REFERRAL_KEY);
      if (!legacyRaw) return null;
      const data: StoredReferral = JSON.parse(legacyRaw);
      if (Date.now() - data.storedAt > THIRTY_DAYS_MS) {
        await AsyncStorage.removeItem(LEGACY_REFERRAL_KEY);
        return null;
      }
      return data.code;
    } catch (_) {
      return null;
    }
  }

  async clearReferralCode(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([REFERRAL_KEY, LEGACY_REFERRAL_KEY]);
    } catch (_) {}
  }

  // ===== SUPABASE RPC CALLS =====

  async recordReferralSignup(referredUserId: string, referralCode: string): Promise<void> {
    try {
      await supabase.rpc('record_referral_signup', {
        p_referred_user_id: referredUserId,
        p_referral_code: referralCode,
      });
    } catch (err) {
      console.error('[ReferralService] recordReferralSignup error:', err);
    }
  }

  async grantInstitutionalAccess(userId: string, institution: string, accessTier = 'premium'): Promise<void> {
    try {
      await supabase.rpc('grant_institutional_access', {
        p_user_id: userId,
        p_institution: institution,
        p_access_tier: accessTier,
      });
    } catch (err) {
      console.error('[ReferralService] grantInstitutionalAccess error:', err);
    }
  }
}

export const referralService = new ReferralService();
