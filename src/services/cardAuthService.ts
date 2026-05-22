import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export interface GenerationStatus {
  tier: string;
  generations_used_this_month: number;
  generations_remaining_this_month: number;
  generations_lifetime: number;
  monthly_limit: number;
  resets_at: string;
  can_generate: boolean;
}

export interface GenerateTokenResult {
  token: string;
  generated_at: string;
  generations_used_this_month: number;
  generations_remaining_this_month: number;
  generations_lifetime: number;
}

export interface VerifyCardResult {
  verified: boolean;
  recovery_session_id: string;
  persona_verified: boolean;
  expires_at: string;
}

export interface UploadUrlResult {
  upload_url: string;
  storage_path: string;
  expires_at: string;
}

export async function getGenerationStatus(session: Session): Promise<GenerationStatus> {
  return apiFetch<GenerationStatus>('/api/card/generation-status', { session });
}

export async function generateCardToken(session: Session): Promise<GenerateTokenResult> {
  return apiFetch<GenerateTokenResult>('/api/card/generate-token', {
    method: 'POST',
    session,
    body: JSON.stringify({}),
  });
}

export async function storeFingerprint(session: Session, fileHash: string): Promise<void> {
  await apiFetch<{ stored: boolean }>('/api/card/store-fingerprint', {
    method: 'POST',
    session,
    body: JSON.stringify({ file_hash: fileHash }),
  });
}

export async function verifyCard(
  uid: string,
  token: string,
  fileHash: string,
): Promise<VerifyCardResult> {
  return apiFetch<VerifyCardResult>('/api/recovery/verify-card', {
    method: 'POST',
    body: JSON.stringify({ uid, token, file_hash: fileHash }),
  });
}

export async function getUploadUrl(
  recoverySessionId: string,
  fileType: 'card' | 'selfie_video',
  mimeType: string,
): Promise<UploadUrlResult> {
  return apiFetch<UploadUrlResult>('/api/recovery/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      recovery_session_id: recoverySessionId,
      file_type: fileType,
      mime_type: mimeType,
    }),
  });
}

export async function submitManualRecovery(
  recoverySessionId: string,
  cardStoragePath: string,
  selfieStoragePath: string,
): Promise<{ submitted: boolean; recovery_request_id: string }> {
  return apiFetch('/api/recovery/submit-manual', {
    method: 'POST',
    body: JSON.stringify({
      recovery_session_id: recoverySessionId,
      card_file_storage_path: cardStoragePath,
      selfie_video_storage_path: selfieStoragePath,
    }),
  });
}

export async function completeRecovery(
  recoverySessionId: string,
): Promise<{ success: boolean; login_token: string; token_type: string; expires_at: string }> {
  return apiFetch('/api/recovery/complete', {
    method: 'POST',
    body: JSON.stringify({ recovery_session_id: recoverySessionId }),
  });
}

export async function hashFileSHA256(fileUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
