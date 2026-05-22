import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard,
  Platform,
  ScrollView,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ExpoSharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import CreatorDigitalCard, { CARD_WIDTH, HERO_H, PhotoTransform } from './CreatorDigitalCard';
import { getCardPhoto } from '../services/backgroundRemoval';
import {
  getGenerationStatus,
  generateCardToken,
  storeFingerprint,
  hashFileSHA256,
  GenerationStatus,
} from '../services/cardAuthService';

const CARD_SAFETY_SHOWN_KEY = 'card_safety_notice_shown';

let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

// ── Photo adjustment editor ───────────────────────────────────────────────────

function touchDist(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }) {
  return Math.sqrt((b.pageX - a.pageX) ** 2 + (b.pageY - a.pageY) ** 2);
}
function touchMid(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }) {
  return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

// Pinch sensitivity multiplier: 2× means spreading fingers 10% gives 20% scale change
const PINCH_SENSITIVITY = 2.0;

function PhotoEditorOverlay({
  uri,
  initialTransform,
  photoNaturalH,
  onSave,
  onCancel,
}: {
  uri: string;
  initialTransform: PhotoTransform;
  photoNaturalH: number;
  onSave: (t: PhotoTransform) => void;
  onCancel: () => void;
}) {
  const scale = useRef(initialTransform.scale);
  const tx = useRef(initialTransform.translateX);
  const ty = useRef(initialTransform.translateY);
  const lastScale = useRef(initialTransform.scale);
  const lastTx = useRef(initialTransform.translateX);
  const lastTy = useRef(initialTransform.translateY);
  const initDist = useRef(0);
  const initMid = useRef({ x: 0, y: 0 });
  const prevCount = useRef(0);

  const animScale = useRef(new Animated.Value(initialTransform.scale)).current;
  const animTx = useRef(new Animated.Value(initialTransform.translateX)).current;
  const animTy = useRef(new Animated.Value(initialTransform.translateY)).current;

  const anchor = () => {
    lastScale.current = scale.current;
    lastTx.current = tx.current;
    lastTy.current = ty.current;
  };

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase — claim the gesture before child views can
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Critical: prevent iOS from stealing the responder when a 2nd finger lands
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        anchor();
        const { touches } = evt.nativeEvent;
        prevCount.current = touches.length;
        if (touches.length >= 2) {
          initDist.current = touchDist(touches[0], touches[1]);
          initMid.current = touchMid(touches[0], touches[1]);
        } else {
          initMid.current = { x: touches[0].pageX, y: touches[0].pageY };
        }
      },
      onPanResponderMove: (evt) => {
        const { touches } = evt.nativeEvent;
        // Re-anchor whenever finger count changes so there's no jump
        if (touches.length !== prevCount.current) {
          anchor();
          prevCount.current = touches.length;
          if (touches.length >= 2) {
            initDist.current = touchDist(touches[0], touches[1]);
            initMid.current = touchMid(touches[0], touches[1]);
          } else if (touches.length === 1) {
            initMid.current = { x: touches[0].pageX, y: touches[0].pageY };
          }
          return;
        }
        if (touches.length >= 2) {
          const d = touchDist(touches[0], touches[1]);
          const m = touchMid(touches[0], touches[1]);
          if (initDist.current > 0) {
            // Amplified sensitivity: small finger movement → larger scale change
            const rawRatio = d / initDist.current;
            const amplified = 1 + (rawRatio - 1) * PINCH_SENSITIVITY;
            const s = Math.max(0.25, Math.min(5, lastScale.current * amplified));
            scale.current = s;
            animScale.setValue(s);
          }
          // Pan by the midpoint movement between the two fingers
          tx.current = lastTx.current + (m.x - initMid.current.x);
          ty.current = lastTy.current + (m.y - initMid.current.y);
          animTx.setValue(tx.current);
          animTy.setValue(ty.current);
        } else if (touches.length === 1) {
          tx.current = lastTx.current + (touches[0].pageX - initMid.current.x);
          ty.current = lastTy.current + (touches[0].pageY - initMid.current.y);
          animTx.setValue(tx.current);
          animTy.setValue(ty.current);
        }
      },
    })
  ).current;

  const handleReset = () => {
    scale.current = 1; tx.current = 0; ty.current = 0;
    animScale.setValue(1); animTx.setValue(0); animTy.setValue(0);
  };

  const C = 'rgba(255,255,255,0.75)';
  const CORNER = 18;

  return (
    <View style={[StyleSheet.absoluteFill, editorStyles.overlay]}>
      <View style={editorStyles.editorHeader}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={editorStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={editorStyles.editorTitle}>Adjust Photo</Text>
        <TouchableOpacity
          onPress={() => onSave({ scale: scale.current, translateX: tx.current, translateY: ty.current })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={editorStyles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Text style={editorStyles.hint}>Drag to reposition · Pinch with both thumbs to resize</Text>

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View
          style={{ width: CARD_WIDTH, height: HERO_H, backgroundColor: '#8b0020', overflow: 'hidden', borderRadius: 8 }}
          {...panResponder.panHandlers}
        >
          {/* Photo at natural aspect ratio — no cropping */}
          <Animated.Image
            source={{ uri }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: CARD_WIDTH,
              height: photoNaturalH,
              transform: [{ translateX: animTx }, { translateY: animTy }, { scale: animScale }],
            }}
            resizeMode="stretch"
          />

          {/* Non-interactive overlay: grid + corner handles + center badge */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* Rule-of-thirds grid */}
            <View style={editorStyles.gridVL1} />
            <View style={editorStyles.gridVL2} />
            <View style={editorStyles.gridHL1} />
            <View style={editorStyles.gridHL2} />

            {/* Corner resize handles */}
            <View style={{ position: 'absolute', top: 10, left: 10, width: CORNER, height: CORNER, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: C, borderTopLeftRadius: 3 }} />
            <View style={{ position: 'absolute', top: 10, right: 10, width: CORNER, height: CORNER, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: C, borderTopRightRadius: 3 }} />
            <View style={{ position: 'absolute', bottom: 10, left: 10, width: CORNER, height: CORNER, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: C, borderBottomLeftRadius: 3 }} />
            <View style={{ position: 'absolute', bottom: 10, right: 10, width: CORNER, height: CORNER, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: C, borderBottomRightRadius: 3 }} />

            {/* Center pinch badge */}
            <View style={editorStyles.pinchBadge}>
              <Ionicons name="resize-outline" size={16} color="#fff" />
              <Text style={editorStyles.pinchBadgeText}>Pinch to resize</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={handleReset} style={editorStyles.resetBtn}>
        <Text style={editorStyles.resetText}>Reset to default</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  username: string;
  userId?: string;
  avatarUrl?: string;
  bio?: string | null;
  headline?: string | null;
  role?: string | null;
  session?: Session | null;
  onShared: () => void;
}

export default function ShareMyCardModal({
  visible, onClose, creatorName, username, userId, avatarUrl, bio, headline, role, session, onShared,
}: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [cardPhotoUri, setCardPhotoUri] = useState<string | null>(null);
  const [photoStage, setPhotoStage] = useState<'idle' | 'checking' | 'processing' | 'done'>('idle');
  const [bgError, setBgError] = useState<string | null>(null);
  const [photoTransform, setPhotoTransform] = useState<PhotoTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoNaturalH, setPhotoNaturalH] = useState(HERO_H);

  // Cryptographic card auth state
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const fingerprintStoredRef = useRef(false);

  const fanUrl = `soundbridge.live/${username}/home`;
  const fullFanUrl = `https://${fanUrl}`;

  // Reset state each time the modal opens so we always retry
  useEffect(() => {
    if (!visible) {
      setPhotoStage('idle');
      setCardPhotoUri(null);
      setBgError(null);
      setPhotoTransform({ scale: 1, translateX: 0, translateY: 0 });
      setIsEditingPhoto(false);
      setAuthToken(null);
      setGenerationStatus(null);
      setShowLimitModal(false);
      fingerprintStoredRef.current = false;
      return;
    }

    let cancelled = false;

    // Check generation status + generate token in parallel with photo processing
    if (session) {
      (async () => {
        setTokenLoading(true);
        try {
          const status = await getGenerationStatus(session);
          if (cancelled) return;
          setGenerationStatus(status);

          if (!status.can_generate) {
            setShowLimitModal(true);
            return;
          }

          const result = await generateCardToken(session);
          if (!cancelled) setAuthToken(result.token);
        } catch (err) {
          // Non-fatal: card still renders but QR falls back to plain URL
          console.warn('[ShareMyCardModal] Token generation failed:', err);
        } finally {
          if (!cancelled) setTokenLoading(false);
        }
      })();
    }

    if (!avatarUrl) return;
    const cacheKey = userId || username;

    setPhotoStage('checking');
    setBgError(null);
    getCardPhoto(cacheKey, avatarUrl, (stage, error) => {
      if (!cancelled) {
        setPhotoStage(stage === 'done' ? 'done' : stage);
        if (error) setBgError(error);
      }
    })
      .then((uri) => {
        if (!cancelled) {
          setCardPhotoUri(uri);
          setPhotoStage('done');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCardPhotoUri(avatarUrl ?? null);
          setPhotoStage('done');
        }
      });

    return () => { cancelled = true; };
  }, [visible, avatarUrl, userId, username, session]);

  // Get the photo's natural dimensions so we can render it without cropping
  useEffect(() => {
    if (!cardPhotoUri) { setPhotoNaturalH(HERO_H); return; }
    Image.getSize(
      cardPhotoUri,
      (w, h) => { if (w > 0) setPhotoNaturalH(Math.round(CARD_WIDTH * h / w)); },
      () => setPhotoNaturalH(HERO_H),
    );
  }, [cardPhotoUri]);

  const captureCard = async (): Promise<string | null> => {
    if (!captureRef) {
      Alert.alert(
        'App update required',
        'Card image capture requires a newer version of the app. You can still copy your link.',
      );
      return null;
    }
    if (!cardRef.current) return null;
    try {
      return await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        pixelRatio: 2,
      });
    } catch {
      return null;
    }
  };

  const storeFingerprintOnce = async (fileUri: string) => {
    if (fingerprintStoredRef.current || !session || !authToken) return;
    try {
      const hash = await hashFileSHA256(fileUri);
      await storeFingerprint(session, hash);
      fingerprintStoredRef.current = true;
    } catch (err) {
      console.warn('[ShareMyCardModal] storeFingerprint failed (non-fatal):', err);
    }
  };

  const maybShowSafetyModal = async () => {
    try {
      const shown = await AsyncStorage.getItem(CARD_SAFETY_SHOWN_KEY);
      if (!shown) {
        setShowSafetyModal(true);
        await AsyncStorage.setItem(CARD_SAFETY_SHOWN_KEY, '1');
      }
    } catch {}
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to save your card.');
        return;
      }
      const uri = await captureCard();
      if (!uri) return;
      // Store fingerprint before saving (non-blocking if it fails)
      await storeFingerprintOnce(uri);
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('Your card has been saved. Share it and let your community find you. 🙏🏾', 'success', 4000);
      onShared();
      await maybShowSafetyModal();
    } catch {
      showToast('Could not save card. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleShareCard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        await Share.share({ message: `Join my community on SoundBridge\n${fullFanUrl}`, url: fullFanUrl });
        onShared();
        return;
      }
      // Store fingerprint before sharing (non-blocking if it fails)
      await storeFingerprintOnce(uri);
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Your Card' });
        showToast('Your card is ready to share. Let your audience find you. 🙏🏾', 'success', 4000);
        onShared();
      } else {
        await Share.share({ url: uri, message: 'Discover my content on SoundBridge' });
        onShared();
      }
      await maybShowSafetyModal();
    } catch {
      showToast('Could not share card. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(fullFanUrl);
    showToast('Link copied!', 'success', 2000);
  };

  const isProcessing = photoStage === 'checking' || photoStage === 'processing';
  const generationsLeft = generationStatus?.generations_remaining_this_month ?? null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <LinearGradient colors={['#060A1A', '#0D1B4B', '#1a0628']} style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Digital Card</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Status indicator */}
          <View style={styles.processingBadge}>
            {(isProcessing || tokenLoading) && <ActivityIndicator size="small" color="#c0143c" />}
            <Text style={[styles.processingText, bgError ? { color: '#ff6b6b' } : undefined]}>
              {tokenLoading && !isProcessing
                ? 'Securing card…'
                : photoStage === 'processing'
                ? 'Enhancing your photo…'
                : photoStage === 'checking'
                ? 'Preparing card…'
                : photoStage === 'done'
                ? (bgError
                    ? `Error: ${bgError}`
                    : cardPhotoUri && cardPhotoUri !== avatarUrl
                    ? '✓ Photo enhanced'
                    : '✓ Ready')
                : 'Loading…'}
            </Text>
          </View>

          {/* Generation count badge */}
          {generationStatus && !showLimitModal && (
            <Text style={styles.genCountText}>
              {generationStatus.tier === 'unlimited'
                ? 'Unlimited generations'
                : `${generationsLeft} generation${generationsLeft === 1 ? '' : 's'} left this month`}
            </Text>
          )}

          {/* Card — captured by ViewShot at 2x */}
          <View style={styles.cardShadow}>
            <View ref={cardRef} collapsable={false}>
              <CreatorDigitalCard
                creatorName={creatorName}
                username={username}
                bio={bio}
                headline={headline}
                role={role}
                cardPhotoUri={photoStage === 'done' ? cardPhotoUri : null}
                avatarUrl={avatarUrl}
                fanUrl={fanUrl}
                photoTransform={photoTransform}
                photoNaturalHeight={photoNaturalH}
                authToken={authToken}
                creatorId={userId}
              />
            </View>
          </View>

          {/* Adjust photo button — only when photo is ready */}
          {photoStage === 'done' && cardPhotoUri && (
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => setIsEditingPhoto(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="crop-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.adjustText}>Adjust Photo Position</Text>
            </TouchableOpacity>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDownload}
              disabled={busy || isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#c0143c', '#8b1a8b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGrad}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.actionText}>Download Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleShareCard}
              disabled={busy || isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b1a8b', '#4a1bb5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGrad}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.actionText}>Share Card</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopyLink}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Ionicons name="link-outline" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.copyText}>Copy My Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Photo adjustment overlay */}
        {isEditingPhoto && cardPhotoUri && (
          <PhotoEditorOverlay
            uri={cardPhotoUri}
            initialTransform={photoTransform}
            photoNaturalH={photoNaturalH}
            onSave={(t) => {
              setPhotoTransform(t);
              setIsEditingPhoto(false);
            }}
            onCancel={() => setIsEditingPhoto(false)}
          />
        )}

        {/* Generation limit overlay */}
        {showLimitModal && generationStatus && (
          <View style={styles.overlaySheet}>
            <Ionicons name="lock-closed-outline" size={36} color="#f5c842" />
            <Text style={styles.overlayTitle}>Card Limit Reached</Text>
            <Text style={styles.overlayBody}>
              {generationStatus.tier === 'free'
                ? `You've used your free card generation. Upgrade to generate more.`
                : `You've used all ${generationStatus.monthly_limit} generations for this month.`}
            </Text>
            {generationStatus.resets_at && generationStatus.tier !== 'free' && (
              <Text style={styles.overlayMeta}>
                Resets on {new Date(generationStatus.resets_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
            <TouchableOpacity style={styles.overlayBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.overlayBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* One-time safety notice */}
        {showSafetyModal && (
          <View style={styles.overlaySheet}>
            <Ionicons name="shield-checkmark-outline" size={36} color="#4ade80" />
            <Text style={styles.overlayTitle}>Keep your original card safe</Text>
            <Text style={styles.overlayBody}>
              Your SoundBridge card contains a unique security signature. If you ever lose access to your account, your original card file can be used to recover it.{'\n\n'}Copies and screenshots will not work — only your original saved file.
            </Text>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={() => setShowSafetyModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.overlayBtnText}>I understand</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 54 : 34,
    padding: 4,
  },
  scrollContent: { alignItems: 'center', paddingBottom: 48 },

  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(192,20,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192,20,60,0.25)',
  },
  processingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },

  cardShadow: {
    borderRadius: 8,
    shadowColor: '#c0143c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },

  actions: { width: CARD_WIDTH, marginTop: 24, gap: 10 },
  actionBtn: { borderRadius: 13, overflow: 'hidden' },
  actionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 13,
  },
  copyText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  adjustText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  genCountText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  overlaySheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,10,26,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 200,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  overlayBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  overlayMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  overlayBtn: {
    marginTop: 28,
    backgroundColor: '#c0143c',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 13,
  },
  overlayBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const editorStyles = StyleSheet.create({
  overlay: {
    backgroundColor: '#0a0a0a',
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  cancelText: { color: 'rgba(255,255,255,0.65)', fontSize: 16 },
  editorTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  doneText: { color: '#ff3a5c', fontSize: 16, fontWeight: '700' },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  resetBtn: { alignSelf: 'center', marginTop: 20, padding: 10 },
  resetText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  pinchBadge: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    marginHorizontal: Math.round(CARD_WIDTH * 0.25),
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  pinchBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' },
  gridVL1: { position: 'absolute', left: Math.round(CARD_WIDTH / 3), top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  gridVL2: { position: 'absolute', left: Math.round(CARD_WIDTH * 2 / 3), top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  gridHL1: { position: 'absolute', top: Math.round(HERO_H / 3), left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  gridHL2: { position: 'absolute', top: Math.round(HERO_H * 2 / 3), left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
} as const);
