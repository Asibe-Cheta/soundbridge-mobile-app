/* eslint-disable @typescript-eslint/no-var-requires */
// Pure CommonJS — no ESM imports. Mixing `import` + `module.exports` in the
// same file causes Babel to wrap the export in a `{ default: fn }` object,
// which makes RNTP silently fail to register the service (it expects a plain
// function). Using require() here keeps the module format unambiguous.
const TrackPlayer = require('react-native-track-player').default;
const { Event } = require('react-native-track-player');

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
      if (lines.length > 120) lines.splice(0, lines.length - 120);
      await AS.setItem(HEADLESS_LOG_KEY, JSON.stringify(lines));
    } catch {}
  })();
}

module.exports = async function () {
  headlessLog('INIT');

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    headlessLog('RemotePlay');
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    headlessLog('RemotePause');
    await TrackPlayer.pause();
  });

  // Use pause() instead of reset() for RemoteStop and permanent RemoteDuck.
  // reset() clears the native queue — iOS then sees no audio playing and terminates
  // the background process, which breaks auto-resume. pause() keeps the queue intact
  // so the track survives in the native layer across background sessions.
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    headlessLog('RemoteStop');
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    headlessLog('RemoteNext');
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    headlessLog('RemotePrevious');
    await TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }: { position: number }) => {
    headlessLog('RemoteSeek', { position });
    await TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }: { paused: boolean; permanent: boolean }) => {
    headlessLog('RemoteDuck', { paused, permanent });
    if (permanent) {
      // Permanent interruption (phone call ending session) — pause fully.
      await TrackPlayer.pause();
    } else if (paused) {
      // Transient interruption (notification, Siri, screen lock on some iOS versions).
      // Duck volume rather than pausing so music continues in background.
      // A full pause here is the #1 cause of music stopping on app backgrounding.
      await TrackPlayer.setVolume(0.15);
    } else {
      // Interruption ended — restore volume and ensure playback is active.
      await TrackPlayer.setVolume(1.0);
      const { State } = require('react-native-track-player');
      try {
        const state = await TrackPlayer.getState();
        if (state === State.Paused || state === State.Stopped || state === State.Ready) {
          await TrackPlayer.play();
        }
      } catch {}
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (e: unknown) => {
    headlessLog('PlaybackError', { err: String(e) });
  });
};
