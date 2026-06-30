import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { getApiBaseUrl } from '../lib/apiClient';

interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

interface UploadResult {
  success: boolean;
  data?: {
    url: string;
    path: string;
  };
  error?: {
    message: string;
  };
}

// Storage layout:
//   Audio tracks  → Cloudflare R2  (new uploads via presign endpoint)
//   Images        → Supabase Storage (unchanged)
//   Post audio    → Supabase Storage post-attachments (unchanged)
//
// Legacy audio URLs on Supabase Storage (audio-tracks bucket) remain valid for
// playback; the distribution backend handles R2 vs Supabase detection server-side.
const BUCKETS = {
  COVER_ART: 'cover-art',
  PROFILE_IMAGES: 'profile-images',
  EVENT_IMAGES: 'event-images',
  POST_ATTACHMENTS: 'post-attachments',
} as const;

// File size limits
const MAX_AUDIO_SIZE = 100 * 1024 * 1024;    // 100 MB
const MAX_MIXTAPE_SIZE = 200 * 1024 * 1024;  // 200 MB — requires mixtape flag on presign
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;      // 5 MB

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

/**
 * Upload audio file to Cloudflare R2 via a presigned PUT URL.
 *
 * Flow:
 *   1. POST /api/upload/audio-file/presign  → get uploadUrl + public url
 *   2. PUT uploadUrl with raw file bytes (Content-Type header only)
 *   3. Return presign.url — this is the public R2 URL to store in audio_tracks.file_url
 */
export async function uploadAudioFile(
  userId: string,
  audioFile: UploadFile,
  options?: { isMixtape?: boolean }
): Promise<UploadResult> {
  try {
    if (!audioFile || !audioFile.uri) {
      return { success: false, error: { message: 'No audio file provided' } };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return {
        success: false,
        error: { message: 'Invalid audio file type. Supported: MP3, WAV, M4A, AAC, OGG, FLAC' },
      };
    }

    const fileInfo = await FileSystem.getInfoAsync(audioFile.uri);
    if (!fileInfo.exists) {
      return { success: false, error: { message: 'File does not exist' } };
    }

    const sizeLimit = options?.isMixtape ? MAX_MIXTAPE_SIZE : MAX_AUDIO_SIZE;
    if (fileInfo.size && fileInfo.size > sizeLimit) {
      return {
        success: false,
        error: { message: `Audio file must be less than ${sizeLimit / (1024 * 1024)}MB` },
      };
    }

    // Step 1 — Request a presigned PUT URL from the backend
    const presignBody: Record<string, unknown> = {
      fileName: audioFile.name,
      // fileSize must be a positive integer (server rejects non-integers)
      fileSize: fileInfo.size ? Math.floor(fileInfo.size) : 0,
      contentType: audioFile.type,
    };
    if (options?.isMixtape) {
      presignBody.is_mixtape = true;
    }

    const presignRes = await fetch(`${getApiBaseUrl()}/api/upload/audio-file/presign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(presignBody),
    });

    if (!presignRes.ok) {
      let errMsg = 'Failed to get upload URL';
      try {
        const body = await presignRes.json();
        errMsg = body.error || errMsg;
      } catch (_) {}
      // 429 = rate limit (5 presign requests per minute per user)
      if (presignRes.status === 429) {
        errMsg = 'Upload limit reached. Please wait a moment and try again.';
      }
      console.error('Presign failed:', presignRes.status, errMsg);
      return { success: false, error: { message: errMsg } };
    }

    const presignData = await presignRes.json();
    const { uploadUrl, url: publicUrl, contentType: signedContentType } = presignData;

    if (!uploadUrl || !publicUrl) {
      return { success: false, error: { message: 'Upload service returned an invalid response. Please try again.' } };
    }

    // Step 2 — Stream file bytes directly to R2 via the presigned PUT URL.
    // Only Content-Type is allowed — extra headers (Authorization, x-amz-*) will
    // break the SigV4 query-string signature on the presigned URL.
    const putResponse = await FileSystem.uploadAsync(uploadUrl, audioFile.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType: audioFile.type,
      headers: {
        'Content-Type': signedContentType || audioFile.type,
      },
    });

    if (putResponse.status < 200 || putResponse.status >= 300) {
      let errMsg = 'Failed to upload audio file';
      try {
        const body = JSON.parse(putResponse.body);
        errMsg = body.message || body.error || errMsg;
      } catch (_) {}
      console.error('R2 PUT failed:', putResponse.status, putResponse.body);
      return { success: false, error: { message: errMsg } };
    }

    console.log('✅ Audio uploaded to R2:', publicUrl);

    // publicUrl is the final R2 public URL — store this as audio_tracks.file_url
    return {
      success: true,
      data: {
        url: publicUrl,
        path: presignData.objectKey || '',
      },
    };
  } catch (error: any) {
    console.error('Error uploading audio file:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to upload audio file' },
    };
  }
}

/**
 * Upload image file to Supabase Storage.
 * Images remain on Supabase — only audio moved to R2.
 */
export async function uploadImage(
  userId: string,
  imageFile: UploadFile,
  folder: string = 'cover-art'
): Promise<UploadResult> {
  try {
    if (!imageFile || !imageFile.uri) {
      return { success: false, error: { message: 'No image file provided' } };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return { success: false, error: { message: 'Invalid image file type. Supported: JPG, PNG, WEBP, AVIF' } };
    }

    const fileInfo = await FileSystem.getInfoAsync(imageFile.uri);
    if (!fileInfo.exists) {
      return { success: false, error: { message: 'File does not exist' } };
    }

    if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: { message: `Image file must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` },
      };
    }

    let bucket: string;
    if (folder === 'cover-art' || folder === 'artwork' || folder === 'album-covers') {
      bucket = BUCKETS.COVER_ART;
    } else if (folder === 'profile' || folder === 'avatar') {
      bucket = BUCKETS.PROFILE_IMAGES;
    } else if (folder === 'event') {
      bucket = BUCKETS.EVENT_IMAGES;
    } else if (folder === 'post-attachments' || folder === 'dispute') {
      bucket = BUCKETS.POST_ATTACHMENTS;
    } else {
      bucket = BUCKETS.COVER_ART;
    }

    const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = folder === 'album-covers'
      ? `${userId}/album-covers/${Date.now()}_${sanitizedFileName}`
      : `${userId}/${Date.now()}_${sanitizedFileName}`;

    const storageUploadUrl = `${config.supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;

    const uploadResponse = await FileSystem.uploadAsync(storageUploadUrl, imageFile.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType: imageFile.type,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabaseAnonKey,
        'Content-Type': imageFile.type,
        'x-upsert': 'false',
        'cache-control': '3600',
      },
    });

    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      let errMsg = 'Failed to upload image';
      try {
        const body = JSON.parse(uploadResponse.body);
        errMsg = body.message || body.error || errMsg;
      } catch (_) {}
      console.error('Error uploading image:', uploadResponse.status, uploadResponse.body);
      return { success: false, error: { message: errMsg } };
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    console.log('✅ Image uploaded to Supabase Storage:', publicUrl);

    return {
      success: true,
      data: { url: publicUrl, path: fileName },
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to upload image' },
    };
  }
}

/**
 * Create audio track record in database with copyright attestation.
 */
export async function createAudioTrack(
  userId: string,
  trackData: {
    title: string;
    description?: string | null;
    file_url: string;
    cover_art_url?: string | null;
    duration?: number;
    file_size?: number;
    tags?: string | null;
    is_public?: boolean;
    genre?: string | null;
    lyrics?: string | null;
    lyrics_language?: string;
    has_lyrics?: boolean;
    is_cover?: boolean;
    isrc_code?: string | null;
    isrc_source?: 'acrcloud_detected' | 'user_provided' | 'soundbridge_generated' | null;
    visibility?: 'public' | 'followers_only' | 'private';
    acrcloudData?: any | null;
    content_type?: 'music' | 'podcast' | 'mixtape';
    is_mixtape?: boolean;
    is_paid?: boolean;
    price?: number | null;
    currency?: string | null;
    copyright_attested?: boolean;
    attestation_timestamp?: string;
    attestation_user_agent?: string;
    attestation_device_info?: {
      platform: string;
      os: string;
      appVersion: string;
      model?: string;
    };
    terms_version?: string;
  }
): Promise<UploadResult & { data?: { id: string } }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    const basePayload = {
      creator_id: userId,
      title: trackData.title,
      description: trackData.description || null,
      file_url: trackData.file_url,
      cover_art_url: trackData.cover_art_url || null,
      artwork_url: trackData.cover_art_url || null,
      duration: trackData.duration || null,
      file_size: trackData.file_size || 0,
      tags: trackData.tags ? trackData.tags.split(',').map(t => t.trim()) : null,
      is_public: trackData.is_public ?? true,
      visibility: trackData.visibility || 'public',
      genre: trackData.genre || null,
      lyrics: trackData.lyrics || null,
      lyrics_language: trackData.lyrics_language || null,
      has_lyrics: trackData.has_lyrics || false,
      content_type: trackData.content_type || 'music',
      is_mixtape: trackData.is_mixtape || false,
      is_paid: trackData.is_paid || false,
      price: trackData.price ?? null,
      currency: trackData.currency ?? null,
      copyright_attested: trackData.copyright_attested || false,
      attestation_timestamp: trackData.attestation_timestamp || null,
      attestation_user_agent: trackData.attestation_user_agent || null,
      attestation_device_info: trackData.attestation_device_info || null,
      terms_version: trackData.terms_version || 'v1.0.0',
    };

    const hasAcrcloudData = !!trackData.acrcloudData;
    const extendedPayload = {
      ...basePayload,
      ...(trackData.is_cover !== undefined && { is_cover: trackData.is_cover }),
      ...(trackData.isrc_code !== undefined && { isrc_code: trackData.isrc_code }),
      ...(trackData.isrc_source != null && { isrc_source: trackData.isrc_source }),
      ...(hasAcrcloudData && {
        acrcloud_checked: true,
        acrcloud_match_found: trackData.acrcloudData?.matchFound ?? null,
        acrcloud_detected_artist: trackData.acrcloudData?.detectedArtist ?? null,
        acrcloud_detected_title: trackData.acrcloudData?.detectedTitle ?? null,
        acrcloud_detected_isrc: trackData.acrcloudData?.detectedISRC ?? null,
        acrcloud_detected_album: trackData.acrcloudData?.detectedAlbum ?? null,
        acrcloud_detected_label: trackData.acrcloudData?.detectedLabel ?? null,
        acrcloud_checked_at: new Date().toISOString(),
        acrcloud_response_data: trackData.acrcloudData ?? null,
      }),
    };

    const insertPayload = hasAcrcloudData || trackData.is_cover !== undefined || trackData.isrc_code !== undefined
      ? extendedPayload
      : basePayload;

    const attemptInsert = async (payload: typeof basePayload) => {
      return supabase
        .from('audio_tracks')
        .insert(payload)
        .select('id')
        .single();
    };

    let insertResult = await attemptInsert(insertPayload as typeof basePayload);

    if (insertResult.error) {
      const message = insertResult.error?.message || '';
      const missingColumn = insertResult.error?.code === 'PGRST204' || message.includes('does not exist');
      if (missingColumn) {
        if (insertPayload !== basePayload) {
          console.warn('⚠️ ACRCloud columns not available, retrying without extended fields');
          insertResult = await attemptInsert(basePayload);
        }
        if (insertResult.error && (insertResult.error?.message || '').includes('content_type')) {
          console.warn('⚠️ content_type column not available, retrying without it');
          const { content_type: _ct, ...payloadWithoutContentType } = basePayload as any;
          insertResult = await attemptInsert(payloadWithoutContentType);
        }
        if (insertResult.error && (insertResult.error?.message || '').includes('visibility')) {
          console.warn('⚠️ visibility column not available, retrying without it');
          const { visibility: _v, content_type: _ct2, ...payloadWithoutNew } = basePayload as any;
          insertResult = await attemptInsert(payloadWithoutNew);
        }
      }
    }

    const { data, error } = insertResult;

    if (error) {
      console.error('Error creating audio track:', error);
      return { success: false, error: { message: error.message || 'Failed to create track record' } };
    }

    console.log('✅ Audio track created successfully:', data.id);

    if (
      trackData.content_type === 'music' &&
      !trackData.is_cover &&
      !trackData.isrc_code &&
      trackData.isrc_source === 'soundbridge_generated'
    ) {
      try {
        await supabase.rpc('assign_soundbridge_isrc', { p_track_id: data.id });
        console.log('✅ ISRC auto-assigned via PPL sequence');
      } catch {
        console.warn('⚠️ ISRC auto-assignment failed — not blocking upload');
      }
    }

    if (trackData.copyright_attested && trackData.attestation_device_info) {
      try {
        await supabase.rpc('record_upload_attestation', {
          p_track_id: data.id,
          p_user_id: userId,
          p_ip_address: null,
          p_user_agent: trackData.attestation_user_agent || null,
          p_device_platform: trackData.attestation_device_info.platform || 'unknown',
          p_device_os: trackData.attestation_device_info.os || 'unknown',
          p_app_version: trackData.attestation_device_info.appVersion || '1.0.0',
          p_device_model: trackData.attestation_device_info.model || null,
          p_terms_version: trackData.terms_version || 'v1.0.0',
        });
        console.log('✅ Copyright attestation recorded in audit trail');
      } catch (attestationError) {
        console.warn('⚠️ Failed to record attestation in audit trail:', attestationError);
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        url: trackData.file_url,
        path: '',
      },
    };
  } catch (error: any) {
    console.error('Error creating audio track:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create audio track' },
    };
  }
}
