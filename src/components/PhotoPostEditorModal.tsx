import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { feedService } from '../services/api/feedService';

let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

const SCREEN_W = Dimensions.get('window').width;
const FRAME_FULL = SCREEN_W - 32;   // full-size when keyboard is hidden
const FRAME_COMPACT = 150;           // compact-size when keyboard is open
const CORNER = 18;
const GRID_COLOR = 'rgba(255,255,255,0.35)';
const HANDLE_COLOR = 'rgba(255,255,255,0.90)';

function touchDist(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return Math.sqrt((b.pageX - a.pageX) ** 2 + (b.pageY - a.pageY) ** 2);
}

function touchMid(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPosted?: () => void;
}

export default function PhotoPostEditorModal({ visible, onClose, onPosted }: Props) {
  const { theme } = useTheme();
  const frameRef = useRef<View>(null);
  const captionRef = useRef<TextInput>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [naturalH, setNaturalH] = useState(FRAME_FULL);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Animated frame height — shrinks to FRAME_COMPACT when keyboard opens
  const frameHeightAnim = useRef(new Animated.Value(FRAME_FULL)).current;

  // Animated transform values
  const animScale = useRef(new Animated.Value(1)).current;
  const animTx = useRef(new Animated.Value(0)).current;
  const animTy = useRef(new Animated.Value(0)).current;

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  // Incremental per-frame touch tracking
  const prevCount = useRef(0);
  const prevT0 = useRef({ pageX: 0, pageY: 0 });
  const prevT1 = useRef({ pageX: 0, pageY: 0 });

  const applyTransform = (s: number, x: number, y: number) => {
    scaleRef.current = s;
    txRef.current = x;
    tyRef.current = y;
    animScale.setValue(s);
    animTx.setValue(x);
    animTy.setValue(y);
  };

  // Keyboard listeners — animate frame height
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      Animated.timing(frameHeightAnim, {
        toValue: FRAME_COMPACT,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };
    const onHide = (e: any) => {
      Animated.timing(frameHeightAnim, {
        toValue: FRAME_FULL,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setCaption('');
      applyTransform(1, 0, 0);
      frameHeightAnim.setValue(FRAME_FULL);
      launchPicker();
    }
  }, [visible]);

  const launchPicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo access to post photos.');
      onClose();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) {
      onClose();
      return;
    }
    const asset = result.assets[0];
    const imgW = asset.width || FRAME_FULL;
    const imgH = asset.height || FRAME_FULL;

    const computedNaturalH = FRAME_FULL * (imgH / imgW);
    setNaturalH(computedNaturalH);

    const coverScale = computedNaturalH < FRAME_FULL ? FRAME_FULL / computedNaturalH : 1;
    const scaledH = computedNaturalH * coverScale;
    const initTy = -(scaledH - FRAME_FULL) / 2;

    applyTransform(coverScale, 0, initTy);
    setImageUri(asset.uri);
  };

  // ── Incremental delta touch responder ─────────────────────────────────────
  const responder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,

    onResponderGrant: (e: any) => {
      const t = e.nativeEvent.touches;
      prevCount.current = t.length;
      if (t.length >= 1) prevT0.current = { pageX: t[0].pageX, pageY: t[0].pageY };
      if (t.length >= 2) prevT1.current = { pageX: t[1].pageX, pageY: t[1].pageY };
    },

    onResponderMove: (e: any) => {
      const t = e.nativeEvent.touches;
      const count = t.length;

      if (count !== prevCount.current) {
        prevCount.current = count;
        if (count >= 1) prevT0.current = { pageX: t[0].pageX, pageY: t[0].pageY };
        if (count >= 2) prevT1.current = { pageX: t[1].pageX, pageY: t[1].pageY };
        return;
      }

      if (count === 1) {
        const dx = t[0].pageX - prevT0.current.pageX;
        const dy = t[0].pageY - prevT0.current.pageY;
        applyTransform(scaleRef.current, txRef.current + dx, tyRef.current + dy);
        prevT0.current = { pageX: t[0].pageX, pageY: t[0].pageY };
      } else if (count === 2) {
        const prevDist = touchDist(prevT0.current, prevT1.current);
        const currDist = touchDist(t[0], t[1]);
        const scaleDelta = prevDist > 0 ? currDist / prevDist : 1;
        const newScale = Math.max(0.3, Math.min(scaleRef.current * scaleDelta, 8));

        const prevMid = touchMid(prevT0.current, prevT1.current);
        const currMid = touchMid(t[0], t[1]);

        applyTransform(newScale, txRef.current + (currMid.x - prevMid.x), tyRef.current + (currMid.y - prevMid.y));
        prevT0.current = { pageX: t[0].pageX, pageY: t[0].pageY };
        prevT1.current = { pageX: t[1].pageX, pageY: t[1].pageY };
      }
    },

    onResponderRelease: () => {
      prevCount.current = 0;
    },
  };

  const handlePost = async () => {
    if (!imageUri) return;
    Keyboard.dismiss();
    setUploading(true);
    try {
      let uploadUri = imageUri;
      if (captureRef && frameRef.current) {
        try {
          uploadUri = await captureRef(frameRef.current, { format: 'jpg', quality: 0.9 });
        } catch {
          uploadUri = imageUri;
        }
      }

      const compressed = await ImageManipulator.manipulateAsync(
        uploadUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const newPost = await feedService.createPost({
        content: caption.trim(),
        post_type: 'photo',
        visibility: 'public',
      });

      await feedService.uploadImage(compressed.uri, newPost.id);

      onPosted?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

          {/* ── Header — sits OUTSIDE the KAV so it never shifts ── */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              disabled={uploading}
            >
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add to Portfolio</Text>
            <View style={{ width: 26 }} />
          </View>

          {imageUri ? (
            /* KAV handles lifting the Post button above keyboard */
            <KeyboardAvoidingView
              style={styles.kav}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {/* Tapping outside caption dismisses keyboard */}
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.body}>

                  {/* ── Photo frame — animated height, outside ScrollView ── */}
                  <Animated.View
                    style={[styles.frameBase, { width: FRAME_FULL, height: frameHeightAnim }]}
                    collapsable={false}
                    {...responder}
                  >
                    {/* imageRef wraps ONLY the image — captureRef targets this, NOT the overlay */}
                    <View ref={frameRef} style={StyleSheet.absoluteFill} collapsable={false}>
                      <Animated.Image
                        source={{ uri: imageUri }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: FRAME_FULL,
                          height: naturalH,
                          transform: [
                            { translateX: animTx },
                            { translateY: animTy },
                            { scale: animScale },
                          ],
                        }}
                        resizeMode="stretch"
                      />
                    </View>

                    {/* Overlay — outside imageRef, so captureRef never sees it */}
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                      <View style={styles.gridVL1} />
                      <View style={styles.gridVL2} />
                      <View style={styles.gridHL1} />
                      <View style={styles.gridHL2} />

                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />

                      <View style={styles.hintRow}>
                        <View style={styles.hintBadge}>
                          <Ionicons name="resize-outline" size={13} color="#fff" />
                          <Text style={styles.hintText}>Pinch to resize · Drag to reposition</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>

                  {/* Change photo */}
                  <TouchableOpacity
                    onPress={launchPicker}
                    disabled={uploading}
                    style={styles.changePhotoRow}
                  >
                    <Ionicons name="images-outline" size={15} color={theme.colors.primary} />
                    <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>
                      Change photo
                    </Text>
                  </TouchableOpacity>

                  {/* Caption */}
                  <TouchableWithoutFeedback>
                    {/* Inner TWF prevents outer TWF from stealing caption taps */}
                    <View style={[styles.captionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <TextInput
                        ref={captionRef}
                        style={[styles.captionInput, { color: theme.colors.text }]}
                        placeholder="Describe this moment, session or performance…"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={caption}
                        onChangeText={setCaption}
                        multiline
                        maxLength={500}
                        editable={!uploading}
                        blurOnSubmit={false}
                      />
                      {caption.length > 400 && (
                        <Text style={[styles.charCount, { color: caption.length >= 500 ? '#EF4444' : theme.colors.textSecondary }]}>
                          {500 - caption.length}
                        </Text>
                      )}
                    </View>
                  </TouchableWithoutFeedback>

                </View>
              </TouchableWithoutFeedback>

              {/* Post button lives OUTSIDE the dismiss area so it's always tappable */}
              <TouchableOpacity
                onPress={handlePost}
                disabled={uploading}
                activeOpacity={0.85}
                style={[
                  styles.postBtn,
                  { backgroundColor: uploading ? theme.colors.surface : theme.colors.primary },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.postBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // Header — outside KAV, always visible
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },

  // KAV fills remaining space below header
  kav: { flex: 1 },

  // Body: flex column, centered, dismisses keyboard on outside tap
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
  },

  // ── Frame ────────────────────────────────────────────────────────────────
  frameBase: {
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#000',
  },

  gridVL1: { position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_COLOR },
  gridVL2: { position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_COLOR },
  gridHL1: { position: 'absolute', top: '33.33%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_COLOR },
  gridHL2: { position: 'absolute', top: '66.66%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_COLOR },

  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: HANDLE_COLOR },
  cornerTL: { top: 10, left: 10, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 3 },
  cornerTR: { top: 10, right: 10, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 3 },
  cornerBL: { bottom: 10, left: 10, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 3 },
  cornerBR: { bottom: 10, right: 10, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 3 },

  hintRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Below-frame controls ─────────────────────────────────────────────────
  changePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '500',
  },

  captionContainer: {
    width: FRAME_FULL,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 64,
    maxHeight: 100,
  },
  captionInput: {
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 2,
  },

  // ── Post button (bottom, above keyboard via KAV) ──────────────────────────
  postBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
