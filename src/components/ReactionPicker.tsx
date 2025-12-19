import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (reactionType: 'support' | 'love' | 'fire' | 'congrats') => void;
  onDismiss: () => void;
  position?: { x: number; y: number };
}

const REACTION_TYPES = {
  support: {
    id: 'support' as const,
    emoji: '👍',
    label: 'Support',
    color: '#DC2626', // SoundBridge accent red
  },
  love: {
    id: 'love' as const,
    emoji: '❤️',
    label: 'Love',
    color: '#EC4899', // SoundBridge accent pink
  },
  fire: {
    id: 'fire' as const,
    emoji: '🔥',
    label: 'Fire',
    color: '#F5A623', // Orange
  },
  congrats: {
    id: 'congrats' as const,
    emoji: '👏',
    label: 'Congrats',
    color: '#7B68EE', // Purple
  },
};

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onSelect,
  onDismiss,
  position,
}) => {
  const { theme } = useTheme();
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback when picker appears
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleReactionSelect = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    // Medium haptic feedback on selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(reactionType);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint={theme.isDark ? 'dark' : 'light'} />
        
        <View style={styles.centeredContainer}>
          <Animated.View
            style={[
              styles.pickerContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <View style={styles.reactionsRow}>
              {Object.values(REACTION_TYPES).map((reaction) => (
                <TouchableOpacity
                  key={reaction.id}
                  style={styles.reactionItem}
                  onPress={() => handleReactionSelect(reaction.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={[styles.reactionLabel, { color: theme.colors.textSecondary }]}>
                    {reaction.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 72,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  reactionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

