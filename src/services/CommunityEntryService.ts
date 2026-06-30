import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import { referralService } from './ReferralService';

const KEYS = {
  CREATOR_USERNAME: 'soundbridge_community_entry_creator',
  CREATOR_ID: 'soundbridge_community_entry_creator_id',
  LEGACY_DEFERRED: 'deferredArtistLink',
  POST_WELCOME_NAV: 'soundbridge_post_welcome_nav',
  PENDING_WELCOME_CREATOR: 'soundbridge_pending_welcome_creator_id',
} as const;

export interface PostWelcomeNavigation {
  creatorId: string;
  welcomeFollow?: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface CommunityAttribution {
  communityCreatorUsername: string | null;
  communityCreatorId: string | null;
  referralCode: string | null;
}

export interface CommunityWelcomeStatus {
  needsWelcome: boolean;
  welcomeUsername: string | null;
}

export interface CompleteOnboardingResult {
  success: boolean;
  welcomeUsername: string | null;
}

class CommunityEntryService {
  async persistCreatorEntry(username: string, creatorId?: string | null): Promise<void> {
    const normalized = username.toLowerCase().trim();
    if (!normalized) return;

    try {
      await AsyncStorage.setItem(KEYS.CREATOR_USERNAME, normalized);
      await AsyncStorage.setItem(KEYS.LEGACY_DEFERRED, normalized);

      let id = creatorId ?? null;
      if (!id) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', normalized)
          .maybeSingle();
        id = data?.id ?? null;
      }
      if (id) {
        await AsyncStorage.setItem(KEYS.CREATOR_ID, id);
      }
    } catch (err) {
      console.warn('[CommunityEntryService] persistCreatorEntry error:', err);
    }
  }

  async getAttribution(): Promise<CommunityAttribution> {
    try {
      let username =
        (await AsyncStorage.getItem(KEYS.CREATOR_USERNAME)) ??
        (await AsyncStorage.getItem(KEYS.LEGACY_DEFERRED));

      if (username) {
        username = username.toLowerCase().trim();
      }

      const creatorId = await AsyncStorage.getItem(KEYS.CREATOR_ID);
      const referralCode = await referralService.getStoredReferralCode();

      return {
        communityCreatorUsername: username,
        communityCreatorId: creatorId,
        referralCode,
      };
    } catch {
      return {
        communityCreatorUsername: null,
        communityCreatorId: null,
        referralCode: null,
      };
    }
  }

  attributionFieldsForProfile(attr: CommunityAttribution): Record<string, string> {
    const fields: Record<string, string> = {};
    if (attr.communityCreatorUsername) {
      fields.community_creator_username = attr.communityCreatorUsername;
    }
    if (attr.communityCreatorId) {
      fields.community_creator_id = attr.communityCreatorId;
    }
    return fields;
  }

  attributionFieldsForOnboarding(attr: CommunityAttribution): Record<string, string> {
    const fields: Record<string, string> = {};
    if (attr.communityCreatorUsername) {
      fields.communityCreatorUsername = attr.communityCreatorUsername;
    }
    if (attr.communityCreatorId) {
      fields.communityCreatorId = attr.communityCreatorId;
    }
    // Referral: web reads user_metadata.referred_by_code at signup only — not body referralCode
    return fields;
  }

  async clearAttribution(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.CREATOR_USERNAME,
        KEYS.CREATOR_ID,
        KEYS.LEGACY_DEFERRED,
      ]);
      await referralService.clearReferralCode();
    } catch (_) {}
  }

  /** @deprecated Use persistCreatorEntry — kept for DeepLinkingService compat */
  async consumeDeferredArtistLink(): Promise<string | null> {
    const attr = await this.getAttribution();
    return attr.communityCreatorUsername;
  }

  async completeOnboarding(userId: string): Promise<CompleteOnboardingResult> {
    const attr = await this.getAttribution();
    console.log('[CommunityEntryService] completeOnboarding attribution:', attr);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, welcomeUsername: null };
    }

    const body = {
      userId,
      ...this.attributionFieldsForOnboarding(attr),
    };

    try {
      const data = await apiFetch<{
        success?: boolean;
        welcomeUsername?: string | null;
      }>('/api/user/complete-onboarding', {
        session,
        method: 'POST',
        body: JSON.stringify(body),
      });

      const success = data?.success !== false;
      const apiWelcomeUsername = data?.welcomeUsername ?? null;

      if (success) {
        await this.applyReferralAttribution(userId, attr);
        await this.ensureCommunityEntryApplied(userId, attr, session.access_token, body);
      }

      // Keep local attribution until welcome is dismissed — do not clear based on local fallback
      if (success && !attr.communityCreatorUsername && !attr.communityCreatorId) {
        await this.clearAttribution();
      }

      return {
        success,
        welcomeUsername: apiWelcomeUsername ?? attr.communityCreatorUsername ?? null,
      };
    } catch (err) {
      console.error('[CommunityEntryService] completeOnboarding apiFetch error:', err);
      return this.completeOnboardingViaFetch(session.access_token, body, attr, userId);
    }
  }

  /** Retry complete-onboarding if profile still missing community_entry_creator_id */
  private async ensureCommunityEntryApplied(
    userId: string,
    attr: CommunityAttribution,
    accessToken: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    if (!attr.communityCreatorUsername && !attr.communityCreatorId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('community_entry_creator_id')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.community_entry_creator_id) return;

    console.warn('[CommunityEntryService] community_entry_creator_id still null — retrying complete-onboarding');
    try {
      const { config } = await import('../config/environment');
      await fetch(`${config.apiUrl}/api/user/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('[CommunityEntryService] ensureCommunityEntryApplied retry failed:', err);
    }
  }

  /** Partner /join?ref= — sets community_entry_creator_id via RPC (same as web complete-onboarding) */
  private async applyReferralAttribution(
    userId: string,
    attr: CommunityAttribution,
  ): Promise<void> {
    if (!attr.referralCode) return;
    try {
      await referralService.recordReferralSignup(userId, attr.referralCode);
      console.log('[CommunityEntryService] record_referral_signup:', attr.referralCode);
    } catch (err) {
      console.warn('[CommunityEntryService] applyReferralAttribution error:', err);
    }
  }

  /** Fallback — matches OnboardingScreen fetch pattern if apiFetch fails */
  private async completeOnboardingViaFetch(
    accessToken: string,
    body: Record<string, unknown>,
    attr: CommunityAttribution,
    userId: string,
  ): Promise<CompleteOnboardingResult> {
    try {
      const { config } = await import('../config/environment');
      const response = await fetch(`${config.apiUrl}/api/user/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      const success = response.ok && data?.success !== false;
      const apiWelcomeUsername = data?.welcomeUsername ?? null;

      if (success) {
        await this.applyReferralAttribution(userId, attr);
      }

      if (success && !attr.communityCreatorUsername && !attr.communityCreatorId) {
        await this.clearAttribution();
      }

      return {
        success,
        welcomeUsername: apiWelcomeUsername ?? attr.communityCreatorUsername ?? null,
      };
    } catch (err) {
      console.error('[CommunityEntryService] completeOnboardingViaFetch error:', err);
      return { success: false, welcomeUsername: attr.communityCreatorUsername };
    }
  }

  /**
   * Call after onboarding API. Re-reads profile + welcome-status API.
   */
  async resolveWelcomeAfterOnboarding(
    refreshUser: () => Promise<void>,
  ): Promise<{ needsWelcome: boolean; creatorId: string | null; welcomeUsername: string | null }> {
    await refreshUser();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { needsWelcome: false, creatorId: null, welcomeUsername: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('community_entry_creator_id, community_entry_shown_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.community_entry_creator_id && !profile?.community_entry_shown_at) {
      return {
        needsWelcome: true,
        creatorId: profile.community_entry_creator_id,
        welcomeUsername: null,
      };
    }

    const status = await this.getWelcomeStatus();
    if (!status.needsWelcome) {
      return { needsWelcome: false, creatorId: null, welcomeUsername: null };
    }

    let creatorId = profile?.community_entry_creator_id ?? null;
    const welcomeUsername = status.welcomeUsername ?? (await this.getAttribution()).communityCreatorUsername;

    if (!creatorId && welcomeUsername) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', welcomeUsername.toLowerCase().trim())
        .maybeSingle();
      creatorId = data?.id ?? null;
    }

    await refreshUser();

    return {
      needsWelcome: true,
      creatorId,
      welcomeUsername: welcomeUsername ?? null,
    };
  }

  async getWelcomeStatus(): Promise<CommunityWelcomeStatus> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { needsWelcome: false, welcomeUsername: null };
      }

      const data = await apiFetch<CommunityWelcomeStatus>('/api/user/community-welcome-status', {
        session,
        method: 'GET',
      });

      return {
        needsWelcome: !!data?.needsWelcome,
        welcomeUsername: data?.welcomeUsername ?? null,
      };
    } catch (err) {
      console.error('[CommunityEntryService] getWelcomeStatus error:', err);
      return { needsWelcome: false, welcomeUsername: null };
    }
  }

  async resolveCreatorIdByUsername(username: string): Promise<string | null> {
    const normalized = username.toLowerCase().trim();
    if (!normalized) return null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', normalized)
        .maybeSingle();
      return data?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * After onboarding APIs — persist welcome gate state for App.tsx (sync + AsyncStorage).
   */
  async prepareWelcomeGateAfterOnboarding(
    refreshUser: () => Promise<void>,
    onboardingResult: CompleteOnboardingResult,
    setPendingCommunityWelcome: (id: string | null) => void,
  ): Promise<void> {
    const welcome = await this.resolveWelcomeAfterOnboarding(refreshUser);

    let creatorId = welcome.creatorId;
    const welcomeUsername =
      onboardingResult.welcomeUsername ?? welcome.welcomeUsername ?? null;

    const needsWelcome =
      welcome.needsWelcome || !!onboardingResult.welcomeUsername;

    if (!creatorId && welcomeUsername) {
      creatorId = await this.resolveCreatorIdByUsername(welcomeUsername);
    }

    if (!needsWelcome) {
      setPendingCommunityWelcome(null);
      return;
    }

    if (creatorId) {
      await this.markWelcomePending(creatorId);
      setPendingCommunityWelcome(creatorId);
      return;
    }

    if (welcomeUsername) {
      console.warn(
        '[CommunityEntryService] Welcome pending but creatorId unresolved:',
        welcomeUsername,
      );
    }
  }

  async markWelcomePending(creatorId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.PENDING_WELCOME_CREATOR, creatorId);
    } catch (_) {}
  }

  async getWelcomePendingCreatorId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.PENDING_WELCOME_CREATOR);
    } catch {
      return null;
    }
  }

  async clearWelcomePending(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.PENDING_WELCOME_CREATOR);
    } catch (_) {}
  }

  async setPendingWelcomeNavigation(nav: PostWelcomeNavigation): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.POST_WELCOME_NAV, JSON.stringify(nav));
    } catch (_) {}
  }

  async consumePendingWelcomeNavigation(): Promise<PostWelcomeNavigation | null> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.POST_WELCOME_NAV);
      if (!raw) return null;
      await AsyncStorage.removeItem(KEYS.POST_WELCOME_NAV);
      return JSON.parse(raw) as PostWelcomeNavigation;
    } catch {
      return null;
    }
  }

  async completeEntry(
    action: 'follow' | 'explore',
    creatorId: string,
  ): Promise<{ success: boolean; redirectTo?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false };

      const data = await apiFetch<{ success: boolean; redirectTo?: string }>(
        '/api/user/community-entry/complete',
        {
          session,
          method: 'POST',
          body: JSON.stringify({ action, creatorId }),
        },
      );

      if (data?.success) {
        await this.clearAttribution();
      }

      return { success: !!data?.success, redirectTo: data?.redirectTo };
    } catch (err) {
      console.error('[CommunityEntryService] completeEntry error:', err);
      return { success: false };
    }
  }
}

export const communityEntryService = new CommunityEntryService();
