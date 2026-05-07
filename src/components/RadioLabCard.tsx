import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const STREAM_URL = 'http://radio.canstream.co.uk:8043/live.mp3';
const METADATA_URL = 'https://radio.canstream.co.uk:9043/status-json.xsl';
export const RADIO_LAB_TRACK_ID = 'radio-lab-live';

const BAR_COUNT = 22;
const MAX_BAR_H = 32;
const MIN_BAR_H = 3;

const BAR_CONFIGS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const s1 = (i * 127 + 31) % 97;
  const s2 = (i * 61 + 17) % 83;
  const s3 = (i * 43 + 7) % 71;
  const s4 = (i * 89 + 53) % 59;
  return {
    highH: MIN_BAR_H + (s1 / 97) * (MAX_BAR_H - MIN_BAR_H),
    lowH: MIN_BAR_H + (s2 / 83) * 6,
    duration: 380 + (s3 / 71) * 820,
    delay: (s4 / 59) * 900,
  };
});

export default function RadioLabCard() {
  const { play, pause, currentTrack, isPlaying, updateCurrentTrack } = useAudioPlayer();
  const [nowPlaying, setNowPlaying] = useState('');
  const [listeners, setListeners] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const prevNowPlayingRef = useRef('');

  const isThisPlaying = currentTrack?.id === RADIO_LAB_TRACK_ID && isPlaying;
  const isThisActive = currentTrack?.id === RADIO_LAB_TRACK_ID;

  const barAnims = useRef(
    BAR_CONFIGS.map(c => new Animated.Value(c.lowH))
  ).current;
  const dotScale = useRef(new Animated.Value(1)).current;

  // Poll metadata every 30s
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(METADATA_URL);
        const json = await res.json();
        const src = json?.icestats?.source;
        if (src) {
          setNowPlaying(typeof src.title === 'string' ? src.title : '');
          setListeners(typeof src.listeners === 'number' ? src.listeners : 0);
        }
      } catch {}
    };
    fetchMeta();
    const timerId = setInterval(fetchMeta, 30_000);
    return () => clearInterval(timerId);
  }, []);

  // Update MiniPlayer title when now-playing changes (no stream restart)
  useEffect(() => {
    if (isThisActive && nowPlaying && nowPlaying !== prevNowPlayingRef.current) {
      prevNowPlayingRef.current = nowPlaying;
      updateCurrentTrack({ title: nowPlaying });
    }
  }, [nowPlaying, isThisActive]);

  // Waveform — always animating (the station is always live)
  useEffect(() => {
    const loops = BAR_CONFIGS.map((c, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(c.delay),
          Animated.timing(barAnims[i], { toValue: c.highH, duration: c.duration, useNativeDriver: false }),
          Animated.timing(barAnims[i], { toValue: c.lowH, duration: c.duration, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  // Live dot pulse
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.65, duration: 700, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const handleTuneIn = async () => {
    if (isThisPlaying) {
      await pause();
      return;
    }
    setIsStarting(true);
    try {
      await play({
        id: RADIO_LAB_TRACK_ID,
        title: nowPlaying || '97.1 FM — On Air',
        audio_url: STREAM_URL,
        created_at: new Date().toISOString(),
        // Empty id disables the tip button and creator-profile navigation in MiniPlayer
        creator: {
          id: '',
          username: 'radiolab',
          display_name: 'Radio LaB',
          avatar_url: undefined,
        },
      });
    } finally {
      setIsStarting(false);
    }
  };

  const buttonLabel = isStarting
    ? 'Connecting…'
    : isThisPlaying
    ? 'Pause'
    : isThisActive
    ? 'Tune Back In'
    : 'Tune In';

  const buttonIcon = isStarting
    ? 'hourglass-outline'
    : isThisPlaying
    ? 'pause'
    : 'radio';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1C0505', '#7F1D1D', '#991B1B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Waveform background */}
        <View style={styles.waveBg} pointerEvents="none">
          {barAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: anim,
                  opacity: isThisPlaying
                    ? 0.28 + (i % 4) * 0.055
                    : 0.10 + (i % 4) * 0.02,
                  backgroundColor: i % 2 === 0 ? '#FCA5A5' : '#F87171',
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.body}>
          {/* Logo + badges */}
          <View style={styles.topRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/beds-fm.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.liveBadge}>
                <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }] }]} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
              {listeners > 0 && (
                <View style={styles.listenerBadge}>
                  <Ionicons name="headset-outline" size={10} color="rgba(252,165,165,0.9)" />
                  <Text style={styles.listenerLabel}>{listeners.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Station name */}
          <Text style={styles.stationName}>Radio LaB</Text>
          <Text style={styles.tagline}>University of Bedfordshire · 97.1 FM</Text>

          {/* Now playing */}
          {nowPlaying ? (
            <View style={styles.nowPlayingRow}>
              <Ionicons name="musical-note" size={10} color="rgba(252,165,165,0.75)" />
              <Text style={styles.nowPlayingText} numberOfLines={1}>{nowPlaying}</Text>
            </View>
          ) : null}

          {/* Tune-in button */}
          <TouchableOpacity
            style={[styles.tuneBtn, isThisPlaying && styles.tuneBtnActive]}
            onPress={handleTuneIn}
            activeOpacity={0.75}
          >
            <Ionicons name={buttonIcon as any} size={14} color="#FFF" />
            <Text style={styles.tuneBtnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 10,
  },
  gradient: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  waveBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    gap: 3,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
  },
  body: {
    padding: 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logoWrap: {
    width: 72,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logo: {
    width: 62,
    height: 30,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveLabel: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  listenerLabel: {
    color: 'rgba(252,165,165,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  stationName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  tagline: {
    color: 'rgba(252,165,165,0.70)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  nowPlayingText: {
    color: 'rgba(252,165,165,0.82)',
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  tuneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    gap: 7,
  },
  tuneBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.28)',
    borderColor: 'rgba(252,165,165,0.38)',
  },
  tuneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
