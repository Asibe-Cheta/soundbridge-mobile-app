import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';

const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';
const CACHE_DIR = `${FileSystem.cacheDirectory}card-photos/`;
// v2 prefix busts any stale HF-era cached entries
const CACHE_KEY = (key: string) => `card_photo_v2_cache_${key}`;

interface CacheEntry {
  localUri: string;
  sourceUrl: string;
}

export async function getCardPhoto(
  userId: string,
  avatarUrl: string,
  onProgress?: (stage: 'checking' | 'processing' | 'done', error?: string) => void,
): Promise<string> {
  const API_KEY = config.removeBgApiKey;
  console.log('[BgRemoval] start. key:', API_KEY ? API_KEY.slice(0, 6) + '…' : 'MISSING');

  onProgress?.('checking');

  if (!API_KEY) {
    console.warn('[BgRemoval] No API key');
    onProgress?.('done', 'No API key configured');
    return avatarUrl;
  }

  // Check local cache first
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(userId));
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      if (entry.sourceUrl === avatarUrl) {
        const info = await FileSystem.getInfoAsync(entry.localUri);
        if (info.exists && (info as any).size > 1000 && await isValidPng(entry.localUri)) {
          console.log('[BgRemoval] cache hit:', entry.localUri);
          onProgress?.('done');
          return entry.localUri;
        }
      }
      await AsyncStorage.removeItem(CACHE_KEY(userId)).catch(() => {});
    }
  } catch {}

  onProgress?.('processing');

  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});

  // Download avatar locally so we can upload as a file
  const tmpPath = `${CACHE_DIR}tmp_${userId}.jpg`;
  try {
    await FileSystem.downloadAsync(avatarUrl, tmpPath);
  } catch (e) {
    const msg = `Download failed: ${e}`;
    console.warn('[BgRemoval]', msg);
    onProgress?.('done', msg);
    return avatarUrl;
  }

  // Use React Native FormData with file URI — the correct way to upload binary in RN
  const formData = new FormData();
  formData.append('image_file', {
    uri: tmpPath,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  formData.append('size', 'auto');

  let response: Response;
  try {
    response = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        // Do NOT set Content-Type — fetch sets it automatically with the multipart boundary
      },
      body: formData,
    });
  } catch (e) {
    const msg = `Network error: ${e}`;
    console.warn('[BgRemoval]', msg);
    onProgress?.('done', msg);
    return avatarUrl;
  }

  const contentType = response.headers.get('content-type') ?? '';
  console.log('[BgRemoval] status:', response.status, 'content-type:', contentType);

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const msg = `API error ${response.status}: ${errText.slice(0, 120)}`;
    console.warn('[BgRemoval]', msg);
    onProgress?.('done', msg);
    return avatarUrl;
  }

  // Response is a transparent PNG — convert to base64 and save
  const resultBuffer = await response.arrayBuffer();
  const resultBase64 = arrayBufferToBase64(resultBuffer);

  const localUri = `${CACHE_DIR}card_${userId}.png`;
  await FileSystem.writeAsStringAsync(localUri, resultBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const entry: CacheEntry = { localUri, sourceUrl: avatarUrl };
  await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(entry)).catch(() => {});

  // Fire-and-forget: persist to Supabase for cross-device access
  uploadToSupabase(localUri, userId).catch(() => {});

  onProgress?.('done');
  return localUri;
}

async function isValidPng(uri: string): Promise<boolean> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 12,
      position: 0,
    } as any);
    const bytes = atob(b64);
    return bytes.charCodeAt(0) === 0x89 && bytes.charCodeAt(1) === 0x50;
  } catch {
    return false;
  }
}

async function uploadToSupabase(localUri: string, userId: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `card-photos/${userId}.png`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/png', upsert: true });

  if (!error) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await (supabase
      .from('profiles')
      .update({ card_photo_url: data.publicUrl } as any)
      .eq('id', userId) as any).catch(() => {});
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}
