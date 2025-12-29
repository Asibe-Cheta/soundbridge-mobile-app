import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TriggerType =
  | 'after_first_audio_upload'
  | 'third_connect_screen_visit'
  | 'viewed_service_provider_profile'
  | null;

interface ServiceProviderPromptPreferences {
  dismissedServiceProviderPrompt?: boolean;
  serviceProviderPromptLastShown?: string;
  serviceProviderPromptTrigger?: TriggerType;
  connectScreenVisits?: number;
}

const REMIND_LATER_DAYS = 7;
const MIN_DAYS_SINCE_SIGNUP = 1;
const SESSION_KEY = 'serviceProviderPromptShownThisSession';

export const useServiceProviderPrompt = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<TriggerType>(null);
  const { user, userProfile } = useAuth();
  const navigation = useNavigation();
  const hasCheckedSession = useRef(false);

  // Check if user is already a service provider
  const checkIsServiceProvider = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('service_provider_profiles')
        .select('user_id, status')
        .eq('user_id', user.id)
        .single();

      return !!data && !error;
    } catch {
      return false;
    }
  }, [user?.id]);

  // Get user preferences
  const getPreferences = useCallback(async (): Promise<ServiceProviderPromptPreferences> => {
    if (!user?.id) return {};

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error || !data) return {};

      // Get preferences from AsyncStorage (client-side storage)
      const prefsString = await AsyncStorage.getItem(`sp_prompt_prefs_${user.id}`);
      if (prefsString) {
        return JSON.parse(prefsString);
      }

      return {};
    } catch {
      return {};
    }
  }, [user?.id]);

  // Save user preferences
  const savePreferences = useCallback(async (prefs: ServiceProviderPromptPreferences) => {
    if (!user?.id) return;

    try {
      await AsyncStorage.setItem(
        `sp_prompt_prefs_${user.id}`,
        JSON.stringify(prefs)
      );
    } catch (error) {
      console.error('Failed to save service provider prompt preferences:', error);
    }
  }, [user?.id]);

  // Check if enough time has passed since signup
  const checkDaysSinceSignup = useCallback((): boolean => {
    if (!userProfile?.created_at) return false;

    const createdAt = new Date(userProfile.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff >= MIN_DAYS_SINCE_SIGNUP;
  }, [userProfile?.created_at]);

  // Check if enough time has passed since last shown
  const checkCooldownPeriod = useCallback((lastShown?: string): boolean => {
    if (!lastShown) return true;

    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff >= REMIND_LATER_DAYS;
  }, []);

  // Check if prompt should be shown
  const shouldShowPrompt = useCallback(async (): Promise<boolean> => {
    // Check if already shown this session
    const shownThisSession = await AsyncStorage.getItem(SESSION_KEY);
    if (shownThisSession === 'true') return false;

    // Check if user is already a service provider
    const isServiceProvider = await checkIsServiceProvider();
    if (isServiceProvider) return false;

    // Check days since signup
    if (!checkDaysSinceSignup()) return false;

    // Get user preferences
    const prefs = await getPreferences();

    // Check if permanently dismissed
    if (prefs.dismissedServiceProviderPrompt === true) return false;

    // Check cooldown period
    if (!checkCooldownPeriod(prefs.serviceProviderPromptLastShown)) return false;

    return true;
  }, [checkIsServiceProvider, checkDaysSinceSignup, checkCooldownPeriod, getPreferences]);

  // Show the prompt
  const showPrompt = useCallback(async (trigger: TriggerType) => {
    const canShow = await shouldShowPrompt();

    if (canShow) {
      setCurrentTrigger(trigger);
      setShouldShow(true);

      // Mark as shown this session
      await AsyncStorage.setItem(SESSION_KEY, 'true');

      // Track analytics
      // TODO: Add analytics tracking here
      console.log('Service provider prompt shown:', trigger);
    }
  }, [shouldShowPrompt]);

  // Handle "Setup Profile" action
  const handleSetupProfile = useCallback(async () => {
    setShouldShow(false);

    // Save preference to not show again (they're setting up)
    const prefs = await getPreferences();
    await savePreferences({
      ...prefs,
      dismissedServiceProviderPrompt: true,
      serviceProviderPromptLastShown: new Date().toISOString(),
      serviceProviderPromptTrigger: currentTrigger,
    });

    // Track analytics
    console.log('Service provider prompt accepted:', currentTrigger);

    // Navigate to service provider onboarding
    setTimeout(() => {
      (navigation as any).navigate('ServiceProviderOnboarding');
    }, 300);
  }, [currentTrigger, getPreferences, savePreferences, navigation]);

  // Handle "Remind Me Later" action
  const handleRemindLater = useCallback(async () => {
    setShouldShow(false);

    // Save preference with last shown date (will show again after cooldown)
    const prefs = await getPreferences();
    await savePreferences({
      ...prefs,
      serviceProviderPromptLastShown: new Date().toISOString(),
      serviceProviderPromptTrigger: currentTrigger,
    });

    // Track analytics
    console.log('Service provider prompt remind later:', currentTrigger);
  }, [currentTrigger, getPreferences, savePreferences]);

  // Handle "Don't Show Again" action
  const handleDontShowAgain = useCallback(async () => {
    setShouldShow(false);

    // Save preference to permanently dismiss
    const prefs = await getPreferences();
    await savePreferences({
      ...prefs,
      dismissedServiceProviderPrompt: true,
      serviceProviderPromptLastShown: new Date().toISOString(),
      serviceProviderPromptTrigger: currentTrigger,
    });

    // Track analytics
    console.log('Service provider prompt dismissed permanently:', currentTrigger);
  }, [currentTrigger, getPreferences, savePreferences]);

  // Increment Connect screen visits
  const incrementConnectVisits = useCallback(async (): Promise<number> => {
    const prefs = await getPreferences();
    const visits = (prefs.connectScreenVisits || 0) + 1;

    await savePreferences({
      ...prefs,
      connectScreenVisits: visits,
    });

    return visits;
  }, [getPreferences, savePreferences]);

  // Check and trigger on Connect screen visit
  const checkConnectScreenTrigger = useCallback(async () => {
    const visits = await incrementConnectVisits();

    if (visits === 3) {
      await showPrompt('third_connect_screen_visit');
    }
  }, [incrementConnectVisits, showPrompt]);

  // Trigger after first upload
  const triggerAfterFirstUpload = useCallback(async () => {
    await showPrompt('after_first_audio_upload');
  }, [showPrompt]);

  // Trigger after viewing service provider profile
  const triggerAfterViewingServiceProvider = useCallback(async () => {
    await showPrompt('viewed_service_provider_profile');
  }, [showPrompt]);

  // Clear session flag on mount
  useEffect(() => {
    if (!hasCheckedSession.current) {
      AsyncStorage.removeItem(SESSION_KEY);
      hasCheckedSession.current = true;
    }
  }, []);

  return {
    shouldShow,
    currentTrigger,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
    triggerAfterFirstUpload,
    checkConnectScreenTrigger,
    triggerAfterViewingServiceProvider,
  };
};
