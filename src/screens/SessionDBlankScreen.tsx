/**
 * Session D — blank screen with MainTabs fully unmounted (navigation reset).
 * User stays logged in; playback uses production BackgroundAudioService.
 * Tests whether the mounted tab/feed screen tree causes ~47s background audio death.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { markSessionDActive } from '../lib/sessionDTrace';
import { audioLog } from '../lib/audioDebugLog';
import { getAudioAuthLogFields } from '../lib/audioAuthTrace';
import {
  getBgIsolationLogFields,
  isBgIsolationEnabled,
  loadBgIsolationFlags,
} from '../config/bgAudioIsolationFlags';
import { backgroundAudioService } from '../services/BackgroundAudioService';

const TEST_DURATION_SEC = 90;

export default function SessionDBlankScreen() {
  const navigation = useNavigation<any>();
  const [appState, setAppState] = useState(AppState.currentState);
  const [testStartedAt, setTestStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [authListenerOff, setAuthListenerOff] = useState(false);
  const logged60Ref = useRef(false);
  const logged90Ref = useRef(false);

  useEffect(() => {
    loadBgIsolationFlags().then(() => {
      setAuthListenerOff(isBgIsolationEnabled('disableAuthListener'));
    });
  }, []);

  useEffect(() => {
    markSessionDActive(true);
    const track = backgroundAudioService.getCurrentTrack();
    audioLog('SESSION_D_MOUNT', {
      mainTabsMounted: false,
      trackTitle: track?.title ?? null,
      isPlaying: backgroundAudioService.getIsPlaying(),
      pos: backgroundAudioService.getPosition(),
      ...getAudioAuthLogFields(),
      ...getBgIsolationLogFields(),
    });

    return () => {
      markSessionDActive(false);
      audioLog('SESSION_D_UNMOUNT', {});
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (!testStartedAt) return;

      const elapsedSec = Math.floor((Date.now() - testStartedAt) / 1000);
      const isPlaying = backgroundAudioService.getIsPlaying();

      if (next === 'background') {
        audioLog('BG_ISO_TEST_BACKGROUNDED', {
          elapsedSec,
          isPlaying,
          ...getBgIsolationLogFields(),
          ...getAudioAuthLogFields(),
        });
      }

      if (next === 'active') {
        audioLog('BG_ISO_TEST_FOREGROUND', {
          elapsedSec,
          isPlaying,
          survived60: elapsedSec >= 60 && isPlaying,
          survived90: elapsedSec >= 90 && isPlaying,
          ...getBgIsolationLogFields(),
          ...getAudioAuthLogFields(),
        });
      }
    });
    return () => sub.remove();
  }, [testStartedAt]);

  useEffect(() => {
    if (!testStartedAt) return;

    const id = setInterval(() => {
      setTick((t) => t + 1);
      const elapsedSec = Math.floor((Date.now() - testStartedAt) / 1000);
      const isPlaying = backgroundAudioService.getIsPlaying();

      if (elapsedSec >= 60 && !logged60Ref.current) {
        logged60Ref.current = true;
        audioLog('BG_ISO_TEST_60S_MARK', {
          elapsedSec,
          isPlaying,
          appState: AppState.currentState,
          survived60: isPlaying,
          ...getBgIsolationLogFields(),
          ...getAudioAuthLogFields(),
        });
      }

      if (elapsedSec >= TEST_DURATION_SEC && !logged90Ref.current) {
        logged90Ref.current = true;
        audioLog('BG_ISO_TEST_90S_COMPLETE', {
          elapsedSec,
          isPlaying,
          survived90: isPlaying,
          ...getBgIsolationLogFields(),
          ...getAudioAuthLogFields(),
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [testStartedAt]);

  const elapsedSec = testStartedAt
    ? Math.min(TEST_DURATION_SEC, Math.floor((Date.now() - testStartedAt) / 1000))
    : 0;
  const testRunning = testStartedAt !== null;
  const testComplete = testRunning && elapsedSec >= TEST_DURATION_SEC;
  const isPlaying = backgroundAudioService.getIsPlaying();
  void tick;

  const startTest = () => {
    logged60Ref.current = false;
    logged90Ref.current = false;
    const now = Date.now();
    setTestStartedAt(now);
    audioLog('BG_ISO_TEST_STARTED', {
      durationSec: TEST_DURATION_SEC,
      isPlaying: backgroundAudioService.getIsPlaying(),
      trackTitle: backgroundAudioService.getCurrentTrack()?.title ?? null,
      ...getBgIsolationLogFields(),
      ...getAudioAuthLogFields(),
    });
  };

  const exitToMainTabs = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Session D</Text>
        <Text style={styles.label}>Blank tree test</Text>

        {authListenerOff && (
          <View style={styles.flagBanner}>
            <Text style={styles.flagBannerText}>Auth listener OFF — isolation active</Text>
          </View>
        )}

        <Text style={styles.body}>
          MainTabs is unmounted. You are still logged in. Production player only — start
          music from Discover before entering here.
        </Text>

        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>Background test timer</Text>
          <Text style={styles.timerValue}>
            {testRunning ? `${elapsedSec} / ${TEST_DURATION_SEC}s` : '— / 90s'}
          </Text>
          <Text style={styles.timerSub}>
            App state: {appState} · Playing: {isPlaying ? 'yes' : 'no'}
          </Text>
          {testComplete && (
            <Text style={[styles.timerSub, isPlaying ? styles.pass : styles.fail]}>
              90s complete — audio {isPlaying ? 'SURVIVED' : 'STOPPED'}
            </Text>
          )}
          {!testRunning && (
            <Text style={styles.timerHint}>
              Tap Start, then immediately press Home and lock the screen. Do not touch the
              device until 90s elapses.
            </Text>
          )}
          <Pressable
            style={[styles.button, styles.startButton, testRunning && styles.buttonDisabled]}
            onPress={startTest}
            disabled={testRunning}
          >
            <Text style={styles.buttonText}>
              {testRunning ? 'Test running…' : 'Start 90s test'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Logs tag sessionD:true and BG_ISO_TEST_* on audio debug log. Check 60s mark in logs
          after returning from background.
        </Text>
        <Pressable style={styles.button} onPress={exitToMainTabs}>
          <Text style={styles.buttonText}>End test → return to MainTabs</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  flagBanner: {
    backgroundColor: '#422006',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  flagBannerText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: '#a3a3a3',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  timerBox: {
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    padding: 16,
    marginBottom: 16,
  },
  timerLabel: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timerValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  timerSub: {
    color: '#a3a3a3',
    fontSize: 14,
    marginBottom: 6,
  },
  timerHint: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  pass: {
    color: '#4ade80',
    fontWeight: '700',
  },
  fail: {
    color: '#f87171',
    fontWeight: '700',
  },
  hint: {
    color: '#525252',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#404040',
  },
  startButton: {
    backgroundColor: '#1d4ed8',
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
