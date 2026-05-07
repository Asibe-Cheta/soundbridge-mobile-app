import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';

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

// ✅ CORRECT bucket names as per web team response
const BUCKETS = {
  AUDIO: 'audio-tracks',        // ✅ Changed from 'audio-files'
  COVER_ART: 'cover-art',       // ✅ Changed from 'artwork'
  PROFILE_IMAGES: 'profile-images', // ✅ Changed from 'avatars'
  EVENT_IMAGES: 'event-images',
  POST_ATTACHMENTS: 'post-attachments',
} as const;

// File size limits (as per web team response)
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_MIXTAPE_SIZE = 200 * 1024 * 1024; // 200MB for DJ mixes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB (changed from 10MB)

// Supported file types (as per web team response)
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
 * Upload audio file to Supabase Storage
 */
export async function uploadAudioFile(
  userId: string,
  audioFile: UploadFile,
  options?: { isMixtape?: boolean }
): Promise<UploadResult> {
  try {
    if (!audioFile || !audioFile.uri) {
      return {
        success: false,
        error: { message: 'No audio file provided' },
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: { message: 'Not authenticated' },
      };
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return {
        success: false,
        error: { message: 'Invalid audio file type. Supported: MP3, WAV, M4A, AAC, OGG, FLAC' },
      };
    }

    // Get file info to check size (React Native doesn't support response.blob())
    const fileInfo = await FileSystem.getInfoAsync(audioFile.uri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: { message: 'File does not exist' },
      };
    }

    // Validate file size
    const sizeLimit = options?.isMixtape ? MAX_MIXTAPE_SIZE : MAX_AUDIO_SIZE;
    if (fileInfo.size && fileInfo.size > sizeLimit) {
      return {
        success: false,
        error: { message: `Audio file must be less than ${sizeLimit / (1024 * 1024)}MB` },
      };
    }

    // Generate unique filename - ✅ Use underscore format: ${userId}/${timestamp}_${filename}
    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${userId}/${Date.now()}_${sanitizedFileName}`;

    // Stream file directly to Supabase Storage using FileSystem.uploadAsync.
    // Avoids loading the entire file into memory (critical for large mixtapes — a 66MB
    // file would otherwise require ~200MB RAM for base64 + decode + Uint8Array, and the
    // JS decode loop alone can exceed the OS network timeout before upload even starts).
    const storageUploadUrl = `${config.supabaseUrl}/storage/v1/object/${BUCKETS.AUDIO}/${fileName}`;
    const uploadResponse = await FileSystem.uploadAsync(storageUploadUrl, audioFile.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType: audioFile.type,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabaseAnonKey,
        'Content-Type': audioFile.type,
        'x-upsert': 'false',
        'cache-control': '3600',
      },
    });

    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      let errMsg = 'Failed to upload audio file';
      try {
        const body = JSON.parse(uploadResponse.body);
        errMsg = body.message || body.error || errMsg;
      } catch (_) {}
      console.error('Error uploading audio file:', uploadResponse.status, uploadResponse.body);
      return {
        success: false,
        error: { message: errMsg },
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS.AUDIO)
      .getPublicUrl(fileName);

    console.log('✅ Audio file uploaded successfully:', publicUrl);

    return {
      success: true,
      data: {
        url: publicUrl,
        path: fileName,
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
 * Upload image file to Supabase Storage
 */
export async function uploadImage(
  userId: string,
  imageFile: UploadFile,
  folder: string = 'cover-art'
): Promise<UploadResult> {
  try {
    if (!imageFile || !imageFile.uri) {
      return {
        success: false,
        error: { message: 'No image file provided' },
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: { message: 'Not authenticated' },
      };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return {
        success: false,
        error: { message: 'Invalid image file type. Supported: JPG, PNG, WEBP, AVIF' },
      };
    }

    // Get file info to check size (React Native doesn't support response.blob())
    const fileInfo = await FileSystem.getInfoAsync(imageFile.uri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: { message: 'File does not exist' },
      };
    }

    // Validate file size - ✅ 5MB limit (changed from 10MB)
    if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: { message: `Image file must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` },
      };
    }

    // Determine bucket based on folder
    let bucket: string;
    if (folder === 'cover-art' || folder === 'artwork' || folder === 'album-covers') {
      bucket = BUCKETS.COVER_ART; // ✅ 'cover-art'
    } else if (folder === 'profile' || folder === 'avatar') {
      bucket = BUCKETS.PROFILE_IMAGES; // ✅ 'profile-images'
    } else if (folder === 'event') {
      bucket = BUCKETS.EVENT_IMAGES;
    } else if (folder === 'post-attachments' || folder === 'dispute') {
      bucket = BUCKETS.POST_ATTACHMENTS;
    } else {
      bucket = BUCKETS.COVER_ART; // Default to cover-art
    }

    // Generate unique filename - ✅ Use underscore format: ${userId}/${timestamp}_${filename}
    const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = folder === 'album-covers'
      ? `${userId}/album-covers/${Date.now()}_${sanitizedFileName}`
      : `${userId}/${Date.now()}_${sanitizedFileName}`;

    // Stream directly to Supabase Storage (avoids base64 + decode overhead)
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
      return {
        success: false,
        error: { message: errMsg },
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log('✅ Image uploaded successfully:', publicUrl);

    return {
      success: true,
      data: {
        url: publicUrl,
        path: fileName,
      },
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
 * Create audio track record in database with copyright attestation
 */
export async function createAudioTrack(
  userId: string,
  trackData: {
    title: string;
    description?: string | null;
    file_url: string;
    cover_art_url?: string | null;
    duration?: number;
    file_size?: number; // File size in bytes for storage tracking
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
    // Copyright attestation fields
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
      return {
        success: false,
        error: { message: 'Not authenticated' },
      };
    }

    const basePayload = {
      creator_id: userId,
      title: trackData.title,
      description: trackData.description || null,
      file_url: trackData.file_url,
      cover_art_url: trackData.cover_art_url || null,
      artwork_url: trackData.cover_art_url || null, // Also set artwork_url for compatibility
      duration: trackData.duration || null,
      file_size: trackData.file_size || 0, // Store file size for storage quota tracking
      tags: trackData.tags ? trackData.tags.split(',').map(t => t.trim()) : null,
      is_public: trackData.is_public ?? true,
      visibility: trackData.visibility || 'public',
      genre: trackData.genre || null,
      lyrics: trackData.lyrics || null,
      lyrics_language: trackData.lyrics_language || null,
      has_lyrics: trackData.has_lyrics || false,
      // Content type — determines which Discover tab this appears under
      content_type: trackData.content_type || 'music',
      // Mixtape flag
      is_mixtape: trackData.is_mixtape || false,
      // Paid content fields
      is_paid: trackData.is_paid || false,
      price: trackData.price ?? null,
      currency: trackData.currency ?? null,
      // Copyright attestation fields
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
        // If content_type column doesn't exist yet, strip it and retry
        if (insertResult.error && (insertResult.error?.message || '').includes('content_type')) {
          console.warn('⚠️ content_type column not available, retrying without it');
          const { content_type: _ct, ...payloadWithoutContentType } = basePayload as any;
          insertResult = await attemptInsert(payloadWithoutContentType);
        }
        // If visibility column doesn't exist yet, strip it and retry
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
      return {
        success: false,
        error: { message: error.message || 'Failed to create track record' },
      };
    }

    console.log('✅ Audio track created successfully:', data.id);

    // Auto-assign a PPL ISRC (GB-KTZ) for original music tracks with no user-provided ISRC
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

    // If copyright was attested, record in audit trail
    if (trackData.copyright_attested && trackData.attestation_device_info) {
      try {
        await supabase.rpc('record_upload_attestation', {
          p_track_id: data.id,
          p_user_id: userId,
          p_ip_address: null, // Backend will capture this
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
        // Don't fail the upload if attestation recording fails
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
      error: { message: error.message || 'Failed to create track record' },
    };
  }
}

