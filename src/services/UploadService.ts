import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

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
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB (changed from 10MB)

// Supported file types (as per web team response)
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
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
  audioFile: UploadFile
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
    if (fileInfo.size && fileInfo.size > MAX_AUDIO_SIZE) {
      return {
        success: false,
        error: { message: `Audio file must be less than ${MAX_AUDIO_SIZE / (1024 * 1024)}MB` },
      };
    }

    // Read file as base64 (React Native compatible)
    const base64 = await FileSystem.readAsStringAsync(audioFile.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array for Supabase (React Native compatible)
    // Manual base64 decoding that works in React Native
    const binaryString = Platform.OS === 'web' 
      ? atob(base64)
      : (() => {
          // Manual base64 decode for React Native
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          let result = '';
          let i = 0;
          const base64Clean = base64.replace(/[^A-Za-z0-9\+\/]/g, '');
          while (i < base64Clean.length) {
            const encoded1 = chars.indexOf(base64Clean.charAt(i++));
            const encoded2 = chars.indexOf(base64Clean.charAt(i++));
            const encoded3 = chars.indexOf(base64Clean.charAt(i++));
            const encoded4 = chars.indexOf(base64Clean.charAt(i++));
            const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
            result += String.fromCharCode((bitmap >> 16) & 255);
            if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
            if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
          }
          return result;
        })();
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename - ✅ Use underscore format: ${userId}/${timestamp}_${filename}
    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${userId}/${Date.now()}_${sanitizedFileName}`;

    // Upload to Supabase Storage - ✅ Use 'audio-tracks' bucket
    // Supabase Storage accepts Uint8Array directly in React Native
    const { data, error } = await supabase.storage
      .from(BUCKETS.AUDIO)
      .upload(fileName, bytes, {
        contentType: audioFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading audio file:', error);
      return {
        success: false,
        error: { message: error.message || 'Failed to upload audio file' },
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

    // Read file as base64 (React Native compatible)
    const base64 = await FileSystem.readAsStringAsync(imageFile.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array for Supabase (React Native compatible)
    // Manual base64 decoding that works in React Native
    const binaryString = Platform.OS === 'web' 
      ? atob(base64)
      : (() => {
          // Manual base64 decode for React Native
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          let result = '';
          let i = 0;
          let base64Clean = base64.replace(/[^A-Za-z0-9\+\/]/g, '');
          while (i < base64Clean.length) {
            const encoded1 = chars.indexOf(base64Clean.charAt(i++));
            const encoded2 = chars.indexOf(base64Clean.charAt(i++));
            const encoded3 = chars.indexOf(base64Clean.charAt(i++));
            const encoded4 = chars.indexOf(base64Clean.charAt(i++));
            const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
            result += String.fromCharCode((bitmap >> 16) & 255);
            if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
            if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
          }
          return result;
        })();
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine bucket based on folder
    let bucket: string;
    if (folder === 'cover-art' || folder === 'artwork') {
      bucket = BUCKETS.COVER_ART; // ✅ 'cover-art'
    } else if (folder === 'profile' || folder === 'avatar') {
      bucket = BUCKETS.PROFILE_IMAGES; // ✅ 'profile-images'
    } else if (folder === 'event') {
      bucket = BUCKETS.EVENT_IMAGES;
    } else {
      bucket = BUCKETS.COVER_ART; // Default to cover-art
    }

    // Generate unique filename - ✅ Use underscore format: ${userId}/${timestamp}_${filename}
    const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = folder === 'cover-art' || folder === 'artwork'
      ? `${userId}/${Date.now()}_${sanitizedFileName}` // No subfolder for cover-art
      : `${userId}/${Date.now()}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    // Supabase Storage accepts Uint8Array directly in React Native
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, bytes, {
        contentType: imageFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: { message: error.message || 'Failed to upload image' },
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
 * Create audio track record in database
 */
export async function createAudioTrack(
  userId: string,
  trackData: {
    title: string;
    description?: string | null;
    file_url: string;
    cover_art_url?: string | null;
    duration?: number;
    tags?: string | null;
    is_public?: boolean;
    genre?: string | null;
    lyrics?: string | null;
    lyrics_language?: string;
    has_lyrics?: boolean;
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

    // Insert track into database
    const { data, error } = await supabase
      .from('audio_tracks')
      .insert({
        creator_id: userId,
        title: trackData.title,
        description: trackData.description || null,
        file_url: trackData.file_url,
        cover_art_url: trackData.cover_art_url || null,
        artwork_url: trackData.cover_art_url || null, // Also set artwork_url for compatibility
        duration: trackData.duration || null,
        tags: trackData.tags ? trackData.tags.split(',').map(t => t.trim()) : null,
        is_public: trackData.is_public ?? true,
        genre: trackData.genre || null,
        lyrics: trackData.lyrics || null,
        lyrics_language: trackData.lyrics_language || null,
        has_lyrics: trackData.has_lyrics || false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating audio track:', error);
      return {
        success: false,
        error: { message: error.message || 'Failed to create track record' },
      };
    }

    console.log('✅ Audio track created successfully:', data.id);

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

