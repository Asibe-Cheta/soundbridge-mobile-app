import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { liveInterestService } from '../services/liveInterestService';
import { notificationService } from '../services/NotificationService';
import { supabase } from '../lib/supabase';

type AvailabilityOption = 'weekends' | 'weekday_evenings' | 'any_time' | 'not_sure';

interface LiveInterestPromptProps {
  trackId: string;
  creatorId: string;
  userId: string;
}

export interface LiveInterestPromptHandle {
  show: () => void;
}

const AVAILABILITY_OPTIONS: { key: AvailabilityOption; label: string }[] = [
  { key: 'weekends', label: 'Weekends' },
  { key: 'weekday_evenings', label: 'Weekday evenings' },
  { key: 'any_time', label: 'Any time' },
  { key: 'not_sure', label: 'Not sure' },
];

const LiveInterestPrompt = forwardRef<LiveInterestPromptHandle, LiveInterestPromptProps>(
  ({ trackId, creatorId, userId }, ref) => {
    const { theme } = useTheme();

    const [visible, setVisible] = useState(false);
    const [phase, setPhase] = useState<'primary' | 'secondary' | 'confirmation'>('primary');
    const [confirmationText, setConfirmationText] = useState('');

    const slideAnim = useRef(new Animated.Value(-120)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAutoDismiss = () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
    };

    const resetAnim = () => {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
    };

    const slideIn = (onDone?: () => void) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(onDone);
    };

    const slideOut = (onDone?: () => void) => {
      clearAutoDismiss();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        onDone?.();
      });
    };

    const scheduleAutoDismiss = (ms: number, onExpire: () => void) => {
      clearAutoDismiss();
      autoDismissTimer.current = setTimeout(onExpire, ms);
    };

    useImperativeHandle(ref, () => ({
      show: () => {
        resetAnim();
        setPhase('primary');
        setVisible(true);
        slideIn();
        scheduleAutoDismiss(10000, () => {
          liveInterestService.recordResponse({ trackId, userId, creatorId, response: 'auto_dismissed' });
          slideOut();
        });
      },
    }));

    useEffect(() => () => clearAutoDismiss(), []);

    const handleMaybeLater = () => {
      liveInterestService.recordResponse({ trackId, userId, creatorId, response: 'maybe_later' });
      slideOut();
    };

    const handleYes = async () => {
      clearAutoDismiss();

      let profileCity: string | null = null;
      let profileCountry: string | null = null;
      let profileLocation: string | null = null;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city, country, location')
          .eq('id', userId)
          .maybeSingle();
        if (profile) {
          profileCity = profile.city ?? null;
          profileCountry = profile.country ?? null;
          profileLocation = profile.location ?? null;
        }
      } catch { /* non-blocking */ }

      let currentLat: number | null = null;
      let currentLng: number | null = null;
      let currentCity: string | null = null;
      let currentCountry: string | null = null;

      try {
        // Only use already-cached location — never request new permissions
        const cached = (notificationService as any).userLocation;
        if (cached?.coordinates) {
          currentLat = cached.coordinates.latitude;
          currentLng = cached.coordinates.longitude;
          currentCity = cached.state ?? null;
          currentCountry = cached.country ?? null;
        }
      } catch { /* non-blocking */ }

      liveInterestService.recordResponse({
        trackId,
        userId,
        creatorId,
        response: 'yes',
        profileLocation,
        profileCity,
        profileCountry,
        currentLocationLat: currentLat,
        currentLocationLng: currentLng,
        currentCity,
        currentCountry,
      });

      // Slide out, then after 1s show secondary question
      slideOut(() => {
        setTimeout(() => {
          resetAnim();
          setPhase('secondary');
          setVisible(true);
          slideIn();
          scheduleAutoDismiss(8000, () => slideOut());
        }, 1000);
      });
    };

    const handleAvailabilitySelect = (key: AvailabilityOption) => {
      clearAutoDismiss();
      liveInterestService.recordResponse({
        trackId,
        userId,
        creatorId,
        response: 'yes',
        availability: key,
      });
      slideOut(() => {
        setConfirmationText('Got it 🙌🏾');
        resetAnim();
        setPhase('confirmation');
        setVisible(true);
        slideIn();
        setTimeout(() => slideOut(), 1500);
      });
    };

    if (!visible) return null;

    const glass = (
      children: React.ReactNode
    ) =>
      Platform.OS === 'ios' ? (
        <ExpoBlurView
          intensity={50}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[
            styles.card,
            { borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)', 'transparent']}
            style={styles.glassSheen}
          />
          {children}
        </ExpoBlurView>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark
                ? 'rgba(20,12,40,0.95)'
                : 'rgba(248,244,255,0.97)',
              borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {children}
        </View>
      );

    return (
      <Animated.View
        style={[
          styles.wrapper,
          { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        ]}
        pointerEvents="box-none"
      >
        {glass(
          <>
            {phase === 'primary' && (
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="musical-note" size={18} color={theme.colors.primary} />
                </View>
                <Text style={[styles.promptText, { color: theme.colors.text }]} numberOfLines={2}>
                  Would you like to hear this live?
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleYes}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnTextLight}>Yes 🎵</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnGhost, { borderColor: theme.colors.border }]}
                    onPress={handleMaybeLater}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>
                      Maybe later
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {phase === 'secondary' && (
              <View style={styles.secondaryWrap}>
                <Text
                  style={[styles.promptText, { color: theme.colors.text, marginBottom: 10 }]}
                >
                  When are you most likely to attend?
                </Text>
                <View style={styles.pillRow}>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.pill, { borderColor: theme.colors.primary + '60' }]}
                      onPress={() => handleAvailabilitySelect(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, { color: theme.colors.text }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {phase === 'confirmation' && (
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text
                  style={[styles.promptText, { color: theme.colors.text, marginLeft: 8, flex: 0 }]}
                >
                  {confirmationText}
                </Text>
              </View>
            )}
          </>
        )}
      </Animated.View>
    );
  }
);

export default LiveInterestPrompt;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 72,
    left: 16,
    right: 16,
    zIndex: 200,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    minWidth: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnTextLight: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  secondaryWrap: {
    paddingVertical: 2,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
