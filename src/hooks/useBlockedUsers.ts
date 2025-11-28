import { useState, useEffect, useCallback } from 'react';
import { blockService } from '../services/api/blockService';
import { useAuth } from '../contexts/AuthContext';
import type { BlockedUser } from '../types/block.types';

export const useBlockedUsers = () => {
  const { user, session } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    if (!user || !session) {
      setBlockedUserIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const response = await blockService.getBlockedUsers('blocked', session);
      const ids = new Set(response.data.map((item) => item.blocked.id));
      setBlockedUserIds(ids);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      // On error, keep existing blocked users list
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const addBlockedUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => new Set(prev).add(userId));
  }, []);

  const removeBlockedUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  const isBlocked = useCallback(
    (userId: string) => {
      return blockedUserIds.has(userId);
    },
    [blockedUserIds]
  );

  return {
    blockedUserIds,
    isBlocked,
    addBlockedUser,
    removeBlockedUser,
    refreshBlockedUsers: loadBlockedUsers,
    loading,
  };
};

