import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
// ffmpeg-kit-react-native native binaries (v6.0) are temporarily unavailable.
// Import is guarded so the JS bundle compiles fine; trim operations fail gracefully.
let FFmpegKit: any = null;
let ReturnCode: any = null;
try {
  const _m = require('ffmpeg-kit-react-native');
  FFmpegKit = _m.FFmpegKit;
  ReturnCode = _m.ReturnCode;
} catch {}
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 24;
const WAVEFORM_W = SCREEN_W - H_PAD * 2;
const NUM_BARS = 60;
const BAR_GAP = 2;
const BAR_W = (WAVEFORM_W - (NUM_BARS - 1) * BAR_GAP) / NUM_BARS;
const BAR_MAX_H = 72;
const BAR_MIN_H = 4;
const WAVEFORM_H = 100;
const HANDLE_W = 22;
const MAX_CLIP = 60;

interface AudioTrimmerModalProps {
  visible: boolean;
  audioUri: string;
  fileName: string;
  onConfirm: (trimmedUri: string, durationSeconds: number) => void;
  onCancel: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AudioTrimmerModal({
  visible,
  audioUri,
  fileName,
  onConfirm,
  onCancel,
}: AudioTrimmerModalProps) {
  const { theme } = useTheme();

  const [totalDur, setTotalDur] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [waveLoading, setWaveLoading] = useState(true);
  const [displayStart, setDisplayStart] = useState(0);
  const [displayEnd, setDisplayEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Refs for gesture handlers — avoids stale closures in PanResponder
  const startRef = useRef(0);
  const endRef = useRef(0);
  const durRef = useRef(0);
  const gesStartRef = useRef(0);
  const gesEndRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const setSelection = useCallback((s: number, e: number) => {
    startRef.current = s;
    endRef.current = e;
    setDisplayStart(s);
    setDisplayEnd(e);
  }, []);

  // Load audio and generate waveform when modal opens
  useEffect(() => {
    if (!visible || !audioUri) return;
    let mounted = true;

    (async () => {
      setWaveLoading(true);
      setIsPlaying(false);
      setProcessing(false);

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false }
        );
        if (!mounted) { sound.unloadAsync(); return; }
        soundRef.current = sound;

        const status = await sound.getStatusAsync();
        const dur = status.isLoaded && status.durationMillis
          ? status.durationMillis / 1000
          : 0;
        durRef.current = dur;
        if (mounted) {
          setTotalDur(dur);
          setSelection(0, Math.min(dur, MAX_CLIP));
          await buildWaveform(audioUri, mounted);
        }
      } catch (err) {
        console.error('[AudioTrimmer] load error:', err);
        if (mounted) {
          setBars(Array.from({ length: NUM_BARS }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin(i * 0.35))));
        }
      } finally {
        if (mounted) setWaveLoading(false);
      }
    })();

    return () => {
      mounted = false;
      previewTimer.current && clearInterval(previewTimer.current);
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [visible, audioUri]);

  // Extract PCM at 1 kHz via FFmpeg, downsample to NUM_BARS amplitude values
  const buildWaveform = async (uri: string, mounted: boolean) => {
    if (!FFmpegKit) {
      if (mounted) setBars(Array.from({ length: NUM_BARS }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin(i * 0.35))));
      return;
    }
    const raw = `${FileSystem.cacheDirectory}wf_${Date.now()}.raw`;
    try {
      const sess = await FFmpegKit.execute(`-i "${uri}" -ac 1 -ar 1000 -f s16le -y "${raw}"`);
      if (!mounted) return;
      if (!ReturnCode.isSuccess(await sess.getReturnCode())) {
        throw new Error('FFmpeg waveform extraction failed');
      }

      const b64 = await FileSystem.readAsStringAsync(raw, {
        encoding: FileSystem.EncodingType.Base64,
      });
      FileSystem.deleteAsync(raw, { idempotent: true }).catch(() => {});

      // Decode base64 → Uint8Array → Int16Array
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer);

      const spb = Math.max(1, Math.floor(pcm.length / NUM_BARS));
      const rawBars = Array.from({ length: NUM_BARS }, (_, i) => {
        let peak = 0;
        const off = i * spb;
        for (let j = 0; j < spb && off + j < pcm.length; j++) {
          const s = Math.abs(pcm[off + j]);
          if (s > peak) peak = s;
        }
        return peak / 32768;
      });

      const maxV = Math.max(...rawBars, 0.001);
      if (mounted) setBars(rawBars.map(b => b / maxV));
    } catch {
      FileSystem.deleteAsync(raw, { idempotent: true }).catch(() => {});
      if (mounted) {
        setBars(Array.from({ length: NUM_BARS }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin(i * 0.35))));
      }
    }
  };

  // Left handle — only shown when file is longer than MAX_CLIP
  const leftPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { gesStartRef.current = startRef.current; },
    onPanResponderMove: (_, gs) => {
      const dt = (gs.dx / WAVEFORM_W) * durRef.current;
      const newS = Math.max(0, Math.min(gesStartRef.current + dt, endRef.current - 1));
      const newE = Math.min(newS + MAX_CLIP, durRef.current);
      setSelection(newS, newE);
    },
  }), [setSelection]);

  // Right handle — always shown; reduces clip below MAX_CLIP but never above
  const rightPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { gesEndRef.current = endRef.current; },
    onPanResponderMove: (_, gs) => {
      const dt = (gs.dx / WAVEFORM_W) * durRef.current;
      const maxEnd = Math.min(startRef.current + MAX_CLIP, durRef.current);
      const newE = Math.max(startRef.current + 1, Math.min(gesEndRef.current + dt, maxEnd));
      setSelection(startRef.current, newE);
    },
  }), [setSelection]);

  const handlePreview = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync().catch(() => {});
      previewTimer.current && clearInterval(previewTimer.current);
      setIsPlaying(false);
      return;
    }
    try {
      await soundRef.current.setPositionAsync(Math.round(startRef.current * 1000));
      await soundRef.current.playAsync();
      setIsPlaying(true);
      previewTimer.current = setInterval(async () => {
        const st = await soundRef.current?.getStatusAsync().catch(() => null);
        if (!st?.isLoaded) return;
        if ((st.positionMillis ?? 0) / 1000 >= endRef.current) {
          await soundRef.current?.pauseAsync().catch(() => {});
          clearInterval(previewTimer.current!);
          setIsPlaying(false);
        }
      }, 200);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleConfirm = async () => {
    if (!FFmpegKit) {
      Alert.alert(
        'Trim Unavailable',
        'The audio trimmer requires a new app build. Use "Upload a clip" instead, or wait for the next update.',
      );
      return;
    }
    previewTimer.current && clearInterval(previewTimer.current);
    await soundRef.current?.pauseAsync().catch(() => {});
    setIsPlaying(false);
    setProcessing(true);

    try {
      const clipDur = endRef.current - startRef.current;
      const outPath = `${FileSystem.cacheDirectory}clip_${Date.now()}.m4a`;
      const cmd =
        `-i "${audioUri}" ` +
        `-ss ${startRef.current.toFixed(3)} ` +
        `-t ${clipDur.toFixed(3)} ` +
        `-vn -c:a aac -b:a 128k -y "${outPath}"`;

      const sess = await FFmpegKit.execute(cmd);
      if (!ReturnCode.isSuccess(await sess.getReturnCode())) {
        const logs = await sess.getLogs();
        throw new Error(
          logs[logs.length - 1]?.getMessage?.() ?? 'Trim failed'
        );
      }

      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      onConfirm(outPath, Math.round(clipDur));
    } catch (err: any) {
      setProcessing(false);
      Alert.alert('Trim failed', err.message ?? String(err));
    }
  };

  const handleCancel = async () => {
    previewTimer.current && clearInterval(previewTimer.current);
    await soundRef.current?.stopAsync().catch(() => {});
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);
    onCancel();
  };

  // Layout
  const leftPx = totalDur > 0 ? (displayStart / totalDur) * WAVEFORM_W : 0;
  const rightPx = totalDur > 0 ? (displayEnd / totalDur) * WAVEFORM_W : WAVEFORM_W;
  const showLeftHandle = totalDur > MAX_CLIP;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={processing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerSide}
            >
              <Text style={[styles.cancelTxt, {
                color: processing ? theme.colors.textSecondary : theme.colors.text,
              }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Trim Audio</Text>
            <View style={styles.headerSide} />
          </View>

          {/* File info */}
          <View style={[styles.fileRow, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }]}>
            <View style={styles.fileIconWrap}>
              <Ionicons name="musical-notes" size={22} color="#7c3aed" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={[styles.fileDur, { color: theme.colors.textSecondary }]}>
                {totalDur > 0 ? `Total duration: ${fmt(totalDur)}` : 'Loading…'}
              </Text>
            </View>
          </View>

          {/* Waveform section */}
          <View style={styles.waveSection}>
            <Text style={[styles.waveHint, { color: theme.colors.textSecondary }]}>
              {showLeftHandle
                ? 'Drag handles to select your clip (max 60 s)'
                : 'Drag right handle to trim the clip'}
            </Text>

            {waveLoading ? (
              <View style={styles.waveLoader}>
                <ActivityIndicator size="small" color="#7c3aed" />
                <Text style={[styles.waveLoaderTxt, { color: theme.colors.textSecondary }]}>
                  Analysing audio…
                </Text>
              </View>
            ) : (
              <View style={[styles.waveOuter, { height: WAVEFORM_H }]}>
                {/* Selection highlight */}
                <View
                  style={[styles.selectionOverlay, {
                    left: leftPx,
                    width: Math.max(0, rightPx - leftPx),
                    backgroundColor: 'rgba(124,58,237,0.18)',
                    borderColor: '#7c3aed',
                  }]}
                  pointerEvents="none"
                />

                {/* Dimmed left cap */}
                <View
                  style={[styles.dimCap, { left: 0, width: leftPx, backgroundColor: 'rgba(0,0,0,0.35)' }]}
                  pointerEvents="none"
                />
                {/* Dimmed right cap */}
                <View
                  style={[styles.dimCap, { left: rightPx, right: 0, backgroundColor: 'rgba(0,0,0,0.35)' }]}
                  pointerEvents="none"
                />

                {/* Bars */}
                <View style={styles.barsRow} pointerEvents="none">
                  {bars.map((amp, i) => {
                    const barStart = i * (BAR_W + BAR_GAP);
                    const barEnd = barStart + BAR_W;
                    const inSel = barEnd > leftPx && barStart < rightPx;
                    return (
                      <View
                        key={i}
                        style={{
                          width: BAR_W,
                          marginRight: i < bars.length - 1 ? BAR_GAP : 0,
                          height: BAR_MIN_H + amp * (BAR_MAX_H - BAR_MIN_H),
                          borderRadius: 1,
                          backgroundColor: inSel
                            ? '#7c3aed'
                            : theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)',
                        }}
                      />
                    );
                  })}
                </View>

                {/* Left handle (files > 60 s only) */}
                {showLeftHandle && (
                  <View
                    {...leftPanResponder.panHandlers}
                    style={[styles.handle, { left: Math.max(0, leftPx - HANDLE_W / 2) }]}
                  >
                    <View style={[styles.handleInner, { backgroundColor: '#7c3aed' }]}>
                      <Ionicons name="chevron-back" size={11} color="#fff" />
                    </View>
                  </View>
                )}

                {/* Right handle */}
                <View
                  {...rightPanResponder.panHandlers}
                  style={[styles.handle, { left: Math.min(WAVEFORM_W - HANDLE_W, rightPx - HANDLE_W / 2) }]}
                >
                  <View style={[styles.handleInner, { backgroundColor: '#7c3aed' }]}>
                    <Ionicons name="chevron-forward" size={11} color="#fff" />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Time display */}
          <View style={styles.timeRow}>
            <View style={[styles.timeBadge, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }]}>
              <Text style={[styles.timeRange, { color: theme.colors.text }]}>
                {fmt(displayStart)} — {fmt(displayEnd)}
              </Text>
              <Text style={[styles.timeDur, { color: '#7c3aed' }]}>
                {fmt(displayEnd - displayStart)}
              </Text>
            </View>
          </View>

          <Text style={[styles.maxNote, { color: theme.colors.textSecondary }]}>
            Maximum clip length: 60 seconds
          </Text>

          <View style={{ flex: 1 }} />

          {/* Preview button */}
          <TouchableOpacity
            style={[styles.previewBtn, { borderColor: '#7c3aed' }]}
            onPress={handlePreview}
            disabled={waveLoading || processing || totalDur === 0}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'}
              size={26}
              color="#7c3aed"
            />
            <Text style={[styles.previewTxt, { color: '#7c3aed' }]}>
              {isPlaying ? 'Pause Preview' : 'Preview Selection'}
            </Text>
          </TouchableOpacity>

          {/* Use This Clip */}
          <TouchableOpacity
            style={[styles.confirmBtn, {
              opacity: waveLoading || processing || totalDur === 0 ? 0.5 : 1,
            }]}
            onPress={handleConfirm}
            disabled={waveLoading || processing || totalDur === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.confirmTxt}>Use This Clip</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Full-screen processing overlay — blocks all interaction */}
        {processing && (
          <View style={styles.processingOverlay}>
            <View style={[styles.processingCard, {
              backgroundColor: theme.isDark ? '#1a1a2e' : '#fff',
            }]}>
              <ActivityIndicator size="large" color="#7c3aed" style={{ marginBottom: 18 }} />
              <Text style={[styles.processingTitle, { color: theme.colors.text }]}>
                Preparing your clip…
              </Text>
              <Text style={[styles.processingSub, { color: theme.colors.textSecondary }]}>
                This usually takes a few seconds
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: H_PAD },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  headerSide: { width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  cancelTxt: { fontSize: 16 },

  // File info
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 28 },
  fileIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.12)', justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  fileDur: { fontSize: 12 },

  // Waveform
  waveSection: { marginBottom: 20 },
  waveHint: { fontSize: 13, marginBottom: 14, textAlign: 'center' },
  waveLoader: { height: WAVEFORM_H, alignItems: 'center', justifyContent: 'center', gap: 8 },
  waveLoaderTxt: { fontSize: 13 },
  waveOuter: { width: WAVEFORM_W, position: 'relative' },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: WAVEFORM_H,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectionOverlay: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 2, borderRightWidth: 2 },
  dimCap: { position: 'absolute', top: 0, bottom: 0 },
  handle: { position: 'absolute', top: 0, bottom: 0, width: HANDLE_W, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  handleInner: { width: HANDLE_W, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  // Time display
  timeRow: { alignItems: 'center', marginBottom: 10 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  timeRange: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timeDur: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  maxNote: { fontSize: 12, textAlign: 'center', marginBottom: 8 },

  // Preview
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, marginBottom: 12 },
  previewTxt: { fontSize: 16, fontWeight: '600' },

  // Confirm
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, marginBottom: 8 },
  confirmTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Processing overlay
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  processingCard: { width: 260, borderRadius: 20, padding: 28, alignItems: 'center' },
  processingTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  processingSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
