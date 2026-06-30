import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { audioLog } from '../lib/audioDebugLog';

export const IOS_PLAY_CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}tp_play_cache/`;

const KNOWN_AUDIO_EXT = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'mp4', 'caf', 'aiff']);

export function isLocalPlayUrl(url: string): boolean {
  return url.startsWith('file://') || (url.startsWith('/') && !url.startsWith('//'));
}

export function normalizeTrackPlayerUrl(pathOrUri: string): string {
  if (pathOrUri.startsWith('http')) return pathOrUri;
  if (pathOrUri.startsWith('file://')) return pathOrUri;
  return `file://${pathOrUri}`;
}

/** iOS AVPlayer needs a real extension (mp3/m4a) — `.audio` files fail with PlaybackError. */
export function extensionFromHttpUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const part = pathname.split('.').pop()?.toLowerCase();
    if (part && KNOWN_AUDIO_EXT.has(part)) return part;
  } catch {}
  return 'mp3';
}

export function cachedPlayPathForId(trackId: string, httpUrl?: string): string {
  const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = httpUrl ? extensionFromHttpUrl(httpUrl) : 'mp3';
  return `${IOS_PLAY_CACHE_DIR}${safeId}.${ext}`;
}

export function getHttpSourceUrl(track: { url: string; streamUrl?: string }): string | null {
  if (track.streamUrl?.startsWith('http')) return track.streamUrl;
  if (track.url.startsWith('http')) return track.url;
  return null;
}

export async function deleteCachedTrack(trackId: string, httpUrl?: string): Promise<void> {
  try {
    const primary = cachedPlayPathForId(trackId, httpUrl);
    await FileSystem.deleteAsync(primary, { idempotent: true });
    // Remove legacy `.audio` caches from earlier builds.
    const legacy = `${IOS_PLAY_CACHE_DIR}${trackId.replace(/[^a-zA-Z0-9_-]/g, '_')}.audio`;
    await FileSystem.deleteAsync(legacy, { idempotent: true });
  } catch {}
}

/** Resolve HTTP stream to a local file on iOS (blocking download on first play). */
export async function resolveIOSPlayUrl(track: { id: string; url: string }): Promise<string> {
  if (Platform.OS !== 'ios' || !track.url.startsWith('http')) {
    return normalizeTrackPlayerUrl(track.url);
  }
  try {
    await FileSystem.makeDirectoryAsync(IOS_PLAY_CACHE_DIR, { intermediates: true });
    const localPath = cachedPlayPathForId(track.id, track.url);
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && 'size' in info && (info.size ?? 0) > 1024) {
      audioLog('PLAY_CACHE_HIT', { id: track.id, size: info.size, path: localPath.slice(-40) });
      return normalizeTrackPlayerUrl(localPath);
    }
    await deleteCachedTrack(track.id, track.url);
    audioLog('PLAY_CACHE_DOWNLOAD', { id: track.id });
    const result = await FileSystem.downloadAsync(track.url, localPath);
    const downloaded = await FileSystem.getInfoAsync(localPath);
    if (!downloaded.exists || !('size' in downloaded) || (downloaded.size ?? 0) < 1024) {
      throw new Error(`Cache download too small (${downloaded.size ?? 0} bytes)`);
    }
    audioLog('PLAY_CACHE_READY', { id: track.id, size: downloaded.size, uri: result.uri });
    return normalizeTrackPlayerUrl(result.uri || localPath);
  } catch (e) {
    audioLog('PLAY_CACHE_FAIL', String(e));
    return track.url;
  }
}

/** For resume/headless: prefer cached file without downloading in background. */
export async function resolvePlayUrlForRestore(track: {
  id: string;
  url: string;
  streamUrl?: string;
}): Promise<string> {
  if (Platform.OS !== 'ios') return track.url;
  if (isLocalPlayUrl(track.url)) return normalizeTrackPlayerUrl(track.url);

  const http = getHttpSourceUrl(track);
  if (!http) return normalizeTrackPlayerUrl(track.url);

  try {
    const localPath = cachedPlayPathForId(track.id, http);
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && 'size' in info && (info.size ?? 0) > 1024) {
      audioLog('PLAY_CACHE_RESTORE_HIT', { id: track.id, size: info.size });
      return normalizeTrackPlayerUrl(localPath);
    }
    audioLog('PLAY_CACHE_RESTORE_MISS', { id: track.id });
  } catch (e) {
    audioLog('PLAY_CACHE_RESTORE_ERR', String(e));
  }
  return http;
}
