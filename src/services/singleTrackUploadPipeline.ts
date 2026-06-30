/**
 * Shared single-track upload validation, ACRCloud fingerprinting, and upload execution.
 * Used by TestUploadScreen (production upload UI).
 */
import { Audio } from 'expo-av';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { uploadAudioFile, uploadImage, createAudioTrack } from './UploadService';
import { collectDeviceInfo } from '../utils/deviceInfo';
import { invalidateQuotaCache, UploadQuota } from './UploadQuotaService';

export type ContentType = 'music' | 'podcast' | 'mixtape' | 'audio_book';
export type AcrcloudStatus = 'idle' | 'checking' | 'match' | 'no_match' | 'error';

export interface AudioFilePick {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface ImageFilePick {
  uri: string;
  name: string;
  type: string;
}

export interface SingleTrackFormState {
  contentType: ContentType;
  title: string;
  description: string;
  artistName: string;
  genre: string;
  moodTags: string[];
  episodeNumber: string;
  podcastCategory: string;
  djName: string;
  tracklist: string;
  narrator: string;
  chapterNumber: string;
  bookGenre: string;
  tags: string;
  lyrics: string;
  lyricsLanguage: string;
  privacy: 'public' | 'followers' | 'private';
  isPaid: boolean;
  price: string;
  currency: string;
  audioFile: AudioFilePick | null;
  coverImage: ImageFilePick | null;
}

export interface AcrcloudState {
  status: AcrcloudStatus;
  data: any | null;
}

export type IsrcVerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SingleTrackUploadContext {
  userId: string;
  session: Session;
  form: SingleTrackFormState;
  acrcloud: AcrcloudState;
  isCover: boolean;
  originalArtistName: string;
  originalSongTitle: string;
  isrcCode: string;
  isrcVerificationStatus: IsrcVerificationStatus;
  isOriginalConfirmed: boolean;
  agreedToCopyright: boolean;
  agreedToMixtapeTerms: boolean;
  audioDuration: number;
}

export function validateISRCFormat(isrc: string): { valid: boolean; normalized?: string; error?: string } {
  if (!isrc || typeof isrc !== 'string' || isrc.trim() === '') {
    return { valid: false, error: 'Please enter an ISRC code to verify, or leave the field blank.' };
  }
  const normalized = isrc.replace(/[-\s]/g, '').toUpperCase();
  if (normalized.length !== 12) {
    return { valid: false, error: 'Invalid ISRC — must be 12 characters, e.g. USRC12345678' };
  }
  if (!/^[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}[0-9]{5}$/.test(normalized)) {
    return { valid: false, error: 'Invalid ISRC format. Expected XX-XXX-YY-NNNNN, e.g. US-RC1-23-45678' };
  }
  return { valid: true, normalized };
}

export async function verifyISRCCode(params: {
  isrc: string;
  isCover: boolean;
  acrcloudStatus: AcrcloudStatus;
  acrcloudData: any | null;
}): Promise<{
  status: IsrcVerificationStatus;
  error: string | null;
  data: any | null;
}> {
  const { isrc, isCover, acrcloudStatus, acrcloudData } = params;
  if (!isrc?.trim()) {
    return { status: 'idle', error: null, data: null };
  }

  const formatCheck = validateISRCFormat(isrc);
  if (!formatCheck.valid) {
    const normalized = isrc.trim().replace(/[-\s]/g, '').toUpperCase();
    if (normalized.length < 12) {
      return { status: 'idle', error: null, data: null };
    }
    return { status: 'error', error: formatCheck.error || 'Invalid ISRC format', data: null };
  }

  const normalizedInput = isrc.trim().replace(/-/g, '').toUpperCase();

  if (acrcloudStatus === 'match' && acrcloudData?.detectedISRC) {
    const normalizedDetected = acrcloudData.detectedISRC.replace(/-/g, '').toUpperCase();
    if (normalizedInput !== normalizedDetected) {
      return {
        status: 'error',
        error: 'ISRC code does not match the detected track. Please enter the correct ISRC for this song.',
        data: null,
      };
    }
    return {
      status: 'success',
      error: null,
      data: {
        title: acrcloudData.detectedTitle || 'Verified Track',
        'artist-credit': acrcloudData.detectedArtist ? [{ name: acrcloudData.detectedArtist }] : [],
      },
    };
  }

  if (!isCover) {
    return { status: 'success', error: null, data: { title: 'ISRC format valid' } };
  }

  try {
    const response = await fetch(`${config.apiUrl}/api/upload/verify-isrc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isrc: isrc.trim() }),
    });
    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: text || 'ISRC verification failed' };
    }

    if (!response.ok) {
      return {
        status: 'error',
        error: data?.error || 'ISRC not found — make sure the original recording is released and distributed.',
        data: null,
      };
    }

    if (data?.success && data?.verified) {
      return { status: 'success', error: null, data: data.recording };
    }
    return {
      status: 'error',
      error: data?.error || 'ISRC not found — make sure the original recording is released and distributed.',
      data: null,
    };
  } catch (error: any) {
    return {
      status: 'error',
      error: error?.message || 'Failed to verify ISRC. Please try again.',
      data: null,
    };
  }
}

const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
  'audio/m4a', 'audio/x-m4a',
  'audio/aac', 'audio/ogg',
  'audio/webm', 'audio/flac',
];

export function getMaxAudioFileSize(contentType: ContentType): number {
  return contentType === 'mixtape' ? 200 * 1024 * 1024 : 100 * 1024 * 1024;
}

export function validateAudioFile(
  file: { name: string; size?: number; mimeType?: string; type?: string },
  contentType: ContentType,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxFileSize = getMaxAudioFileSize(contentType);
  const mimeType = file.mimeType || file.type;

  if (file.size && file.size > maxFileSize) {
    errors.push(`File size must be less than ${maxFileSize / (1024 * 1024)}MB`);
  }
  if (file.size && file.size < 1024 * 1024) {
    errors.push('File size is too small (minimum 1MB required)');
  }
  if (mimeType && !SUPPORTED_AUDIO_TYPES.includes(mimeType)) {
    errors.push('Unsupported file type. Please use MP3, WAV, M4A, AAC, OGG, or FLAC');
  }
  if (!mimeType) {
    const ext = file.name.toLowerCase().split('.').pop();
    const supportedExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];
    if (!ext || !supportedExts.includes(ext)) {
      errors.push('Unsupported file type. Please use MP3, WAV, M4A, AAC, OGG, or FLAC');
    }
  }
  return { isValid: errors.length === 0, errors };
}

export function validateSingleTrackForm(ctx: SingleTrackUploadContext): { isValid: boolean; errors: string[] } {
  const {
    form,
    acrcloud,
    isCover,
    originalArtistName,
    originalSongTitle,
    isrcCode,
    isrcVerificationStatus,
    isOriginalConfirmed,
    audioDuration,
  } = ctx;
  const errors: string[] = [];

  if (!form.audioFile) {
    return { isValid: false, errors: ['Please select an audio file to upload'] };
  }

  const audioValidation = validateAudioFile(form.audioFile, form.contentType);
  if (!audioValidation.isValid) errors.push(...audioValidation.errors);

  if (!form.title.trim()) {
    errors.push('Track title is required');
  } else if (form.title.trim().length < 2) {
    errors.push('Track title must be at least 2 characters long');
  } else if (form.title.trim().length > 100) {
    errors.push('Track title must be less than 100 characters');
  }

  if (form.contentType === 'music') {
    if (!form.artistName.trim()) errors.push('Artist name is required for music tracks');
    if (!form.genre) errors.push('Genre is required for music tracks');

    if (acrcloud.status === 'checking') {
      errors.push('Please wait for audio verification to complete');
    }
    if (acrcloud.status === 'match') {
      if (!originalArtistName.trim()) errors.push('Please enter the original artist name for this track.');
      if (!originalSongTitle.trim()) errors.push('Please enter the original song title for this track.');
      if (isrcCode.trim() && isrcVerificationStatus !== 'success') {
        errors.push('The ISRC code you entered could not be verified. Please check it or leave the field blank.');
      }
    }
    if (acrcloud.status === 'no_match') {
      if (!isCover && !isOriginalConfirmed) {
        errors.push('Please confirm this is your original/unreleased music');
      }
      if (isCover) {
        if (!originalArtistName.trim()) errors.push('Please enter the original artist name for this cover.');
        if (!originalSongTitle.trim()) errors.push('Please enter the original song title for this cover.');
      }
      if (isrcCode.trim() && isrcVerificationStatus === 'loading') {
        errors.push('Please wait for ISRC verification to complete');
      }
    }
    if (acrcloud.status === 'idle') {
      errors.push('Please wait for audio verification to complete');
    }
    if (isCover && acrcloud.status !== 'match' && isrcCode.trim() && isrcVerificationStatus === 'loading') {
      errors.push('Please wait for ISRC verification to complete');
    }
  } else if (form.contentType === 'podcast') {
    if (!form.episodeNumber) errors.push('Episode number is required for podcasts');
    if (!form.podcastCategory) errors.push('Podcast category is required');
  } else if (form.contentType === 'mixtape') {
    if (!form.djName.trim()) errors.push('DJ / Artist name is required');
    if (!form.tracklist.trim()) errors.push('Tracklist is required');
    if (!form.genre) errors.push('Genre is required for mixtapes');
  } else if (form.contentType === 'audio_book') {
    if (!form.bookGenre) errors.push('Book genre is required');
  }

  if (!form.coverImage) errors.push('Cover art is required');

  if (form.description.length > 2000) errors.push('Description must be less than 2000 characters');

  if (form.isPaid && form.price) {
    const p = parseFloat(form.price);
    if (Number.isNaN(p) || p <= 0) errors.push('Please enter a valid price for paid tracks');
  }

  return { isValid: errors.length === 0, errors };
}

export async function extractAudioDuration(uri: string): Promise<number> {
  try {
    const { sound, status } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    const durationMs = (status as { durationMillis?: number }).durationMillis ?? 0;
    await sound.unloadAsync();
    return Math.floor(durationMs / 1000);
  } catch {
    return 0;
  }
}

async function cleanupTempFile(filePath: string) {
  try {
    await supabase.storage.from('audio-tracks').remove([filePath]);
  } catch {
    // non-blocking
  }
}

export async function fingerprintAudioTrack(
  file: AudioFilePick,
  userId: string,
  session: Session | null,
  artistName: string,
): Promise<AcrcloudState & { errorMessage?: string }> {
  const FINGERPRINT_MAX_SIZE = 15 * 1024 * 1024;
  if (file.size && file.size > FINGERPRINT_MAX_SIZE) {
    return {
      status: 'no_match',
      data: { success: true, matchFound: false, requiresISRC: false, isUnreleased: true },
    };
  }

  let cleanupPath: string | null = null;
  try {
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const fileName = `fingerprint_${userId}_${Date.now()}.${fileExtension}`;
    const fileResponse = await fetch(file.uri);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(`temp/${fileName}`, fileBuffer, {
        contentType: file.type || 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    cleanupPath = uploadData.path;
    const { data: urlData } = supabase.storage.from('audio-tracks').getPublicUrl(uploadData.path);
    const storageUrl = urlData.publicUrl;

    const response = await fetch(`${config.apiUrl}/api/upload/fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: session ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify({
        audioFileUrl: storageUrl,
        artistName: artistName || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = JSON.parse(await response.text());

    if (!data.success) {
      const msg: string = data.error || '';
      if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('exceed')) {
        return {
          status: 'no_match',
          data: { success: true, matchFound: false, requiresISRC: false, isUnreleased: true },
        };
      }
      return {
        status: 'error',
        data: {
          success: false,
          matchFound: false,
          error: msg || 'Fingerprinting failed',
          errorCode: 'API_ERROR',
          requiresManualReview: true,
        },
        errorMessage: msg || 'Fingerprinting failed',
      };
    }

    if (data.matchFound) {
      return { status: 'match', data, errorMessage: undefined };
    }
    return {
      status: 'no_match',
      data: { success: true, matchFound: false, requiresISRC: false, isUnreleased: true },
      errorMessage: undefined,
    };
  } catch (error: any) {
    const msg = error?.message || 'Fingerprinting failed';
    if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('exceed')) {
      return {
        status: 'no_match',
        data: { success: true, matchFound: false, requiresISRC: false, isUnreleased: true },
      };
    }
    return {
      status: 'error',
      data: {
        success: false,
        matchFound: false,
        error: msg,
        errorCode: 'API_ERROR',
        requiresManualReview: true,
      },
      errorMessage: msg,
    };
  } finally {
    if (cleanupPath) await cleanupTempFile(cleanupPath);
  }
}

export async function executeSingleTrackUpload(
  ctx: SingleTrackUploadContext,
  onProgress?: (pct: number) => void,
): Promise<{ success: boolean; trackId?: string; error?: string }> {
  const { userId, session, form, acrcloud, isCover, originalArtistName, originalSongTitle, isrcCode, agreedToCopyright, audioDuration } = ctx;

  try {
    onProgress?.(10);
    const audioUploadResult = await uploadAudioFile(userId, form.audioFile!, {
      isMixtape: form.contentType === 'mixtape',
    });
    if (!audioUploadResult.success) {
      throw new Error(audioUploadResult.error?.message || 'Failed to upload audio file');
    }

    onProgress?.(50);
    let artworkUrl: string | null = null;
    if (form.coverImage) {
      onProgress?.(60);
      const imageUploadResult = await uploadImage(userId, form.coverImage, 'cover-art');
      if (imageUploadResult.success) {
        artworkUrl = imageUploadResult.data?.url ?? null;
      }
    }

    onProgress?.(80);
    const deviceInfo = collectDeviceInfo();
    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    let enhancedDescription = form.description.trim();
    if (form.contentType === 'music' && form.artistName.trim()) {
      enhancedDescription = enhancedDescription
        ? `Artist: ${form.artistName.trim()}\n\n${enhancedDescription}`
        : `Artist: ${form.artistName.trim()}`;
    } else if (form.contentType === 'podcast' && form.episodeNumber.trim()) {
      enhancedDescription = enhancedDescription
        ? `Episode ${form.episodeNumber.trim()}\n\n${enhancedDescription}`
        : `Episode ${form.episodeNumber.trim()}`;
    } else if (form.contentType === 'mixtape') {
      const parts: string[] = [];
      if (form.djName.trim()) parts.push(`Mixed by: ${form.djName.trim()}`);
      if (enhancedDescription) parts.push(enhancedDescription);
      if (form.tracklist.trim()) parts.push(`TRACKLIST:\n${form.tracklist.trim()}`);
      enhancedDescription = parts.join('\n\n');
    } else if (form.contentType === 'audio_book') {
      const parts: string[] = [];
      if (form.narrator.trim()) parts.push(`Narrated by: ${form.narrator.trim()}`);
      if (form.chapterNumber.trim()) parts.push(`Chapter: ${form.chapterNumber.trim()}`);
      if (enhancedDescription) parts.push(enhancedDescription);
      enhancedDescription = parts.join('\n\n');
    }

    const trackData = {
      title: form.title.trim(),
      description: enhancedDescription || null,
      file_url: audioUploadResult.data!.url,
      cover_art_url: artworkUrl,
      duration: audioDuration,
      file_size: form.audioFile?.size || 0,
      tags: tagsArray.length > 0 ? tagsArray.join(',') : null,
      is_public: form.privacy === 'public',
      visibility: form.privacy === 'public' ? 'public' as const : form.privacy === 'followers' ? 'followers_only' as const : 'private' as const,
      genre:
        form.contentType === 'music' ? form.genre
        : form.contentType === 'mixtape' ? form.genre
        : form.contentType === 'audio_book' ? form.bookGenre
        : form.podcastCategory,
      lyrics: form.lyrics.trim() || null,
      lyrics_language: form.lyricsLanguage,
      has_lyrics: form.lyrics.trim().length > 0,
      is_cover: form.contentType === 'music' ? (isCover || acrcloud.status === 'match') : false,
      original_artist_name: form.contentType === 'music' && (isCover || acrcloud.status === 'match') ? originalArtistName.trim() || null : null,
      original_song_title: form.contentType === 'music' && (isCover || acrcloud.status === 'match') ? originalSongTitle.trim() || null : null,
      isrc_code: form.contentType === 'music' && isrcCode.trim().length > 0 ? isrcCode.trim() : null,
      isrc_source: form.contentType === 'music' ? (
        acrcloud.data?.detectedISRC ? 'acrcloud_detected' :
        isrcCode.trim() ? 'user_provided' :
        'soundbridge_generated'
      ) : null,
      suspected_duplicate: form.contentType === 'music' && acrcloud.status === 'match' && !isCover,
      acrcloudData: form.contentType === 'music' ? acrcloud.data : null,
      copyright_attested: agreedToCopyright,
      attestation_timestamp: deviceInfo.agreedAt,
      attestation_user_agent: deviceInfo.userAgent,
      attestation_device_info: {
        platform: deviceInfo.devicePlatform,
        os: deviceInfo.deviceOS,
        appVersion: deviceInfo.appVersion,
        model: deviceInfo.deviceModel,
      },
      terms_version: deviceInfo.termsVersion,
      content_type: (form.contentType === 'audio_book' ? 'podcast' : form.contentType) as 'music' | 'podcast' | 'mixtape',
      is_mixtape: form.contentType === 'mixtape',
      is_paid: form.isPaid,
      price: form.isPaid && form.price ? parseFloat(form.price) : null,
      currency: form.isPaid ? form.currency : null,
      live_interest_enabled: form.contentType === 'music',
      mood_tags: form.contentType === 'music' && form.moodTags.length > 0 ? form.moodTags : null,
    } as Parameters<typeof createAudioTrack>[1];

    const trackResult = await createAudioTrack(userId, trackData);
    if (!trackResult.success) {
      throw new Error(trackResult.error?.message || 'Failed to create track record');
    }

    onProgress?.(100);

    if (trackResult.data?.id) {
      fetch(`${config.apiUrl}/api/tracks/${trackResult.data.id}/queue-notifications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => undefined);
    }

    invalidateQuotaCache();
    return { success: true, trackId: trackResult.data?.id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Upload failed' };
  }
}

export function buildQuotaBlockMessage(quota: UploadQuota): string {
  const tier = quota.tier?.toLowerCase() || 'free';
  if (tier === 'free') {
    return 'You\'ve reached your 250MB storage limit. Upgrade to Premium for 2GB or Unlimited for 10GB of storage.';
  }
  if (tier === 'premium') {
    return 'You\'ve uploaded 7 tracks this month. Your limit resets on your renewal date. Upgrade to Unlimited for unlimited uploads anytime.';
  }
  return 'You have reached your upload limit. Please upgrade to continue uploading.';
}
