import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
  verifyCard,
  hashFileSHA256,
  getUploadUrl,
  submitManualRecovery,
  completeRecovery,
} from '../services/cardAuthService';

type Step = 'upload' | 'verifying' | 'face_verify' | 'manual_upload' | 'submitting' | 'submitted' | 'restoring';
type ManualFile = { uri: string; mimeType: string; name: string };

export default function CardRecoveryScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('upload');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null);
  const [personaVerified, setPersonaVerified] = useState(false);
  const [cardFile, setCardFile] = useState<ManualFile | null>(null);
  const [selfieFile, setSelfieFile] = useState<ManualFile | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const goBack = () => {
    if (step === 'upload') {
      (navigation as any).goBack();
    } else {
      setStep('upload');
      setErrorMsg(null);
      setRecoverySessionId(null);
      setCardFile(null);
      setSelfieFile(null);
      setRateLimitSeconds(null);
    }
  };

  const handleUploadCard = async () => {
    setErrorMsg(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const mimeType = asset.mimeType ?? 'image/png';

      setCardFile({ uri: fileUri, mimeType, name: asset.name ?? 'card' });
      setStep('verifying');

      // Decode QR code from the card image
      let uid: string | null = null;
      let token: string | null = null;

      try {
        const scanned = await Camera.scanFromURLAsync(fileUri, ['qr']);
        const qrResult = scanned?.[0]?.data;
        if (qrResult) {
          const payload = JSON.parse(qrResult);
          uid = payload.uid ?? null;
          token = payload.token ?? null;
        }
      } catch {
        // QR decode failed
      }

      if (!uid || !token) {
        setErrorMsg(
          'Could not read the QR code from this file. Make sure you are uploading your original SoundBridge card — not a screenshot or edited copy.',
        );
        setStep('upload');
        return;
      }

      // Hash the file bytes
      const fileHash = await hashFileSHA256(fileUri);

      // Call verify-card
      const verifyResult = await verifyCard(uid, token, fileHash);

      if (!verifyResult.verified) {
        setErrorMsg(
          'This card could not be verified. Please make sure you are uploading your original card file, not a screenshot or copy.',
        );
        setStep('upload');
        return;
      }

      setRecoverySessionId(verifyResult.recovery_session_id);
      setPersonaVerified(verifyResult.persona_verified);

      if (verifyResult.persona_verified) {
        setStep('face_verify');
      } else {
        setStep('manual_upload');
      }
    } catch (err: any) {
      if (err?.status === 429) {
        const seconds = err.body?.retry_after_seconds ?? 3600;
        setRateLimitSeconds(seconds);
        setErrorMsg(
          `Too many recovery attempts. Please try again in ${Math.ceil(seconds / 60)} minutes.`,
        );
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
      setStep('upload');
    }
  };

  const handlePersonaVerification = async () => {
    // The existing Persona flow is triggered here.
    // Persona fires a webhook to the backend; then we call /api/recovery/complete.
    // For now we show an alert — the actual Persona SDK integration
    // should match the existing Persona flow elsewhere in the app.
    Alert.alert(
      'Face Verification',
      'This will open identity verification. Complete the check and then return here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            // TODO: Trigger existing Persona liveness flow here.
            // On Persona completion (webhook received by server), call completeRecovery.
            await attemptCompleteRecovery();
          },
        },
      ],
    );
  };

  const attemptCompleteRecovery = async () => {
    if (!recoverySessionId) return;
    setStep('restoring');
    try {
      const result = await completeRecovery(recoverySessionId);
      if (result.success && result.token_type === 'magic_link') {
        const { error } = await supabase.auth.getSessionFromUrl({ url: result.login_token });
        if (error) throw error;
        // Auth state change will route the user to the main app via AppContext
        Alert.alert(
          'You are back in',
          'For security, your previous card has been invalidated. Please generate a new card to keep as your recovery backup.',
        );
      }
    } catch (err: any) {
      const code = err?.body?.error;
      if (code === 'face_verification_not_confirmed') {
        setErrorMsg('Face verification is still processing. Please wait a moment and try again.');
      } else if (code === 'session_expired_or_invalid') {
        setErrorMsg('Recovery session expired. Please start over.');
        setStep('upload');
      } else {
        setErrorMsg('Account restoration failed. Please try again.');
      }
      setStep('face_verify');
    }
  };

  const handlePickSelfie = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setSelfieFile({ uri: asset.uri, mimeType: 'video/mp4', name: 'selfie.mp4' });
  };

  const handleSubmitManual = async () => {
    if (!recoverySessionId || !cardFile || !selfieFile) return;
    setStep('submitting');
    setErrorMsg(null);
    try {
      // Get signed upload URLs
      const [cardUrlResult, selfieUrlResult] = await Promise.all([
        getUploadUrl(recoverySessionId, 'card', cardFile.mimeType),
        getUploadUrl(recoverySessionId, 'selfie_video', selfieFile.mimeType),
      ]);

      // Upload files directly to storage
      await Promise.all([
        fetch(cardUrlResult.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': cardFile.mimeType },
          body: await fileToBlob(cardFile.uri),
        }),
        fetch(selfieUrlResult.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': selfieFile.mimeType },
          body: await fileToBlob(selfieFile.uri),
        }),
      ]);

      await submitManualRecovery(
        recoverySessionId,
        cardUrlResult.storage_path,
        selfieUrlResult.storage_path,
      );

      setStep('submitted');
    } catch (err: any) {
      const code = err?.body?.error;
      if (code === 'session_expired_or_invalid') {
        setErrorMsg('Recovery session expired. Please start over.');
        setStep('upload');
      } else {
        setErrorMsg('Submission failed. Please try again.');
        setStep('manual_upload');
      }
    }
  };

  return (
    <LinearGradient colors={['#060A1A', '#0D1B4B', '#1a0628']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recover Your Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'upload' && <UploadStep onUpload={handleUploadCard} errorMsg={errorMsg} rateLimitSeconds={rateLimitSeconds} />}
        {step === 'verifying' && <LoadingStep message="Verifying your card…" />}
        {step === 'face_verify' && <FaceVerifyStep onContinue={handlePersonaVerification} errorMsg={errorMsg} />}
        {step === 'manual_upload' && (
          <ManualUploadStep
            cardFile={cardFile}
            selfieFile={selfieFile}
            onPickSelfie={handlePickSelfie}
            onSubmit={handleSubmitManual}
            errorMsg={errorMsg}
          />
        )}
        {step === 'submitting' && <LoadingStep message="Submitting your request…" />}
        {step === 'submitted' && <SubmittedStep />}
        {step === 'restoring' && <LoadingStep message="Restoring your account…" />}
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UploadStep({
  onUpload,
  errorMsg,
  rateLimitSeconds,
}: {
  onUpload: () => void;
  errorMsg: string | null;
  rateLimitSeconds: number | null;
}) {
  return (
    <View style={styles.stepContainer}>
      <Ionicons name="card-outline" size={52} color="#c0143c" />
      <Text style={styles.stepTitle}>Upload Your Card</Text>
      <Text style={styles.stepBody}>
        Upload your original SoundBridge digital card file. Screenshots and copies will not work
        — you must upload the original file you saved when you generated your card.
      </Text>
      <Text style={styles.formatHint}>Accepted formats: JPG, PNG, PDF (max 20 MB)</Text>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {rateLimitSeconds && (
        <Text style={styles.rateLimitText}>
          Try again in {Math.ceil(rateLimitSeconds / 60)} minutes
        </Text>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, rateLimitSeconds ? styles.btnDisabled : undefined]}
        onPress={onUpload}
        disabled={!!rateLimitSeconds}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#c0143c', '#8b1a8b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Upload My Card</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function LoadingStep({ message }: { message: string }) {
  return (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color="#c0143c" />
      <Text style={styles.stepBody}>{message}</Text>
    </View>
  );
}

function FaceVerifyStep({
  onContinue,
  errorMsg,
}: {
  onContinue: () => void;
  errorMsg: string | null;
}) {
  return (
    <View style={styles.stepContainer}>
      <Ionicons name="scan-outline" size={52} color="#4ade80" />
      <Text style={styles.stepTitle}>Identity Check</Text>
      <Text style={styles.stepBody}>
        To confirm your identity, we need to verify your face matches the identity on your
        account. This uses the same verification you completed when setting up your creator profile.
      </Text>
      {errorMsg && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.8}>
        <LinearGradient
          colors={['#166534', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          <Ionicons name="camera-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Start Face Verification</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function ManualUploadStep({
  cardFile,
  selfieFile,
  onPickSelfie,
  onSubmit,
  errorMsg,
}: {
  cardFile: ManualFile | null;
  selfieFile: ManualFile | null;
  onPickSelfie: () => void;
  onSubmit: () => void;
  errorMsg: string | null;
}) {
  return (
    <View style={styles.stepContainer}>
      <Ionicons name="videocam-outline" size={52} color="#f5c842" />
      <Text style={styles.stepTitle}>Manual Review</Text>
      <Text style={styles.stepBody}>
        Since your account has not completed identity verification, your recovery request will be
        reviewed manually. This typically takes 24 to 48 hours.{'\n\n'}
        Please record a short selfie video (5 to 10 seconds) saying your name and today's date.
      </Text>

      <View style={styles.fileRow}>
        <Ionicons
          name={cardFile ? 'checkmark-circle' : 'close-circle'}
          size={20}
          color={cardFile ? '#4ade80' : '#ff6b6b'}
        />
        <Text style={styles.fileLabel}>Card file: {cardFile ? 'ready' : 'not loaded'}</Text>
      </View>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onPickSelfie} activeOpacity={0.8}>
        <Ionicons name="videocam-outline" size={18} color="rgba(255,255,255,0.85)" />
        <Text style={styles.secondaryBtnText}>
          {selfieFile ? 'Re-record selfie video' : 'Record selfie video'}
        </Text>
      </TouchableOpacity>

      {selfieFile && (
        <View style={styles.fileRow}>
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={styles.fileLabel}>Selfie video: recorded</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, (!cardFile || !selfieFile) ? styles.btnDisabled : undefined]}
        onPress={onSubmit}
        disabled={!cardFile || !selfieFile}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#c0143c', '#8b1a8b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Submit Recovery Request</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function SubmittedStep() {
  return (
    <View style={styles.stepContainer}>
      <Ionicons name="checkmark-circle-outline" size={52} color="#4ade80" />
      <Text style={styles.stepTitle}>Request Submitted</Text>
      <Text style={styles.stepBody}>
        Your recovery request has been submitted. We will contact you within 48 hours at the email
        address associated with your account.
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 60 },
  stepContainer: { alignItems: 'center', paddingTop: 36, width: '100%' },
  stepTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepBody: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  formatHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: { color: '#ff6b6b', fontSize: 14, lineHeight: 20, flex: 1 },
  rateLimitText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 16,
  },
  primaryBtn: { width: '100%', borderRadius: 13, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.45 },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginVertical: 12,
  },
  secondaryBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  fileLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});
