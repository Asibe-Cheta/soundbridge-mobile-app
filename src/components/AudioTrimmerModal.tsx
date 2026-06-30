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
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
// ffmpeg-kit-react-native native binaries (v6.0) are temporarily unavailable.
// Import is guarded so the JS bundle compiles fine; trim operations fail gracefully.
let FFmpegKit: any = null;
let ReturnCode: any = null;
try {
  const _m = require('ffmpeg-kit-react-native');
  FFmpegKit = _m.FFmpegKit;
  ReturnCode = _m.ReturnCode;
} catch {}
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

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
  asOverlay?: boolean;
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
  asOverlay = false,
}: AudioTrimmerModalProps) {
  const { theme } = useTheme();
  const trimAvailable = !!FFmpegKit;

  const [totalDur, setTotalDur] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [waveLoading, setWaveLoading] = useState(true);
  const [displayStart, setDisplayStart] = useState(0);
  const [displayEnd, setDisplayEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [playheadOffset, setPlayheadOffset] = useState(0); // seconds from selection start

  // Refs for gesture handlers — avoids stale closures in PanResponder
  const startRef = useRef(0);
  const endRef = useRef(0);
  const durRef = useRef(0);
  const gesStartRef = useRef(0);
  const gesEndRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playheadOffsetRef = useRef(0);
  const playheadGesRef = useRef(0);
  const lastVolumeRef = useRef(1);
  const fadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFadeTimers = () => {
    fadeTimersRef.current.forEach(clearTimeout);
    fadeTimersRef.current = [];
  };

  const scheduleFades = (sound: Audio.Sound, clipDur: number, offsetIntoClip: number, fi: number, fo: number) => {
    const STEPS = 40;

    // Fade in — ramp from current partial volume up to 1
    if (fi > 0 && offsetIntoClip < fi) {
      const remaining = fi - offsetIntoClip;
      const startVol = offsetIntoClip / fi;
      for (let i = 1; i <= STEPS; i++) {
        const delay = (i / STEPS) * remaining * 1000;
        const vol = Math.min(1, startVol + (i / STEPS) * (1 - startVol));
        fadeTimersRef.current.push(
          setTimeout(() => sound.setVolumeAsync(vol).catch(() => {}), delay)
        );
      }
    }

    // Fade out — ramp down in the final `fo` seconds of the clip
    if (fo > 0) {
      const fadeOutStartInClip = clipDur - fo;
      const alreadyIntoFadeOut = Math.max(0, offsetIntoClip - fadeOutStartInClip);
      const timeUntilFadeOutMs = Math.max(0, (fadeOutStartInClip - offsetIntoClip) * 1000);
      const startVol = fo > 0 ? Math.max(0, 1 - alreadyIntoFadeOut / fo) : 1;
      const remainingFo = fo - alreadyIntoFadeOut;

      for (let i = 1; i <= STEPS; i++) {
        const delay = timeUntilFadeOutMs + (i / STEPS) * remainingFo * 1000;
        const vol = Math.max(0, startVol * (1 - i / STEPS));
        fadeTimersRef.current.push(
          setTimeout(() => sound.setVolumeAsync(vol).catch(() => {}), delay)
        );
      }
    }
  };

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
      playheadOffsetRef.current = 0;
      setPlayheadOffset(0);
      lastVolumeRef.current = 1;

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
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
      clearFadeTimers();
      previewTimer.current && clearInterval(previewTimer.current);
      soundRef.current?.setVolumeAsync(1).catch(() => {});
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

  // Middle drag — slides the entire selection window without changing its duration
  const middlePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: () => {
      gesStartRef.current = startRef.current;
      gesEndRef.current = endRef.current;
    },
    onPanResponderMove: (_, gs) => {
      if (durRef.current === 0) return;
      const dt = (gs.dx / WAVEFORM_W) * durRef.current;
      const clipDur = gesEndRef.current - gesStartRef.current;
      let newStart = gesStartRef.current + dt;
      let newEnd = gesEndRef.current + dt;
      if (newStart < 0) { newStart = 0; newEnd = clipDur; }
      if (newEnd > durRef.current) { newEnd = durRef.current; newStart = durRef.current - clipDur; }
      setSelection(newStart, newEnd);
    },
  }), [setSelection]);

  // Playhead — drag to set where preview starts; also tracks position during playback
  const playheadPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { playheadGesRef.current = playheadOffsetRef.current; },
    onPanResponderMove: (_, gs) => {
      if (durRef.current === 0) return;
      const dt = (gs.dx / WAVEFORM_W) * durRef.current;
      const clipDur = endRef.current - startRef.current;
      const newOffset = Math.max(0, Math.min(playheadGesRef.current + dt, clipDur));
      playheadOffsetRef.current = newOffset;
      setPlayheadOffset(newOffset);
    },
  }), []);

  const handlePreview = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      clearFadeTimers();
      previewTimer.current && clearInterval(previewTimer.current);
      await soundRef.current.pauseAsync().catch(() => {});
      await soundRef.current.setVolumeAsync(1).catch(() => {});
      lastVolumeRef.current = 1;
      setIsPlaying(false);
      return;
    }
    try {
      clearFadeTimers();
      const clipDur = endRef.current - startRef.current;
      const clampedOffset = Math.max(0, Math.min(playheadOffsetRef.current, clipDur));
      const startAbsSec = startRef.current + clampedOffset;

      await soundRef.current.setPositionAsync(Math.round(startAbsSec * 1000));

      // Initial volume: account for starting inside fade-in or fade-out zone
      let initVol = 1;
      if (fadeIn > 0 && clampedOffset < fadeIn) {
        initVol = Math.max(0.001, clampedOffset / fadeIn);
      }
      const fadeOutStart = clipDur - fadeOut;
      if (fadeOut > 0 && clampedOffset >= fadeOutStart) {
        const intoFadeOut = clampedOffset - fadeOutStart;
        initVol = Math.min(initVol, Math.max(0.001, 1 - intoFadeOut / fadeOut));
      }
      await soundRef.current.setVolumeAsync(initVol).catch(() => {});
      lastVolumeRef.current = initVol;

      await soundRef.current.playAsync();
      setIsPlaying(true);

      // Pre-schedule all fade volume steps using setTimeout (reliable, no polling drift)
      scheduleFades(soundRef.current, clipDur, clampedOffset, fadeIn, fadeOut);

      // Interval is ONLY for playhead position tracking and stop-at-end
      previewTimer.current = setInterval(async () => {
        const st = await soundRef.current?.getStatusAsync().catch(() => null);
        if (!st?.isLoaded) return;
        const posSec = (st.positionMillis ?? 0) / 1000;

        const newOffset = Math.max(0, Math.min(posSec - startRef.current, clipDur));
        playheadOffsetRef.current = newOffset;
        setPlayheadOffset(newOffset);

        if (posSec >= endRef.current) {
          clearInterval(previewTimer.current!);
          await soundRef.current?.pauseAsync().catch(() => {});
          clearFadeTimers(); // clear after pause — last fade steps have already fired
          await soundRef.current?.setVolumeAsync(1).catch(() => {});
          lastVolumeRef.current = 1;
          setIsPlaying(false);
          playheadOffsetRef.current = 0;
          setPlayheadOffset(0);
        }
      }, 80);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleConfirm = async () => {
    previewTimer.current && clearInterval(previewTimer.current);
    await soundRef.current?.pauseAsync().catch(() => {});
    setIsPlaying(false);
    setProcessing(true);

    if (!trimAvailable) {
      // Server-side trim: upload the full file, then ask the server to cut it
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const filename = audioUri.split('/').pop() || 'audio.mp3';
        const ext = (/\.(\w+)$/.exec(filename) || [])[1] || 'mp3';
        const mimeType = `audio/${ext === 'mp3' ? 'mpeg' : ext}`;
        const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `post-clips/${session.user.id}/${Date.now()}_${sanitized}`;
        const bucket = 'audio-tracks';

        const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;
        const uploadResp = await FileSystem.uploadAsync(uploadUrl, audioUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          mimeType,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: config.supabaseAnonKey,
            'Content-Type': mimeType,
            'x-upsert': 'false',
            'cache-control': '3600',
          },
        });

        if (uploadResp.status < 200 || uploadResp.status >= 300) {
          let errMsg = 'Failed to upload audio';
          try {
            const body = JSON.parse(uploadResp.body);
            errMsg = body.message || body.error || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);

        // Server validates clip_length < 60 (strict). Clamp to 59.999 to stay clear of the boundary.
        const clampedEnd = Math.min(endRef.current, startRef.current + MAX_CLIP - 0.001);

        const trimResp = await fetch('https://www.soundbridge.live/api/posts/trim-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            file_url: publicUrl,
            start_seconds: parseFloat(startRef.current.toFixed(3)),
            end_seconds: parseFloat(clampedEnd.toFixed(3)),
          }),
        });

        if (!trimResp.ok) {
          const errBody = await trimResp.json().catch(() => ({}));
          throw new Error(errBody.error || `Trim server error ${trimResp.status}`);
        }

        const { data: trimData } = await trimResp.json();
        const clipDur = clampedEnd - startRef.current;
        await soundRef.current?.unloadAsync().catch(() => {});
        soundRef.current = null;
        onConfirm(trimData.file_url, Math.round(clipDur));
      } catch (err: any) {
        setProcessing(false);
        Alert.alert('Trim failed', err.message ?? String(err));
      }
      return;
    }

    try {
      const clipDur = endRef.current - startRef.current;
      const outPath = `${FileSystem.cacheDirectory}clip_${Date.now()}.m4a`;
      const filters: string[] = [];
      if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      if (fadeOut > 0) filters.push(`afade=t=out:st=${(clipDur - fadeOut).toFixed(3)}:d=${fadeOut}`);
      const afArg = filters.length > 0 ? `-af "${filters.join(',')}" ` : '';
      const cmd =
        `-i "${audioUri}" ` +
        `-ss ${startRef.current.toFixed(3)} ` +
        `-t ${clipDur.toFixed(3)} ` +
        afArg +
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
    clearFadeTimers();
    previewTimer.current && clearInterval(previewTimer.current);
    await soundRef.current?.stopAsync().catch(() => {});
    await soundRef.current?.setVolumeAsync(1).catch(() => {});
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);
    onCancel();
  };

  // Layout
  const leftPx = totalDur > 0 ? (displayStart / totalDur) * WAVEFORM_W : 0;
  const rightPx = totalDur > 0 ? (displayEnd / totalDur) * WAVEFORM_W : WAVEFORM_W;
  const showLeftHandle = totalDur > MAX_CLIP;
  const clampedPlayheadOffset = Math.min(playheadOffset, displayEnd - displayStart);
  const playheadPx = totalDur > 0 ? ((displayStart + clampedPlayheadOffset) / totalDur) * WAVEFORM_W : leftPx;

  const body = (
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

          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            Share a 60-second teaser of your audio for listeners to get to your song.
          </Text>

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
                ? 'Drag handles to trim · slide the purple bar to reposition'
                : 'Drag the right handle to set clip length'}
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
                {/* Selection highlight — drag to slide entire window */}
                <View
                  {...middlePanResponder.panHandlers}
                  style={[styles.selectionOverlay, {
                    left: leftPx,
                    width: Math.max(0, rightPx - leftPx),
                    backgroundColor: 'rgba(124,58,237,0.22)',
                    borderColor: '#7c3aed',
                  }]}
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

                {/* Fade-in gradient overlay — dark→transparent showing the ramp-up region */}
                {fadeIn > 0 && totalDur > 0 && (
                  <LinearGradient
                    colors={['rgba(15,0,40,0.75)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      left: leftPx,
                      width: Math.min((fadeIn / totalDur) * WAVEFORM_W, rightPx - leftPx),
                      zIndex: 6,
                    }}
                    pointerEvents="none"
                  />
                )}

                {/* Fade-out gradient overlay — transparent→dark showing the ramp-down region */}
                {fadeOut > 0 && totalDur > 0 && (
                  <LinearGradient
                    colors={['transparent', 'rgba(15,0,40,0.75)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      left: Math.max(leftPx, rightPx - (fadeOut / totalDur) * WAVEFORM_W),
                      width: Math.min((fadeOut / totalDur) * WAVEFORM_W, rightPx - leftPx),
                      zIndex: 6,
                    }}
                    pointerEvents="none"
                  />
                )}

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

                {/* Playhead — drag to set play start; tracks position during playback */}
                <View
                  {...playheadPanResponder.panHandlers}
                  style={[styles.playhead, { left: playheadPx - 12 }]}
                >
                  <View style={styles.playheadKnob} />
                  <View style={styles.playheadLine} />
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

          {/* Fade controls */}
          {(() => {
            const clipDur = displayEnd - displayStart;
            const maxFade = Math.max(0.5, Math.min(5, clipDur / 3));
            return (
              <View style={styles.fadeSection}>
                {(['in', 'out'] as const).map(type => {
                  const value = type === 'in' ? fadeIn : fadeOut;
                  const setValue = type === 'in' ? setFadeIn : setFadeOut;
                  return (
                    <View key={type} style={styles.fadeGroup}>
                      <View style={styles.fadeLabelRow}>
                        <Text style={[styles.fadeLabel, { color: theme.colors.textSecondary }]}>
                          Fade {type}
                        </Text>
                        <Text style={[styles.fadeValue, { color: value > 0 ? '#7c3aed' : theme.colors.textSecondary }]}>
                          {value === 0 ? 'Off' : `${value.toFixed(1)}s`}
                        </Text>
                      </View>
                      <Slider
                        style={styles.fadeSlider}
                        minimumValue={0}
                        maximumValue={maxFade}
                        value={value}
                        onValueChange={setValue}
                        step={0.1}
                        minimumTrackTintColor="#7c3aed"
                        maximumTrackTintColor={theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                        thumbTintColor="#7c3aed"
                      />
                    </View>
                  );
                })}
              </View>
            );
          })()}

          <View style={{ flex: 1 }} />

          {/* Preview button */}
          <TouchableOpacity
            style={[styles.previewBtn, {
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              borderColor: theme.colors.border,
              opacity: waveLoading || processing || totalDur === 0 ? 0.4 : 1,
            }]}
            onPress={handlePreview}
            disabled={waveLoading || processing || totalDur === 0}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={24}
              color={theme.colors.text}
            />
            <Text style={[styles.previewTxt, { color: theme.colors.text }]}>
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
            <LinearGradient
              colors={['#EC4899', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.confirmTxt}>Use This Clip</Text>
            </LinearGradient>
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
                Trimming your clip…
              </Text>
              <Text style={[styles.processingSub, { color: theme.colors.textSecondary }]}>
                Uploading and trimming — this may take a moment
              </Text>
            </View>
          </View>
        )}
      </View>
  );

  if (asOverlay) {
    if (!visible) return null;
    return (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}>
        {body}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: H_PAD },

  // Header — matches Digital Wallet exactly
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerSide: { width: 70 },
  headerTitle: { fontSize: 34, fontWeight: '300', letterSpacing: -0.4, lineHeight: 40, textAlign: 'center', fontFamily: Typography.body.fontFamily },
  cancelTxt: { ...Typography.button, fontSize: 17 },

  // Tagline
  tagline: { ...Typography.label, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 14, opacity: 0.75 },

  // File info
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  fileIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.12)', justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { ...Typography.button, fontSize: 14, marginBottom: 3 },
  fileDur: { ...Typography.label, fontSize: 12 },

  // Waveform
  trimNotice: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  trimNoticeTxt: { flex: 1, fontSize: 13, lineHeight: 18 },
  waveSection: { marginBottom: 20 },
  waveHint: { ...Typography.label, fontSize: 12, marginBottom: 14, textAlign: 'center', letterSpacing: 0.1 },
  waveLoader: { height: WAVEFORM_H, alignItems: 'center', justifyContent: 'center', gap: 8 },
  waveLoaderTxt: { ...Typography.label, fontSize: 13 },
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

  // Playhead
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 24, alignItems: 'center', zIndex: 15 },
  playheadKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#7c3aed', marginBottom: -1 },
  playheadLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.9)' },

  // Time display
  timeRow: { alignItems: 'center', marginBottom: 14 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  timeRange: { ...Typography.button, fontSize: 17, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  timeDur: { ...Typography.button, fontSize: 17, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },

  // Fade controls
  fadeSection: { gap: 10, marginTop: 2, marginBottom: 4 },
  fadeGroup: { gap: 2 },
  fadeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fadeLabel: { ...Typography.button, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  fadeValue: { ...Typography.button, fontSize: 13 },
  fadeSlider: { width: '100%', height: 40, marginHorizontal: -8 },

  // Preview — matches Digital Wallet "History" button exactly
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10,
  },
  previewTxt: { ...Typography.button, color: '#FFFFFF' },

  // Confirm — matches Digital Wallet "Withdraw" button exactly
  confirmBtn: { borderRadius: 24, overflow: 'hidden', marginBottom: 8 },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  confirmTxt: { ...Typography.button, color: '#fff' },

  // Processing overlay
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  processingCard: { width: 260, borderRadius: 20, padding: 28, alignItems: 'center' },
  processingTitle: { ...Typography.button, fontSize: 17, marginBottom: 8, textAlign: 'center' },
  processingSub: { ...Typography.body, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
