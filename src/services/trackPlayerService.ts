/* eslint-disable @typescript-eslint/no-var-requires */
// Pure CommonJS — no ESM imports. Mixing `import` + `module.exports` in the
// same file causes Babel to wrap the export in a `{ default: fn }` object,
// which makes RNTP silently fail to register the service (it expects a plain
// function). Using require() here keeps the module format unambiguous.
const TrackPlayer = require('react-native-track-player').default;
const { Event, State } = require('react-native-track-player');
const { markJsBundleEval, getJsBundleLoadId } = require('../lib/jsBundleTrace');

const RESTORE_KEY = 'sb_audio_restore';
const BG_PROBE_ANCHOR_KEY = 'sb_bg_probe_anchor';
const BG_PROBE_SECONDS = [5, 15, 30, 45, 60];

// Use a SEPARATE key from the main debug log to avoid race conditions.
// The main log (sb_audio_debug_v1) and this key are merged in the About screen viewer.
const HEADLESS_LOG_KEY = 'sb_hs_debug_v1';
function headlessLog(tag: string, detail?: Record<string, unknown>) {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  const ts = `${h}:${m}:${s}.${ms}`;
  const line = detail !== undefined
    ? `${ts} [HS:${tag}] ${JSON.stringify(detail)}`
    : `${ts} [HS:${tag}]`;
  (async () => {
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const raw = await AS.getItem(HEADLESS_LOG_KEY);
      const lines: string[] = raw ? JSON.parse(raw) : [];
      lines.push(line);
      if (lines.length > 250) lines.splice(0, lines.length - 250);
      await AS.setItem(HEADLESS_LOG_KEY, JSON.stringify(lines));
    } catch {}
  })();
}

let bgEnteredAt = 0;
let bgProbeTimers: ReturnType<typeof setTimeout>[] = [];
let lastHeadlessQueueLen = -1;

function stateLabel(state: number): string {
  const map: Record<number, string> = {
    [State.None]: 'None',
    [State.Ready]: 'Ready',
    [State.Playing]: 'Playing',
    [State.Paused]: 'Paused',
    [State.Stopped]: 'Stopped',
    [State.Buffering]: 'Buffering',
    [State.Loading]: 'Loading',
    [State.Error]: 'Error',
  };
  return map[state] ?? String(state);
}

async function readBgAnchor(): Promise<{ ts: number; nextState?: string } | null> {
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    const raw = await AS.getItem(BG_PROBE_ANCHOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function headlessNativeSnapshot(label: string, extra?: Record<string, unknown>) {
  try {
    const tpState = await TrackPlayer.getState();
    const queue = await TrackPlayer.getQueue();
    const queueLen = queue?.length ?? 0;
    let pos = 0;
    try {
      pos = await TrackPlayer.getPosition();
    } catch {}
    const { AppState } = require('react-native');
    const { getAudioAuthLogFieldsAsync } = require('../lib/audioAuthTrace');
    const { getBgIsolationLogFieldsAsync } = require('../config/bgAudioIsolationFlags');
    const { getSessionDLogFieldsAsync } = require('../lib/sessionDTrace');
    const anchor = await readBgAnchor();
    const now = Date.now();
    const secSinceBg = bgEnteredAt ? Math.round((now - bgEnteredAt) / 1000) : 0;
    const secSinceAnchor = anchor?.ts ? Math.round((now - anchor.ts) / 1000) : null;
    const [authFields, isoFields, sessionDFields] = await Promise.all([
      getAudioAuthLogFieldsAsync(),
      getBgIsolationLogFieldsAsync(),
      getSessionDLogFieldsAsync(),
    ]);

    const detail: Record<string, unknown> = {
      label,
      tpState: stateLabel(tpState),
      tpStateRaw: tpState,
      queueLen,
      pos: Math.floor(pos),
      appState: AppState.currentState,
      secSinceBg,
      secSinceAnchor,
      jsBundleLoadId: getJsBundleLoadId(),
      ...authFields,
      ...isoFields,
      ...sessionDFields,
      ...extra,
    };

    if (lastHeadlessQueueLen > 0 && queueLen === 0) {
      headlessLog('NATIVE_QUEUE_DEATH', {
        ...detail,
        prevQueueLen: lastHeadlessQueueLen,
        note: 'Queue went from >0 to 0 — check events in ±2s window',
      });
    }
    lastHeadlessQueueLen = queueLen;

    headlessLog('NATIVE_BG_PROBE', detail);
  } catch (e) {
    headlessLog('NATIVE_BG_PROBE_ERR', { label, err: String(e) });
  }
}

function cancelBgProbes(reason: string) {
  bgProbeTimers.forEach((t) => clearTimeout(t));
  bgProbeTimers = [];
  if (bgEnteredAt) {
    headlessLog('BG_PROBE_CANCELLED', {
      reason,
      elapsedSec: Math.round((Date.now() - bgEnteredAt) / 1000),
    });
  }
  bgEnteredAt = 0;
}

function scheduleBgProbes() {
  cancelBgProbes('reschedule');
  bgEnteredAt = Date.now();
  lastHeadlessQueueLen = -1;
  headlessLog('BG_PROBE_SCHEDULED', { marksSec: BG_PROBE_SECONDS });

  BG_PROBE_SECONDS.forEach((sec) => {
    const t = setTimeout(() => {
      headlessNativeSnapshot(`T+${sec}s`);
    }, sec * 1000);
    bgProbeTimers.push(t);
  });
}

async function headlessLogNativeEvent(eventTag: string, extra?: Record<string, unknown>) {
  try {
    const tpState = await TrackPlayer.getState();
    const queue = await TrackPlayer.getQueue();
    const queueLen = queue?.length ?? 0;
    let pos = 0;
    try {
      pos = await TrackPlayer.getPosition();
    } catch {}
    const { AppState } = require('react-native');
    const secSinceBg = bgEnteredAt ? Math.round((Date.now() - bgEnteredAt) / 1000) : 0;

    const snapshot: Record<string, unknown> = {
      tpState: stateLabel(tpState),
      tpStateRaw: tpState,
      queueLen,
      pos: Math.floor(pos),
      appState: AppState.currentState,
      secSinceBg,
      ...extra,
    };

    if (lastHeadlessQueueLen > 0 && queueLen === 0) {
      headlessLog('NATIVE_QUEUE_DEATH', {
        eventTag,
        prevQueueLen: lastHeadlessQueueLen,
        ...snapshot,
        note: 'Death detected during native event',
      });
    }
    if (queueLen >= 0) lastHeadlessQueueLen = queueLen;

    headlessLog(eventTag, snapshot);
  } catch (e) {
    headlessLog(eventTag, { ...(extra || {}), snapErr: String(e) });
  }
}

async function headlessMarkPaused() {
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    const raw = await AS.getItem(RESTORE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.userPaused = true;
    state.isPlaying = false;
    await AS.setItem(RESTORE_KEY, JSON.stringify(state));
  } catch {}
}

async function headlessMarkPlaying() {
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    const raw = await AS.getItem(RESTORE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.userPaused = false;
    state.isPlaying = true;
    await AS.setItem(RESTORE_KEY, JSON.stringify(state));
  } catch {}
}

async function headlessResolveUrl(track) {
  try {
    const { resolvePlayUrlForRestore } = require('./iosPlayCache');
    return await resolvePlayUrlForRestore(track);
  } catch {
    return track?.streamUrl || track?.url;
  }
}

async function headlessEnsurePlaying(reason: string) {
  // Only recover from a fully dead player (Stopped/None/Error) — never fight Paused.
  // Periodic resume while Paused caused Control Center glitches and ~60s stop/resume loops.
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    const raw = await AS.getItem(RESTORE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state.isPlaying || state.userPaused) return;

    const tpState = await TrackPlayer.getState();
    if (tpState === State.Playing || tpState === State.Buffering) return;
    if (tpState === State.Paused) {
      headlessLog('KEEPALIVE_SKIP_PAUSED', { reason });
      return;
    }

    const queue = await TrackPlayer.getQueue();
    if (queue?.length > 0) {
      await TrackPlayer.setVolume(1.0);
      await TrackPlayer.play();
      headlessLog('KEEPALIVE_RESUME_QUEUE', { reason, tpState: stateLabel(tpState) });
      return;
    }

    const track = state.track;
    if (!track?.url) return;
    const playUrl = await headlessResolveUrl(track);
    if (playUrl.startsWith('http')) {
      headlessLog('KEEPALIVE_SKIP_HTTP', { reason });
      return;
    }
    await TrackPlayer.add({
      id: track.id,
      url: playUrl,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      duration: track.duration,
    });
    const pos = state.position || 0;
    if (pos > 0) {
      await new Promise(r => setTimeout(r, 100));
      await TrackPlayer.seekTo(pos);
    }
    await TrackPlayer.setVolume(1.0);
    await TrackPlayer.play();
    headlessLog('KEEPALIVE_RESUME', { reason, tpState: stateLabel(tpState), local: true });
  } catch (e) {
    headlessLog('KEEPALIVE_ERR', { reason, err: String(e) });
  }
}

module.exports = async function () {
  markJsBundleEval('trackPlayerService:headless');
  headlessLog('INIT', { jsBundleLoadId: getJsBundleLoadId() });

  const { AppState } = require('react-native');
  AppState.addEventListener('change', (next: string) => {
    headlessLog('HS_APP_STATE', { next });
    if (next === 'background' || next === 'inactive') {
      if (!bgEnteredAt) {
        scheduleBgProbes();
        headlessNativeSnapshot('bg_enter_immediate', { triggerState: next });
      }
    } else if (next === 'active') {
      cancelBgProbes('foreground');
    }
  });

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    headlessLog('RemotePlay');
    await headlessMarkPlaying();
    await TrackPlayer.setVolume(1.0);
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    headlessLog('RemotePause');
    await headlessMarkPaused();
    await TrackPlayer.pause();
  });

  // Use pause() instead of reset() for RemoteStop and permanent RemoteDuck.
  // reset() clears the native queue — iOS then sees no audio playing and terminates
  // the background process, which breaks auto-resume. pause() keeps the queue intact
  // so the track survives in the native layer across background sessions.
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await headlessLogNativeEvent('RemoteStop');
    await headlessMarkPaused();
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    headlessLog('RemoteNext');
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {
      headlessLog('RemoteNext_ERR', { err: String(e) });
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    headlessLog('RemotePrevious');
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {
      headlessLog('RemotePrevious_ERR', { err: String(e) });
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }: { position: number }) => {
    headlessLog('RemoteSeek', { position });
    await TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }: { paused: boolean; permanent: boolean }) => {
    await headlessLogNativeEvent('RemoteDuck', { paused, permanent });

    if (!paused) {
      await TrackPlayer.setVolume(1.0);
      const state = await TrackPlayer.getState();
      if (state === State.Paused) {
        await TrackPlayer.play();
        await headlessMarkPlaying();
        headlessLog('RemoteDuck_UNDUCK_RESUME');
      }
      return;
    }

    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const raw = await AS.getItem(RESTORE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.userPaused) {
        headlessLog('RemoteDuck_SKIP_USER_PAUSED');
        return;
      }

      const active = AppState.currentState === 'active';

      // Foreground permanent duck (phone call, another app took audio) — pause.
      if (active && permanent) {
        headlessLog('RemoteDuck_PERM_FG_PAUSE');
        await TrackPlayer.pause();
        return;
      }

      // Foreground temporary duck — lower volume; iOS may already pause native layer.
      if (active && !permanent) {
        headlessLog('RemoteDuck_FG_DUCK');
        await TrackPlayer.setVolume(0.3);
        const state = await TrackPlayer.getState();
        if (state === State.Paused) {
          await TrackPlayer.play();
          await headlessMarkPlaying();
          headlessLog('RemoteDuck_FG_DUCK_PLAY');
        }
        return;
      }

      // Background (Home / app switcher) — never stay paused.
      headlessLog('RemoteDuck_BG_KEEPALIVE');
      await TrackPlayer.setVolume(1.0);
      const state = await TrackPlayer.getState();
      if (state !== State.Playing && state !== State.Buffering) {
        await TrackPlayer.play();
        await headlessMarkPlaying();
        headlessLog('RemoteDuck_BG_RESUMED');
      }
    } catch (e) {
      headlessLog('RemoteDuck_ERR', { err: String(e) });
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (e: unknown) => {
    await headlessLogNativeEvent('PlaybackError', { err: JSON.stringify(e) });
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await headlessLogNativeEvent('PlaybackQueueEnded');
  });

  TrackPlayer.addEventListener(Event.PlaybackState, async (data: { state?: number }) => {
    await headlessLogNativeEvent('PlaybackState', {
      state: data?.state != null ? stateLabel(data.state) : undefined,
      stateRaw: data?.state,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (data: unknown) => {
    await headlessLogNativeEvent('PlaybackActiveTrackChanged', {
      track: JSON.stringify(data),
    });
  });
};
