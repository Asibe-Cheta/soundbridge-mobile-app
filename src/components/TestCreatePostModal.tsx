/**
 * TestCreatePostModal — visual redesign of CreatePostModal.
 * VelvetSound / aura.build design psychology:
 *   Header: two-tone editorial wordmark, glass X button, gradient Publish pill
 *   Type selector: Screen 02 large text tabs instead of filled pill chips
 *   Input area: premium glass card with cinematic treatment
 *   Attachments: Screen 01 left-border section header + minimal icon chips
 * All submit / state logic is wired to the same feedService as the real modal.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { feedService } from '../services/api/feedService';
import type { PostType, PostVisibility, Post } from '../types/feed.types';

// ─────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    content: string;
    post_type: PostType;
    visibility: PostVisibility;
    image_url?: string;
    audio_url?: string;
    event_id?: string;
  }) => void;
  editingPost?: Post | null;
}

const POST_TYPES: { value: PostType; label: string; isPremium?: boolean }[] = [
  { value: 'update',        label: 'Update' },
  { value: 'opportunity',   label: 'Opportunity' },
  { value: 'achievement',   label: 'Achievement' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'event',         label: 'Event' },
  { value: 'headline',      label: '★ Headline', isPremium: true },
];

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: string }[] = [
  { value: 'public',      label: 'Everyone',           icon: 'globe-outline' },
  { value: 'connections', label: 'Connections only',   icon: 'people-outline' },
];

const MAX_CHARS = 3000;

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function TestCreatePostModal({ visible, onClose, onSubmit, editingPost }: Props) {
  const { userProfile } = useAuth();
  const navigation = useNavigation();

  const [content, setContent] = useState(editingPost?.content || '');
  const [postType, setPostType] = useState<PostType>(editingPost?.post_type || 'update');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);

  const isPremium = userProfile?.subscription_tier === 'premium' || userProfile?.subscription_tier === 'unlimited';
  const canPublish = content.trim().length > 0 && !uploading;
  const charsLeft = MAX_CHARS - content.length;

  const handleClose = () => {
    setContent(''); setPostType('update'); setImageUris([]);
    setShowVisibility(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canPublish || uploading) return;

    setUploading(true);
    try {
      const trimmed = content.trim();
      const isHeadline = postType === 'headline';

      const newPost = await feedService.createPost({
        content: trimmed,
        post_type: postType,
        visibility,
        ...(isHeadline ? { headline: trimmed, gradient_preset: 1 } : {}),
      });

      if (imageUris.length > 0) {
        for (const uri of imageUris) {
          try {
            await feedService.uploadImage(uri, newPost.id);
          } catch (err: any) {
            console.error('TestCreatePostModal image upload error:', err);
            Alert.alert('Upload Error', err.message || 'Failed to upload an image. Please try again.');
            return;
          }
        }
      }

      if (onSubmit) {
        onSubmit({
          content: trimmed,
          post_type: postType,
          visibility,
        });
      }

      setContent('');
      setPostType('update');
      setImageUris([]);
      setShowVisibility(false);
      onClose();
    } catch (err: any) {
      console.error('TestCreatePostModal create error:', err);
      Alert.alert('Error', err.message || 'Failed to create drop. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhoto = async () => {
    if (imageUris.length >= 4) { Alert.alert('Limit reached', 'Maximum 4 photos per drop.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera roll permission needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 4 - imageUris.length });
    if (!result.canceled) setImageUris(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
  };

  const handleAudio = () => Alert.alert('Audio clip', 'Audio attachments handled in the full drop editor — use the real "New Drop" modal.');
  const handleEvent = () => Alert.alert('Attach Event', 'Event attachments handled in the full drop editor — use the real "New Drop" modal.');
  const handleHeadline = () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Headline posts are available to Premium and Unlimited users.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => { handleClose(); navigation.navigate('Upgrade' as never); } },
      ]);
    } else {
      setPostType('headline');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={handleClose}>
      {/* Dark cinematic background */}
      <View style={s.root}>
        <LinearGradient
          colors={['#100828', '#1a0d40', '#100828']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={s.safe} edges={['top']}>
          <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

            {/* ══════════════════════════════════════════════════
                HEADER — Screen 01 editorial treatment
              ══════════════════════════════════════════════════ */}
            <View style={s.header}>
              {/* Glass X button — Screen 01 frosted glass circle */}
              <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.8}>
                <BlurView intensity={18} tint="dark" style={s.closeBtnBlur}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                </BlurView>
              </TouchableOpacity>

              {/* Two-tone wordmark — "New" white / "Drop" dimmed */}
              <Text style={s.headerTitle}>
                {editingPost ? 'Edit' : 'New'}<Text style={s.headerTitleDim}>{editingPost ? ' Drop' : ' Drop'}</Text>
              </Text>

              {/* Gradient publish pill */}
              <TouchableOpacity onPress={handleSubmit} disabled={!canPublish || uploading} style={s.publishWrap} activeOpacity={0.85}>
                <LinearGradient
                  colors={canPublish ? ['#DC2626', '#EC4899'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.publishPill}
                >
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={[s.publishText, !canPublish && { color: 'rgba(255,255,255,0.3)' }]}>Publish</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Thin divider */}
            <View style={s.headerDiv} />

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* ══════════════════════════════════════════════════
                  TYPE TABS — Screen 02 large text tabs
                ══════════════════════════════════════════════════ */}
              <View style={s.tabsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
                  {POST_TYPES.map(pt => (
                    <TouchableOpacity
                      key={pt.value}
                      style={s.tab}
                      onPress={() => pt.value === 'headline' ? handleHeadline() : setPostType(pt.value)}
                    >
                      <Text style={[
                        s.tabText,
                        postType === pt.value
                          ? { color: pt.isPremium ? '#EC4899' : '#fff', fontWeight: '500' }
                          : { color: pt.isPremium ? 'rgba(236,72,153,0.45)' : 'rgba(255,255,255,0.25)' },
                      ]}>
                        {pt.label}
                      </Text>
                      {postType === pt.value && (
                        <View style={[s.tabDot, { backgroundColor: pt.isPremium ? '#EC4899' : '#DC2626' }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* ══════════════════════════════════════════════════
                  TEXT INPUT — premium glass card
                ══════════════════════════════════════════════════ */}
              <View style={s.inputCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={s.inputRow}>
                  {/* Avatar */}
                  {userProfile?.avatar_url
                    ? <Image source={{ uri: userProfile.avatar_url }} style={s.avatar} />
                    : <View style={s.avatarPlaceholder}>
                        <Ionicons name="person" size={16} color="rgba(255,255,255,0.35)" />
                      </View>}

                  {/* Text area */}
                  <TextInput
                    style={s.textInput}
                    placeholder={`Share your ${postType === 'update' ? 'thoughts, opportunities, or achievements' : postType}…`}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={content}
                    onChangeText={t => setContent(t.slice(0, MAX_CHARS))}
                    multiline
                    autoFocus
                    selectionColor="#DC2626"
                  />
                </View>

                {/* Image previews */}
                {imageUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imagePreviewScroll} contentContainerStyle={{ gap: 8 }}>
                    {imageUris.map((uri, i) => (
                      <View key={i} style={s.imagePreviewWrap}>
                        <Image source={{ uri }} style={s.imagePreview} />
                        <TouchableOpacity style={s.imageRemove} onPress={() => setImageUris(p => p.filter((_, idx) => idx !== i))}>
                          <Ionicons name="close-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Char count */}
                {content.length > MAX_CHARS * 0.8 && (
                  <Text style={[s.charCount, charsLeft < 100 && { color: '#EF4444' }]}>
                    {charsLeft} remaining
                  </Text>
                )}
              </View>

              {/* ══════════════════════════════════════════════════
                  ATTACHMENTS — Screen 01 left-border section label
                ══════════════════════════════════════════════════ */}
              <View style={s.attachSection}>
                <View style={s.attachHeader}>
                  <View style={s.attachTagline} />
                  <Text style={s.attachTitle}>Add to your drop</Text>
                </View>
                <View style={s.attachRow}>
                  {[
                    { icon: 'image-outline',       label: imageUris.length > 0 ? `Photo (${imageUris.length})` : 'Photo',  color: '#DC2626',  onPress: handlePhoto },
                    { icon: 'musical-notes-outline', label: 'Audio',  color: '#7C3AED', onPress: handleAudio },
                    { icon: 'calendar-outline',    label: 'Event',  color: '#2563EB',  onPress: handleEvent },
                  ].map(btn => (
                    <TouchableOpacity key={btn.label} style={s.attachBtn} onPress={btn.onPress} activeOpacity={0.8}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Ionicons name={btn.icon as any} size={20} color={btn.color} />
                      <Text style={s.attachBtnText}>{btn.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Visibility ────────────────────────────────── */}
              <View style={s.visSection}>
                <View style={s.attachHeader}>
                  <View style={s.attachTagline} />
                  <Text style={s.attachTitle}>Visible to</Text>
                </View>
                <TouchableOpacity style={s.visDropdown} onPress={() => setShowVisibility(v => !v)} activeOpacity={0.8}>
                  <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name={visibility === 'public' ? 'globe-outline' : 'people-outline'} size={18} color="#DC2626" />
                  <Text style={s.visDropdownText}>{VISIBILITY_OPTIONS.find(o => o.value === visibility)?.label}</Text>
                  <Ionicons name={showVisibility ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
                {showVisibility && (
                  <View style={s.visPicker}>
                    <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFillObject} />
                    {VISIBILITY_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt.value} style={s.visOption} onPress={() => { setVisibility(opt.value); setShowVisibility(false); }}>
                        <Ionicons name={opt.icon as any} size={18} color="#DC2626" />
                        <Text style={s.visOptionText}>{opt.label}</Text>
                        {visibility === opt.value && <Ionicons name="checkmark" size={18} color="#DC2626" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#100828' },
  safe: { flex: 1 },
  kav: { flex: 1 },

  // ── Header — Screen 01 ────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  closeBtnBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.8,
  },
  headerTitleDim: { color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  publishWrap: { borderRadius: 999, overflow: 'hidden' },
  publishPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  publishText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  headerDiv: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },

  // ── Scroll ────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Type tabs — Screen 02 ─────────────────────────────────
  tabsSection: { paddingVertical: 4 },
  tabsRow: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', gap: 4 },
  tabText: { fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  tabDot: { width: 4, height: 4, borderRadius: 2 },

  // ── Input card — glass treatment ─────────────────────────
  inputCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    minHeight: 140,
  },
  inputRow: { flexDirection: 'row', gap: 12, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreviewScroll: { marginTop: 12 },
  imagePreviewWrap: { position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 12 },
  imageRemove: { position: 'absolute', top: -6, right: -6 },
  charCount: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 8 },

  // ── Attachment section — Screen 01 tagline header ─────────
  attachSection: { marginHorizontal: 16, marginTop: 8 },
  attachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  attachTagline: { width: 3, height: 14, borderRadius: 2, backgroundColor: '#DC2626' },
  attachTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' },
  attachRow: { flexDirection: 'row', gap: 10 },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  attachBtnText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },

  // ── Visibility section ────────────────────────────────────
  visSection: { marginHorizontal: 16, marginTop: 20 },
  visDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visDropdownText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  visPicker: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  visOptionText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.75)' },
});
