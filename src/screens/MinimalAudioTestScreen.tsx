/**
 * Isolated background-audio test — no BackgroundAudioService, no AudioPlayerContext,
 * no play tracking, no analytics, no expo-av. TrackPlayer only.
 *
 * Note: index.js still registers the global headless playback service; this screen
 * does not bypass that. It isolates the React app layer from playback.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, AppState, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';

// Dynamic require — react-native-track-player calls new NativeEventEmitter(TrackPlayerModule)
// at module-init time, which crashes Expo Go (no native module). Guard it so the static
// import chain from App.tsx doesn't blow up before AppRegistry.registerComponent runs.
const hasTrackPlayer = !!NativeModules.TrackPlayerModule;
let TrackPlayer: any = null;
let Capability: any = {};
let Event: any = {};
let RepeatMode: any = {};
let State: any = {};
if (hasTrackPlayer) {
  const TP = require('react-native-track-player');
  TrackPlayer = TP.default;
  ({ Capability, Event, RepeatMode, State } = TP);
}

// Public test file — remote URL (not local cache). If this stops at ~60s in background
// while a bare RNTP loop does not, the bug is in app-layer session/queue handling.
const TEST_TRACK_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export default function MinimalAudioTestScreen() {
  const navigation = useNavigation();
  const [playerState, setPlayerState] = useState<string>('init');
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastEvent, setLastEvent] = useState('');
  const startedAtRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const appSub = AppState.addEventListener('change', setAppState);
    return () => appSub.remove();
  }, []);

  useEffect(() => {
    if (!hasTrackPlayer) return;

    let stateSub: { remove: () => void } | undefined;
    let errSub: { remove: () => void } | undefined;

    (async () => {
      try {
        await TrackPlayer.setupPlayer({
          maxCacheSize: 1024 * 50,
          autoHandleInterruptions: true,
          waitForBuffer: true,
        });
        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play, Capability.Pause],
          compactCapabilities: [Capability.Play, Capability.Pause],
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: 'minimal-bg-test',
          url: TEST_TRACK_URL,
          title: 'Minimal BG Test',
          artist: 'SoundBridge Test',
        });

        stateSub = TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
          const label = State[state] ?? String(state);
          setPlayerState(label);
          setLastEvent(`state:${label} @ ${new Date().toLocaleTimeString()}`);
          if (state === State.Playing && !startedAtRef.current) {
            startedAtRef.current = Date.now();
          }
        });
        errSub = TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
          setLastEvent(`error:${JSON.stringify(e)}`);
        });

        readyRef.current = true;
        await TrackPlayer.play();
      } catch (e) {
        setPlayerState('error');
        setLastEvent(String(e));
      }
    })();

    return () => {
      stateSub?.remove();
      errSub?.remove();
    };
  }, []);

  if (!hasTrackPlayer) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0a2e' }}>
        <BackButton />
        <Text style={{ color: '#fff', textAlign: 'center', padding: 24, fontSize: 15 }}>
          TrackPlayer not available in Expo Go.{'\n'}Use a development build to test background audio.
        </Text>
      </SafeAreaView>
    );
  }

  const elapsed =
    startedAtRef.current && playerState === 'Playing'
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Minimal BG Audio Test</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Platform</Text>
        <Text style={styles.value}>{Platform.OS}</Text>

        <Text style={styles.label}>App state</Text>
        <Text style={styles.value}>{appState}</Text>

        <Text style={styles.label}>Player state</Text>
        <Text style={styles.value}>{playerState}</Text>

        <Text style={styles.label}>Elapsed (while playing)</Text>
        <Text style={styles.value}>{elapsed}s</Text>

        <Text style={styles.label}>Last event</Text>
        <Text style={styles.valueSmall}>{lastEvent}</Text>

        <Text style={styles.hint}>
          Press Home or lock screen after music starts. Leave 2+ minutes. If audio stops
          here too, the cause is likely RNTP / iOS session / global headless — not Discover
          or BackgroundAudioService.
        </Text>

        <Pressable
          style={styles.btn}
          onPress={async () => {
            if (!readyRef.current) return;
            await TrackPlayer.play();
            startedAtRef.current = Date.now();
          }}
        >
          <Text style={styles.btnText}>Play</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => TrackPlayer.pause()}
        >
          <Text style={styles.btnText}>Pause</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  body: { padding: 20, gap: 8 },
  label: { color: '#a78bfa', fontSize: 12, marginTop: 12 },
  value: { color: '#fff', fontSize: 20, fontWeight: '700' },
  valueSmall: { color: '#ccc', fontSize: 13 },
  hint: { color: '#888', fontSize: 13, marginTop: 24, lineHeight: 20 },
  btn: {
    marginTop: 16,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: '600' },
});
