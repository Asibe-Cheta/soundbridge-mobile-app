import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

type UserType =
  | 'music_creator'
  | 'podcast_creator'
  | 'industry_professional'
  | 'music_lover'
  | 'event_organiser'
  | null;

interface Props {
  visible: boolean;
  userType: UserType;
  onDismiss: () => void;
}

interface Prompt {
  icon: string;
  iconColor: string;
  gradientColors: [string, string];
  title: string;
  bullets: string[];
  cta: string;
  navigateTo: string;
}

function getPrompt(userType: UserType): Prompt | null {
  switch (userType) {
    case 'music_creator':
      return {
        icon: 'cloud-upload',
        iconColor: '#EC4899',
        gradientColors: ['#EC4899', '#9333EA'],
        title: 'Upload your first track',
        bullets: [
          'Get discovered by listeners in your genre',
          'Earn tips from fans who love your music',
          'Build your catalogue from day one',
        ],
        cta: 'Upload Now',
        navigateTo: 'Upload',
      };
    case 'podcast_creator':
      return {
        icon: 'mic',
        iconColor: '#4FD1C7',
        gradientColors: ['#4FD1C7', '#06B6D4'],
        title: 'Upload your first episode',
        bullets: [
          'Reach listeners who picked your category',
          'Grow your subscriber base from the start',
          'Monetise with tips and fan subscriptions',
        ],
        cta: 'Upload Now',
        navigateTo: 'Upload',
      };
    case 'industry_professional':
      return {
        icon: 'person-add',
        iconColor: '#A78BFA',
        gradientColors: ['#A78BFA', '#7C3AED'],
        title: 'Complete your profile',
        bullets: [
          'Let creators know your specialisms',
          'Be found by artists looking for your skills',
          'Start receiving collaboration requests',
        ],
        cta: 'Complete Profile',
        navigateTo: 'Profile',
      };
    case 'event_organiser':
      return {
        icon: 'calendar',
        iconColor: '#F59E0B',
        gradientColors: ['#F59E0B', '#D97706'],
        title: 'Create your first event',
        bullets: [
          'Sell tickets directly to your audience',
          'Reach local listeners who match your event type',
          'Track RSVPs and revenue in one place',
        ],
        cta: 'Create Event',
        navigateTo: 'CreateEvent',
      };
    default:
      return null;
  }
}

export default function FirstActionPromptModal({ visible, userType, onDismiss }: Props) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const prompt = getPrompt(userType);

  if (!prompt) return null;

  const handleCta = () => {
    onDismiss();
    navigation.navigate(prompt.navigateTo as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: prompt.iconColor + '20' }]}>
            <Ionicons name={prompt.icon as any} size={32} color={prompt.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>{prompt.title}</Text>

          {/* Bullets */}
          <View style={styles.bullets}>
            {prompt.bullets.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={styles.bulletIcon} />
                <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{bullet}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleCta} activeOpacity={0.85}>
            <LinearGradient
              colors={prompt.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{prompt.cta}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={onDismiss}>
            <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  bullets: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  ctaButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
