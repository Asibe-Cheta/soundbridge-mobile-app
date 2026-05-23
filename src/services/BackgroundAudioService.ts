import { NativeModules, Platform, AppState } from 'react-native';
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import type { Sound } from 'expo-av';
import { audioLog } from '../lib/audioDebugLog';

export interface BackgroundAudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  artwork?: string;
  duration?: number;
  creatorId?: string;
}

type StatusUpdateCallback = (status: { position: number; duration: number; isPlaying: boolean }) => void;

const STORAGE_KEY_RESTORE = 'sb_audio_restore';

interface AudioRestoreState {
  track: BackgroundAudioTrack;
  position: number;
  isPlaying: boolean;
  savedAt: number;
  userPaused?: boolean; // true only when the user explicitly pressed pause
}

// Pre-check NativeModules.TrackPlayerModule before requiring the package.
// react-native-track-player calls `new NativeEventEmitter(TrackPlayerModule)` at
// module init time — if the native module is null (Expo Go / missing native build),
// Metro's guardedLoadModule promotes it to a fatal error BEFORE any JS try/catch runs.
// Checking NativeModules.TrackPlayerModule first is a synchronous pre-init check that
// prevents Metro from loading the module at all when the native side isn't present.
function getTrackPlayer() {
  if (Platform.OS !== 'ios') return null;
  if (!NativeModules.TrackPlayerModule) return null;
  try {
    const TP = require('react-native-track-player').default;
    if (!TP || typeof TP.setupPlayer !== 'function') return null;
    return TP;
  } catch {
    return null;
  }
}

function getTrackPlayerConstants() {
  if (Platform.OS !== 'ios') return null;
  if (!NativeModules.TrackPlayerModule) return null;
  try {
    return require('react-native-track-player');
  } catch {
    return null;
  }
}

// Android: expo-av works fine (OS foreground service not needed, background works).
// iOS: expo-av does NOT update MPNowPlayingInfoCenter, so iOS kills the audio session after
// ~60s when the screen is off. TrackPlayer updates Now Playing automatically and keeps the
// session alive. If TrackPlayer is unavailable (Expo Go / iOS 26 crash), expo-av is the
// automatic fallback via playWithExpoAv().
const USE_EXPO_AV = Platform.OS !== 'ios';

class BackgroundAudioService {
  private isInitialized = false;
  private currentTrack: BackgroundAudioTrack | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private statusCallbacks: Set<StatusUpdateCallback> = new Set();
  private onTrackFinishedCallback: (() => void) | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private eventSubscriptions: any[] = [];
  private appStateSubscription: any = null;

  // expo-av path (Android + fallback)
  private avSound: Sound | null = null;
  private lastLoggedPlaying: boolean | null = null;
  private lastPersistAt = 0;
  // Incremented by playTrack/stop to abort any in-flight _resumeAfterJsRestart
  private _resumeGeneration = 0;
  // True only when the user explicitly called pause() — false during duck/system pauses
  private _userPaused = false;
  // Snapshot of isPlaying captured when app goes to inactive/background.
  // Used for foreground-resume so stale PlaybackState events can't block it.
  private _playingSnapshotBeforeBackground = false;
  // Track reference saved at background time — survives even if PlaybackQueueEnded
  // fires spuriously in background and clears this.currentTrack.
  private _trackBeforeBackground: BackgroundAudioTrack | null = null;
  // Called when RNTP native layer changes the active track (remote skip from lock screen).
  private _onRemoteTrackChanged: ((track: BackgroundAudioTrack) => void) | null = null;

  constructor() {
    audioLog('TP_MODULE_AVAILABLE', {
      TrackPlayerModule: Platform.OS === 'ios',
      platform: Platform.OS,
      useExpoAv: USE_EXPO_AV,
    });
    this.appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      audioLog('APP_STATE', nextState);

      // Snapshot playing state on the FIRST background transition (inactive only).
      // We intentionally do NOT update the snapshot on the subsequent 'background'
      // event — something (e.g. a JS-level pause) might fire between inactive and
      // background and overwrite it with false, preventing the foreground resume.
      if (nextState === 'inactive') {
        this._playingSnapshotBeforeBackground = this.isPlaying && !this._userPaused && !!this.currentTrack;
        // Save the track reference so it survives even if PlaybackQueueEnded fires
        // spuriously in background and clears this.currentTrack.
        this._trackBeforeBackground = this.currentTrack;
        audioLog('BG_SNAPSHOT', { snapshot: this._playingSnapshotBeforeBackground, isPlaying: this.isPlaying, userPaused: this._userPaused });
      }
      // Android has no 'inactive' state — goes directly active → background.
      // Capture snapshot here and re-assert audio mode so the OS doesn't reclaim the session.
      if (nextState === 'background' && USE_EXPO_AV) {
        this._playingSnapshotBeforeBackground = this.isPlaying && !this._userPaused && !!this.currentTrack;
        this._trackBeforeBackground = this.currentTrack;
        audioLog('BG_SNAPSHOT_ANDROID', { snapshot: this._playingSnapshotBeforeBackground, isPlaying: this.isPlaying, userPaused: this._userPaused });
        if (this.avSound) {
          try {
            await Audio.setAudioModeAsync({
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              interruptionModeIOS: InterruptionModeIOS.DoNotMix,
              interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
              shouldDuckAndroid: true,
              allowsRecordingIOS: false,
              playThroughEarpieceAndroid: false,
            });
            audioLog('AUDIO_MODE_ASSERTED_ON_BG');
          } catch (e) {
            audioLog('AUDIO_MODE_BG_ERR', String(e));
          }
        }
      }
      // Log RNTP native state on every background transition for diagnostics
      if ((nextState === 'inactive' || nextState === 'background') && !USE_EXPO_AV) {
        const TrackPlayer = getTrackPlayer();
        const constants = getTrackPlayerConstants();
        if (TrackPlayer && constants) {
          try {
            const state = await TrackPlayer.getState();
            audioLog('TP_STATE_ON_BG', { nextState, state });
          } catch (e) {
            audioLog('TP_STATE_ON_BG_ERR', String(e));
          }
        }
      }

      if (nextState === 'active') {
        // expo-av path (Android): re-assert audio session and resume if the OS stopped playback
        if (USE_EXPO_AV && this.avSound) {
          try {
            await Audio.setAudioModeAsync({
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              interruptionModeIOS: InterruptionModeIOS.DoNotMix,
              interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
              shouldDuckAndroid: true,
              allowsRecordingIOS: false,
              playThroughEarpieceAndroid: false,
            });
            audioLog('AUDIO_MODE_REAPPLIED_ON_FOREGROUND');
          } catch (e) {
            audioLog('AUDIO_MODE_REAPPLY_ERR', String(e));
          }
          if (this._playingSnapshotBeforeBackground && !this.isPlaying) {
            try {
              await this.avSound.playAsync();
              this.isPlaying = true;
              this.notifyCallbacks();
              audioLog('EXPO_AV_RESUMED_ON_FOREGROUND');
            } catch (e) {
              audioLog('EXPO_AV_RESUME_ERR', String(e));
            }
          }
        }
        // TrackPlayer path (iOS): resume if audio was playing when we backgrounded.
        // Use _trackBeforeBackground instead of this.currentTrack — a spurious
        // PlaybackQueueEnded in background may have nulled this.currentTrack already.
        const resumeTrack = this._trackBeforeBackground;
        if (!USE_EXPO_AV && this._playingSnapshotBeforeBackground && resumeTrack) {
          const TrackPlayer = getTrackPlayer();
          const constants = getTrackPlayerConstants();
          if (TrackPlayer && constants) {
            try {
              const { State } = constants;
              const state = await TrackPlayer.getState();
              audioLog('TP_FOREGROUND_CHECK', { state });
              if (state === State.Paused || state === State.Ready || state === State.Stopped || state === State.None) {
                // Restore currentTrack if a spurious QueueEnded cleared it
                if (!this.currentTrack) {
                  this.currentTrack = resumeTrack;
                  this.notifyCallbacks();
                }
                // Re-add to RNTP queue if it was cleared by the interruption
                const queue = await TrackPlayer.getQueue();
                if (!queue || queue.length === 0) {
                  audioLog('TP_RESUME_REQUEUE', { title: resumeTrack.title, pos: this.position });
                  await TrackPlayer.add({ id: resumeTrack.id, url: resumeTrack.url, title: resumeTrack.title, artist: resumeTrack.artist, artwork: resumeTrack.artwork, duration: resumeTrack.duration });
                  if (this.position > 0) await TrackPlayer.seekTo(this.position);
                }
                audioLog('TP_RESUME_ON_FOREGROUND', { state });
                await TrackPlayer.setVolume(1.0);
                await TrackPlayer.play();
                this.notifyCallbacks();
              }
            } catch (e) {
              audioLog('TP_RESUME_ON_FOREGROUND_ERR', String(e));
            }
          }
        }
        this._playingSnapshotBeforeBackground = false;
        this._trackBeforeBackground = null;
      }
    });
    audioLog('SERVICE_INIT', { platform: Platform.OS, engine: USE_EXPO_AV ? 'expo-av' : 'trackplayer', appState: AppState.currentState });
    // Always attempt to restore — the saved timestamp (< 5 min) is the reliable signal
    // that this is a JS-restart-in-background rather than a fresh cold launch.
    // Checking AppState.currentState directly is unreliable: on some restarts it already
    // reads 'active' 26ms before the APP_STATE event fires.
    this._resumeAfterJsRestart();
  }

  async initialize() {
    if (this.isInitialized) return;
    if (USE_EXPO_AV) {
      this.isInitialized = true;
      return;
    }

    const TrackPlayer = getTrackPlayer();
    const constants = getTrackPlayerConstants();

    if (!TrackPlayer || !constants) {
      audioLog('TP_UNAVAILABLE');
      this.isInitialized = true;
      return;
    }

    const { Capability, Event, RepeatMode, State } = constants;

    try {
      // setupPlayer throws "already_initialized" if the native player persists
      // across a JS reload — treat that as a success and continue setup.
      try {
        // maxCacheSize 30MB: ensures the full track is buffered before background throttling
        // drops network access (the old 5MB (~50s) was why audio stopped at ~50s).
        // autoHandleInterruptions: false — we handle interruptions via RemoteDuck in
        // trackPlayerService.ts. RNTP's built-in handling silently pauses and may not
        // resume; our handler ducks volume instead (safer).
        await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 30, autoHandleInterruptions: false });
        audioLog('TP_SETUP_OK');
      } catch (setupErr: any) {
        const msg = String(setupErr).toLowerCase();
        if (msg.includes('already') || msg.includes('initialized')) {
          audioLog('TP_SETUP_ALREADY_INIT');
          // Player is already live — skip setupPlayer, proceed to updateOptions
        } else {
          throw setupErr; // genuine failure, propagate to outer catch
        }
      }

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1, // seconds (RNTP v4 API)
      });

      await TrackPlayer.setRepeatMode(RepeatMode.Off);

      const stateSub = TrackPlayer.addEventListener(Event.PlaybackState, ({ state }: any) => {
        const playing = state === State.Playing;
        if (playing !== this.lastLoggedPlaying) {
          this.lastLoggedPlaying = playing;
          audioLog('TP_STATE_CHANGED', { playing, state });
        }
        this.isPlaying = playing;
        this.notifyCallbacks();
      });

      const endSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        audioLog('TP_QUEUE_ENDED', { appState: AppState.currentState });
        this.isPlaying = false;
        this.notifyCallbacks();

        if (AppState.currentState !== 'active') {
          // In background: PlaybackQueueEnded fires spuriously when iOS interrupts the
          // audio session (the track hasn't actually finished). Suppressing — don't clear
          // state or fire the track-finished callback. The foreground-resume handler will
          // re-queue and resume when the user returns to the app.
          audioLog('TP_QUEUE_ENDED_BG_SUPPRESSED');
          return;
        }

        this._clearRestoreState();
        if (this.onTrackFinishedCallback) {
          this.onTrackFinishedCallback();
        }
        // Clear currentTrack AFTER the callback so onTrackFinished can still read it.
        this.currentTrack = null;
      });

      const errSub = TrackPlayer.addEventListener(Event.PlaybackError, (e: any) => {
        audioLog('TP_PLAYBACK_ERR', { code: e?.code, message: e?.message });
      });

      // Use event-based progress instead of polling — avoids 4 bridge roundtrips/second.
      // notifyCallbacks() is gated on foreground so background re-renders don't happen.
      const progressSub = TrackPlayer.addEventListener(
        Event.PlaybackProgressUpdated,
        ({ position, duration }: { position: number; duration: number }) => {
          if (!isNaN(position)) this.position = Math.floor(position);
          if (!isNaN(duration) && duration > 0) this.duration = Math.floor(duration);
          if (AppState.currentState === 'active') {
            this.notifyCallbacks();
          }
          const now = Date.now();
          if (now - this.lastPersistAt > 5000) {
            this.lastPersistAt = now;
            this._persistState();
          }
        }
      );

      // Lightweight 10-second heartbeat — confirms JS is alive in background
      // and updates position for logging even when the progress event is throttled.
      this.progressInterval = setInterval(async () => {
        try {
          const pos = await TrackPlayer.getPosition();
          const dur = await TrackPlayer.getDuration();
          if (pos !== undefined && !isNaN(pos)) {
            this.position = Math.floor(pos);
            if (dur !== undefined && !isNaN(dur) && dur > 0) {
              this.duration = Math.floor(dur);
            }
            audioLog('JS_ALIVE', { pos: this.position, dur: this.duration });
            const now = Date.now();
            if (now - this.lastPersistAt > 5000) {
              this.lastPersistAt = now;
              this._persistState();
            }
          }
        } catch {}
      }, 10000);

      // Fires when RNTP native layer changes the active track — happens on remote skip
      // (lock-screen Next/Previous) when the full queue is loaded into RNTP.
      // We skip the event when the new track ID matches our own currentTrack (i.e. the
      // event was triggered by our own playTrack() call, not a remote action).
      const trackChangeSub = TrackPlayer.addEventListener(
        Event.PlaybackActiveTrackChanged,
        ({ track: newTrack }: { track: any }) => {
          if (!newTrack) return;
          if (newTrack.id === this.currentTrack?.id) return;
          audioLog('TP_ACTIVE_TRACK_CHANGED', { title: newTrack.title });
          this.currentTrack = {
            id: newTrack.id,
            title: newTrack.title,
            artist: newTrack.artist || '',
            url: newTrack.url,
            artwork: newTrack.artwork,
            duration: newTrack.duration,
          };
          this.position = 0;
          this.duration = newTrack.duration || 0;
          this._persistState();
          this.notifyCallbacks();
          if (this._onRemoteTrackChanged) this._onRemoteTrackChanged(this.currentTrack);
        }
      );

      this.eventSubscriptions.push(stateSub, endSub, errSub, progressSub, trackChangeSub);

      this.isInitialized = true;
      audioLog('TP_INIT_OK');
    } catch (error) {
      audioLog('TP_INIT_ERR', String(error));
    }
  }

  private notifyCallbacks() {
    this.statusCallbacks.forEach(cb =>
      cb({ position: this.position, duration: this.duration, isPlaying: this.isPlaying })
    );
  }

  private async stopAvSound() {
    audioLog('STOP_AV_SOUND');
    const sound = this.avSound;
    this.avSound = null;
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
    }
  }

  async playTrack(track: BackgroundAudioTrack, queue?: BackgroundAudioTrack[], queueIndex?: number) {
    this._resumeGeneration++;
    this._userPaused = false;
    audioLog('PLAY_TRACK', { title: track.title });
    this.currentTrack = track;
    this.position = 0;
    this.duration = track.duration || 0;
    this.lastLoggedPlaying = null;
    this._persistState();

    if (USE_EXPO_AV) {
      await this.playWithExpoAv(track);
      return;
    }

    const TrackPlayer = getTrackPlayer();
    if (!TrackPlayer) {
      audioLog('TP_MISSING_FALLBACK');
      await this.playWithExpoAv(track);
      return;
    }

    try {
      await this.initialize();
      await TrackPlayer.reset();
      if (queue && queue.length > 1) {
        // Load full queue so lock-screen skip buttons actually move between tracks.
        for (const t of queue) {
          await TrackPlayer.add({
            id: t.id,
            url: t.url,
            title: t.title,
            artist: t.artist,
            artwork: t.artwork,
            duration: t.duration,
          });
        }
        const idx = queueIndex ?? 0;
        if (idx > 0) await TrackPlayer.skip(idx);
      } else {
        await TrackPlayer.add({
          id: track.id,
          url: track.url,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          duration: track.duration,
        });
      }
      await TrackPlayer.play();
      this.isPlaying = true;
      audioLog('TP_PLAY_OK', { title: track.title, queueSize: queue?.length ?? 1, queueIndex });
    } catch (error) {
      audioLog('TP_PLAY_ERR_FALLBACK', String(error));
      await this.playWithExpoAv(track);
    }
  }

  private async playWithExpoAv(track: BackgroundAudioTrack) {
    try {
      audioLog('SET_AUDIO_MODE_START');
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
          playThroughEarpieceAndroid: false,
        });
        audioLog('SET_AUDIO_MODE_OK');
      } catch (e) {
        audioLog('SET_AUDIO_MODE_ERR', String(e));
      }

      await this.stopAvSound();

      audioLog('CREATE_SOUND');
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: false, progressUpdateIntervalMillis: 500 }
      );
      this.avSound = sound;
      audioLog('SOUND_CREATED');

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          if ('error' in status && status.error) {
            audioLog('STATUS_ERROR', status.error);
          }
          return;
        }

        const playing = status.isPlaying;
        const pos = Math.floor((status.positionMillis ?? 0) / 1000);
        const durMs = status.durationMillis ?? (track.duration ? track.duration * 1000 : 0);
        const dur = Math.floor(durMs / 1000);

        if (playing !== this.lastLoggedPlaying) {
          this.lastLoggedPlaying = playing;
          audioLog('PLAYING_CHANGED', {
            playing,
            pos,
            dur,
            didJustFinish: status.didJustFinish,
            isBuffering: status.isBuffering,
          });
        }

        this.isPlaying = playing;
        this.position = pos;
        if (dur > 0) this.duration = dur;
        this.notifyCallbacks();
        const now = Date.now();
        if (playing && now - this.lastPersistAt > 5000) {
          this.lastPersistAt = now;
          this._persistState();
        }

        if (status.didJustFinish) {
          audioLog('TRACK_FINISHED', { pos, dur });
          this.isPlaying = false;
          this.notifyCallbacks();
          if (this.onTrackFinishedCallback) {
            this.onTrackFinishedCallback();
          }
        }
      });

      await sound.playAsync();
      this.isPlaying = true;
      audioLog('SOUND_PLAY_OK');
      this.notifyCallbacks();
    } catch (error) {
      audioLog('PLAY_ERROR', String(error));
      console.error('expo-av: failed to play track', error);
    }
  }

  async pause(caller = 'unknown') {
    this._userPaused = true; // user explicitly paused
    audioLog('PAUSE_CALLED', { caller, useExpoAv: USE_EXPO_AV, hasSound: !!this.avSound });
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      if (this.avSound) {
        try { await this.avSound.pauseAsync(); } catch {}
      }
    } else {
      const TrackPlayer = getTrackPlayer();
      try { if (TrackPlayer) await TrackPlayer.pause(); } catch {}
    }
    this.isPlaying = false;
    this.notifyCallbacks();
    this._persistState();
  }

  async resume() {
    this._userPaused = false;
    audioLog('RESUME_CALLED');
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      if (this.avSound) {
        try { await this.avSound.playAsync(); } catch {}
      }
    } else {
      const TrackPlayer = getTrackPlayer();
      try { if (TrackPlayer) await TrackPlayer.play(); } catch {}
    }
    this.isPlaying = true;
    this.notifyCallbacks();
    this._persistState();
  }

  async stop(caller = 'unknown') {
    this._resumeGeneration++;
    this._userPaused = false;
    audioLog('STOP_CALLED', { caller });
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      await this.stopAvSound();
    } else {
      const TrackPlayer = getTrackPlayer();
      try { if (TrackPlayer) await TrackPlayer.reset(); } catch {}
    }
    this.isPlaying = false;
    this.position = 0;
    this.duration = 0;
    this._clearRestoreState();
    this.currentTrack = null;
    this.notifyCallbacks();
  }

  async seekTo(position: number) {
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      if (this.avSound) {
        try { await this.avSound.setPositionAsync(position * 1000); } catch {}
      }
    } else {
      const TrackPlayer = getTrackPlayer();
      try { if (TrackPlayer) await TrackPlayer.seekTo(position); } catch {}
    }
    this.position = Math.floor(position);
    this.notifyCallbacks();
  }

  async setVolume(volume: number) {
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      if (this.avSound) {
        try { await this.avSound.setVolumeAsync(volume); } catch {}
      }
    } else {
      const TrackPlayer = getTrackPlayer();
      try { if (TrackPlayer) await TrackPlayer.setVolume(volume); } catch {}
    }
  }

  onStatusUpdate(callback: StatusUpdateCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  setOnTrackFinished(callback: () => void) {
    this.onTrackFinishedCallback = callback;
  }

  clearOnTrackFinished() {
    this.onTrackFinishedCallback = null;
  }

  setRemoteTrackChangedCallback(callback: (track: BackgroundAudioTrack) => void) {
    this._onRemoteTrackChanged = callback;
  }

  clearRemoteTrackChangedCallback() {
    this._onRemoteTrackChanged = null;
  }

  async setRepeatMode(mode: 'off' | 'all' | 'one') {
    if (USE_EXPO_AV) return;
    const TrackPlayer = getTrackPlayer();
    const constants = getTrackPlayerConstants();
    if (!TrackPlayer || !constants) return;
    const { RepeatMode } = constants;
    const native = mode === 'one' ? RepeatMode.Track : mode === 'all' ? RepeatMode.Queue : RepeatMode.Off;
    try { await TrackPlayer.setRepeatMode(native); } catch {}
  }

  getCurrentTrack(): BackgroundAudioTrack | null {
    return this.currentTrack;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getPosition(): number {
    return this.position;
  }

  getDuration(): number {
    return this.duration;
  }

  private async _persistState() {
    if (!this.currentTrack) return;
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const state: AudioRestoreState = {
        track: this.currentTrack,
        position: this.position,
        isPlaying: this.isPlaying,
        savedAt: Date.now(),
        userPaused: this._userPaused,
      };
      await AS.setItem(STORAGE_KEY_RESTORE, JSON.stringify(state));
    } catch {}
  }

  private async _clearRestoreState() {
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      await AS.removeItem(STORAGE_KEY_RESTORE);
    } catch {}
  }

  private async _resumeAfterJsRestart() {
    const myGen = ++this._resumeGeneration;
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const raw = await AS.getItem(STORAGE_KEY_RESTORE);
      if (myGen !== this._resumeGeneration) { audioLog('JS_RESTART_CANCELLED_EARLY'); return; }
      if (!raw) {
        audioLog('JS_RESTART_NO_SAVED_TRACK');
        return;
      }
      const state: AudioRestoreState = JSON.parse(raw);
      const ageMs = Date.now() - (state.savedAt || 0);
      const duration = state.track.duration || 0;

      if (duration > 0) {
        // If we know the track length, use it to decide.
        // Only advance the estimate if it was actually playing (not user-paused or ducked).
        const estimatedPos = state.position + (state.isPlaying ? ageMs / 1000 : 0);
        if (estimatedPos >= duration) {
          audioLog('JS_RESTART_TRACK_LIKELY_ENDED', { estimatedPos: Math.round(estimatedPos), duration });
          await this._clearRestoreState();
          return;
        }
        // Track hasn't ended — restore regardless of how long we were away.
      } else if (ageMs > 30 * 60 * 1000) {
        // No duration info — fall back to a 30-minute window.
        audioLog('JS_RESTART_STATE_TOO_OLD', { ageMinutes: Math.round(ageMs / 60000) });
        return;
      }
      // Always restore UI state so the player shows the correct track.
      this.currentTrack = state.track;
      this.position = state.position;
      this.duration = state.track.duration || 0;

      if (!state.isPlaying) {
        // Track was not playing when last saved (user-paused or system-stopped).
        // Restore in paused state — never auto-resume. Auto-resuming system-paused
        // state caused unexpected auto-play on cold launch (app was killed and reopened).
        audioLog('JS_RESTART_PAUSED_RESTORE', { title: state.track.title, userPaused: state.userPaused });
        this.notifyCallbacks();

        // On iOS: load the track into the RNTP queue (if queue was cleared) so the
        // user can tap play without needing to reload — just don't start playback.
        if (!USE_EXPO_AV) {
          const TrackPlayer = getTrackPlayer();
          if (TrackPlayer) {
            await this.initialize();
            if (myGen !== this._resumeGeneration) return;
            try {
              const queue = await TrackPlayer.getQueue();
              if (!queue || queue.length === 0) {
                await TrackPlayer.add({ id: state.track.id, url: state.track.url, title: state.track.title, artist: state.track.artist, artwork: state.track.artwork, duration: state.track.duration });
                if (state.position > 0) await TrackPlayer.seekTo(state.position);
              }
            } catch (e) { audioLog('JS_RESTART_LOAD_ERR', String(e)); }
          }
        }
        return;
      }

      // Track was playing when last saved.
      audioLog('JS_RESTART_RESUMING', { title: state.track.title, position: state.position });

      if (USE_EXPO_AV) {
        // Android: expo-av sound is destroyed on JS restart — must reload and play.
        if (myGen !== this._resumeGeneration) { audioLog('JS_RESTART_CANCELLED'); return; }
        await this.playWithExpoAv(state.track);
        if (state.position > 0 && this.avSound) {
          try { await this.avSound.setPositionAsync(state.position * 1000); } catch {}
        }
        return;
      }

      const TrackPlayer = getTrackPlayer();
      if (!TrackPlayer) {
        audioLog('JS_RESTART_NO_TP_FALLBACK');
        await this.playWithExpoAv(state.track);
        return;
      }

      await this.initialize();
      if (myGen !== this._resumeGeneration) { audioLog('JS_RESTART_CANCELLED'); return; }

      try {
        const queue = await TrackPlayer.getQueue();
        if (myGen !== this._resumeGeneration) { audioLog('JS_RESTART_CANCELLED'); return; }

        if (queue && queue.length > 0) {
          // Native RNTP still has the track. On a background JS restart, native may
          // already be playing — PlaybackState events will sync isPlaying.
          // Do NOT call play(): that would also auto-play on a cold launch where
          // the native queue is still temporarily populated before RNTP cleans up.
          audioLog('JS_RESTART_TP_QUEUE_INTACT', { count: queue.length });
        } else {
          // Native queue was cleared (e.g. app was killed). Re-add at last position
          // so the user can resume with one tap, but do NOT auto-play.
          audioLog('JS_RESTART_TP_REQUEUE_PAUSED', { title: state.track.title, position: state.position });
          await TrackPlayer.add({ id: state.track.id, url: state.track.url, title: state.track.title, artist: state.track.artist, artwork: state.track.artwork, duration: state.track.duration });
          if (myGen !== this._resumeGeneration) { audioLog('JS_RESTART_CANCELLED'); return; }
          if (state.position > 0) await TrackPlayer.seekTo(state.position);
        }
        this.notifyCallbacks();
        audioLog('JS_RESTART_RESTORE_OK');
      } catch (err) {
        audioLog('JS_RESTART_TP_ERR', String(err));
      }
    } catch (err) {
      audioLog('JS_RESTART_RESUME_ERR', String(err));
    }
  }

  cleanup() {
    audioLog('CLEANUP');
    if (USE_EXPO_AV || !NativeModules.TrackPlayerModule) {
      this.stopAvSound();
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove?.();
      this.appStateSubscription = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.eventSubscriptions.forEach(sub => sub?.remove?.());
    this.eventSubscriptions = [];
    const TrackPlayer = getTrackPlayer();
    if (TrackPlayer && !USE_EXPO_AV) TrackPlayer.reset().catch(() => {});
    this.isInitialized = false;
  }
}

export const backgroundAudioService = new BackgroundAudioService();
