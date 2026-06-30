import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Milestone days from expiry: show modal on day 0, 3, 7, 14 then stop
const MILESTONES = [0, 3, 7, 14];
const STORAGE_KEY = 'ea_conv_state_v1';

interface ModalState {
  dismissedForever: boolean;
  reminderCount: number;   // 0 = never shown; increments on "Remind me later"
  lastShownAt: number | null;
}

const DEFAULT_STATE: ModalState = {
  dismissedForever: false,
  reminderCount: 0,
  lastShownAt: null,
};

interface UseEarlyAdopterConversionResult {
  shouldShow: boolean;
  copyVariant: 'standard' | 'final'; // 'final' on day 14
  onRemindLater: () => Promise<void>;
  onDismissPermanently: () => Promise<void>;
  onConverted: () => Promise<void>;
}

/**
 * Determines whether to show the Early Adopter conversion modal.
 * Manages the day 0 → 3 → 7 → 14 reminder cadence via AsyncStorage.
 * Also checks early_adopter_conversion.converted_to_paid from the DB
 * so the modal stays hidden if the user paid on another device.
 */
export function useEarlyAdopterConversion(
  isExpiredEarlyAdopter: boolean,
  subscriptionPeriodEnd: string | null | undefined,
  userId: string | null | undefined,
): UseEarlyAdopterConversionResult {
  const [shouldShow, setShouldShow] = useState(false);
  const [copyVariant, setCopyVariant] = useState<'standard' | 'final'>('standard');
  const [state, setState] = useState<ModalState>(DEFAULT_STATE);

  useEffect(() => {
    if (!isExpiredEarlyAdopter || !subscriptionPeriodEnd) {
      setShouldShow(false);
      return;
    }
    evaluate();
  }, [isExpiredEarlyAdopter, subscriptionPeriodEnd, userId]);

  const loadState = async (): Promise<ModalState> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { ...DEFAULT_STATE };
    } catch {
      return { ...DEFAULT_STATE };
    }
  };

  const saveState = async (next: ModalState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
    } catch {}
  };

  const evaluate = async () => {
    if (!subscriptionPeriodEnd) return;

    // Check DB: if user already converted to paid on another device, skip forever
    if (userId) {
      try {
        const { data } = await supabase
          .from('early_adopter_conversion')
          .select('converted_to_paid')
          .eq('user_id', userId)
          .maybeSingle();
        if (data?.converted_to_paid === true) {
          setShouldShow(false);
          return;
        }
      } catch {
        // DB unavailable — fall through to AsyncStorage-based cadence
      }
    }

    const s = await loadState();
    setState(s);

    if (s.dismissedForever) {
      setShouldShow(false);
      return;
    }

    const expiryMs = new Date(subscriptionPeriodEnd).getTime();
    const daysSinceExpiry = (Date.now() - expiryMs) / (1000 * 60 * 60 * 24);

    // Stop all modals after day 15 (1-day buffer past the last milestone)
    if (daysSinceExpiry > 15) {
      setShouldShow(false);
      return;
    }

    // Which milestone are we targeting?
    const nextMilestoneDay = MILESTONES[s.reminderCount];
    if (nextMilestoneDay === undefined) {
      setShouldShow(false);
      return;
    }

    // Has enough time passed since expiry to hit this milestone?
    if (daysSinceExpiry < nextMilestoneDay) {
      setShouldShow(false);
      return;
    }

    // Throttle: don't re-show within 20 hours of last show (prevents double-trigger on same day)
    if (s.lastShownAt) {
      const hoursSinceLast = (Date.now() - s.lastShownAt) / (1000 * 60 * 60);
      if (hoursSinceLast < 20) {
        setShouldShow(false);
        return;
      }
    }

    // Day 14 uses the final copy variant
    setCopyVariant(daysSinceExpiry >= 14 ? 'final' : 'standard');
    setShouldShow(true);
  };

  const onRemindLater = useCallback(async () => {
    const s = await loadState();
    const next: ModalState = {
      ...s,
      reminderCount: s.reminderCount + 1,
      lastShownAt: Date.now(),
    };
    await saveState(next);
    setShouldShow(false);
  }, []);

  const onDismissPermanently = useCallback(async () => {
    const s = await loadState();
    const next: ModalState = {
      dismissedForever: true,
      reminderCount: s.reminderCount,
      lastShownAt: Date.now(),
    };
    await saveState(next);
    setShouldShow(false);
  }, []);

  // Call when user successfully navigates to upgrade / converts to paid
  const onConverted = useCallback(async () => {
    const s = await loadState();
    const next: ModalState = {
      dismissedForever: true,
      reminderCount: s.reminderCount,
      lastShownAt: Date.now(),
    };
    await saveState(next);
    setShouldShow(false);
  }, []);

  return { shouldShow, copyVariant, onRemindLater, onDismissPermanently, onConverted };
}
