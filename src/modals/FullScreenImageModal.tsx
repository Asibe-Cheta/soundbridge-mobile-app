import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// How far down before we commit to dismiss
const DISMISS_THRESHOLD = 120;
// Velocity threshold (fast flick = dismiss even if not far)
const DISMISS_VELOCITY = 0.9;

type ReactionType = 'support' | 'love' | 'fire' | 'congrats';

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'support', emoji: '👍', label: 'Like', color: '#DC2626' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#EC4899' },
  { type: 'fire', emoji: '🔥', label: 'Fire', color: '#F5A623' },
  { type: 'congrats', emoji: '👏', label: 'Congrats', color: '#7B68EE' },
];

const getReactionIcon = (userReaction?: string | null): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } => {
  if (!userReaction) return { name: 'thumbs-up-outline', color: 'rgba(255,255,255,0.85)' };
  const map: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
    support: { name: 'thumbs-up', color: '#DC2626' },
    love: { name: 'heart', color: '#EC4899' },
    fire: { name: 'flame', color: '#F5A623' },
    congrats: { name: 'ribbon', color: '#7B68EE' },
  };
  return map[userReaction] ?? { name: 'thumbs-up', color: '#DC2626' };
};

interface FullScreenImageModalProps {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
  // Legacy single-image prop
  imageUrl?: string;
  // Reaction / comment props (optional)
  userReaction?: ReactionType | null;
  reactionsCount?: { support: number; love: number; fire: number; congrats: number };
  commentsCount?: number;
  onReactionPress?: (reactionType: ReactionType) => void;
  onCommentPress?: () => void;
}

export default function FullScreenImageModal({
  visible,
  imageUrls: imageUrlsProp,
  initialIndex = 0,
  onClose,
  imageUrl,
  userReaction,
  reactionsCount,
  commentsCount,
  onReactionPress,
  onCommentPress,
}: FullScreenImageModalProps) {
  const insets = useSafeAreaInsets();
  const imageUrls = imageUrlsProp.length > 0
    ? imageUrlsProp
    : imageUrl ? [imageUrl] : [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [showInlineReactionPicker, setShowInlineReactionPicker] = useState(false);

  // --- Animation values ---
  // Entry / overall opacity (fade in on open)
  const enterAnim = useRef(new Animated.Value(0)).current;
  // Controls overlay opacity (tap to toggle)
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  // Vertical drag offset
  const panY = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const reactionLongPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDismissing = useRef(false);

  // Derived: background fades to transparent as user pulls down
  const bgOpacity = panY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.55],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Derived: image shrinks toward thumbnail size as user pulls down
  const imageScale = panY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.55],
    outputRange: [1, 0.72],
    extrapolate: 'clamp',
  });

  // Animate in when modal opens
  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      panY.setValue(0);
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const triggerClose = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Animated.parallel([
      Animated.timing(panY, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(enterAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      panY.setValue(0);
      enterAnim.setValue(0);
      isDismissing.current = false;
      onClose();
    });
  }, [onClose]);

  const snapBack = useCallback(() => {
    Animated.parallel([
      Animated.spring(panY, {
        toValue: 0,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // PanResponder — only claims downward vertical drags
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Claim gesture only when clearly dragging downward more than sideways
        return g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        panY.extractOffset();
      },
      onPanResponderMove: (_, g) => {
        // Only follow downward movement
        if (g.dy > 0) {
          panY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        panY.flattenOffset();
        const shouldDismiss = g.dy > DISMISS_THRESHOLD || g.vy > DISMISS_VELOCITY;
        if (shouldDismiss) {
          triggerClose();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        snapBack();
      },
    })
  ).current;

  const hasReactions = !!onReactionPress;
  const totalReactions = reactionsCount
    ? reactionsCount.support + reactionsCount.love + reactionsCount.fire + reactionsCount.congrats
    : 0;
  const reactionIcon = getReactionIcon(userReaction);

  const handleListReady = useCallback(() => {
    if (initialIndex > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [initialIndex]);

  const toggleControls = () => {
    const next = !controlsVisible;
    setControlsVisible(next);
    if (!next) setShowInlineReactionPicker(false);
    Animated.timing(controlsOpacity, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const handleLongPress = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }
      const filename = `soundbridge-${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
      const blob = await response.blob();
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1] || reader.result as string;
            await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            const opts: Sharing.SharingOptions = { mimeType: 'image/jpeg', dialogTitle: 'Save or Share Image' };
            if (Platform.OS === 'ios') opts.UTI = 'public.jpeg';
            await Sharing.shareAsync(fileUri, opts);
            setTimeout(() => FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {}), 1000);
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  };

  const handleReactionPressIn = () => {
    reactionLongPressTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowInlineReactionPicker(true);
    }, 500);
  };

  const handleReactionPressOut = () => {
    if (reactionLongPressTimer.current) {
      clearTimeout(reactionLongPressTimer.current);
      reactionLongPressTimer.current = null;
    }
  };

  const handleQuickReaction = () => {
    if (!showInlineReactionPicker) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReactionPress?.('support');
    }
  };

  const handleReactionSelect = (type: ReactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowInlineReactionPicker(false);
    onReactionPress?.(type);
  };

  const handleCommentPress = () => {
    triggerClose();
    setTimeout(() => onCommentPress?.(), 320);
  };

  if (!visible || imageUrls.length === 0) return null;

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={triggerClose}
      statusBarTranslucent
    >
      <StatusBar hidden={Platform.OS === 'ios'} barStyle="light-content" backgroundColor="#000" />

      {/* Animated background — fades with drag and entry */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: Animated.multiply(enterAnim, bgOpacity),
            backgroundColor: '#000',
          },
        ]}
      />

      {/* Draggable image content layer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [
              { translateY: panY },
              { scale: imageScale },
            ],
            opacity: enterAnim,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Swipeable image list */}
        <FlatList
          ref={flatListRef}
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onLayout={handleListReady}
          onViewableItemsChanged={handleViewableChange}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item: uri, index }) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={toggleControls}
              onLongPress={() => handleLongPress(uri)}
              style={styles.imagePage}
            >
              {loadingMap[index] !== false && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                onLoad={() => setLoadingMap(prev => ({ ...prev, [index]: false }))}
                onError={() => setLoadingMap(prev => ({ ...prev, [index]: false }))}
              />
            </TouchableOpacity>
          )}
        />

        {/* Controls overlay — fades in/out on tap */}
        <Animated.View
          style={[styles.controls, { opacity: controlsOpacity }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={triggerClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {imageUrls.length > 1 && (
              <View style={styles.counter}>
                <Text style={styles.counterText}>{currentIndex + 1} / {imageUrls.length}</Text>
              </View>
            )}
          </View>

          {/* Bottom section */}
          <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 12 }]}>

            {/* Inline reaction picker */}
            {showInlineReactionPicker && hasReactions && (
              <View style={styles.reactionPickerRow}>
                {REACTION_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r.type}
                    style={styles.reactionOption}
                    onPress={() => handleReactionSelect(r.type)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={[styles.reactionLabel, { color: r.color }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reaction + Comment action row */}
            {hasReactions && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, userReaction && styles.actionButtonActive]}
                  onPressIn={handleReactionPressIn}
                  onPressOut={handleReactionPressOut}
                  onPress={handleQuickReaction}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={reactionIcon.name} size={22} color={reactionIcon.color} />
                  {totalReactions > 0 && (
                    <Text style={[styles.actionCount, userReaction ? { color: reactionIcon.color } : {}]}>
                      {totalReactions}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCommentPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chatbubble-outline" size={21} color="rgba(255,255,255,0.85)" />
                  {(commentsCount ?? 0) > 0 && (
                    <Text style={styles.actionCount}>{commentsCount}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Dot indicators */}
            {imageUrls.length > 1 && (
              <View style={styles.dotsRow}>
                {imageUrls.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === currentIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}

            {/* Swipe hint */}
            <View style={styles.hintPillWrapper}>
              <View style={styles.hintPill}>
                <Text style={styles.hintText}>Swipe down to close · Long press to share</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  reactionOption: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reactionEmoji: {
    fontSize: 26,
  },
  reactionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hintPillWrapper: {
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
});
