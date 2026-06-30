import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const PROMPT_SUPPRESSION_PREFIX = 'community_join_prompt_shown_';
const PROMPT_SUPPRESSION_DAYS = 7;

export interface CommunityMembership {
  id: string;
  user_id: string;
  creator_id: string;
  joined_at: string;
  join_source: 'manual' | 'post_tip_prompt';
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    genre?: string;
  };
}

class CommunityService {
  async isMember(creatorId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const { data, error } = await supabase
        .from('community_memberships')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('creator_id', creatorId)
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async join(creatorId: string, source: 'manual' | 'post_tip_prompt'): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const { error } = await supabase
        .from('community_memberships')
        .insert({
          user_id: session.user.id,
          creator_id: creatorId,
          joined_at: new Date().toISOString(),
          join_source: source,
        });
      return !error;
    } catch {
      return false;
    }
  }

  async leave(creatorId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const { error } = await supabase
        .from('community_memberships')
        .delete()
        .eq('user_id', session.user.id)
        .eq('creator_id', creatorId);
      return !error;
    } catch {
      return false;
    }
  }

  async getMyMemberships(): Promise<CommunityMembership[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('community_memberships')
        .select(`
          id,
          user_id,
          creator_id,
          joined_at,
          join_source,
          creator:profiles!community_memberships_creator_id_fkey(
            id, username, display_name, avatar_url, genre
          )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false });
      if (error) return [];
      return (data || []) as unknown as CommunityMembership[];
    } catch {
      return [];
    }
  }

  async getMemberCount(creatorId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('community_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId);
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async getMemberPreviews(creatorId: string, excludeUserId?: string, limit = 5): Promise<{ id: string; avatar_url?: string; display_name?: string }[]> {
    try {
      let query = supabase
        .from('community_memberships')
        .select('user_id')
        .eq('creator_id', creatorId)
        .limit(limit + (excludeUserId ? 1 : 0));

      const { data: memberships, error } = await query;
      if (error || !memberships?.length) return [];

      const ids = memberships
        .map((m) => m.user_id)
        .filter((id) => id !== excludeUserId)
        .slice(0, limit);

      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, display_name')
        .in('id', ids);

      return (profiles || []).map((p) => ({
        id: p.id,
        avatar_url: p.avatar_url,
        display_name: p.display_name,
      }));
    } catch {
      return [];
    }
  }

  // Post-tip join prompt suppression (per creator, 7-day cooldown)
  async shouldShowJoinPrompt(creatorId: string): Promise<boolean> {
    try {
      const key = `${PROMPT_SUPPRESSION_PREFIX}${creatorId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return true;
      const shownAt = parseInt(stored, 10);
      const daysSince = (Date.now() - shownAt) / (1000 * 60 * 60 * 24);
      return daysSince >= PROMPT_SUPPRESSION_DAYS;
    } catch {
      return true;
    }
  }

  async suppressJoinPrompt(creatorId: string): Promise<void> {
    try {
      const key = `${PROMPT_SUPPRESSION_PREFIX}${creatorId}`;
      await AsyncStorage.setItem(key, String(Date.now()));
    } catch {
      // silent
    }
  }
}

export const communityService = new CommunityService();
