import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ServiceProviderPromptModalProps {
  visible: boolean;
  onSetupProfile: () => void;
  onRemindLater: () => void;
  onDontShowAgain: () => void;
}

const SERVICE_EXAMPLES = [
  'Backup vocalist',
  'Vocal coaching',
  'Event MC',
  'Music production',
  'Audio engineering',
  'And more...',
];

const VALUE_PROPS = [
  { icon: '✨', text: "It's completely FREE" },
  { icon: '💰', text: 'Keep 95% of what you earn' },
  { icon: '🎯', text: 'Get discovered by those who need your services' },
];

export default function ServiceProviderPromptModal({
  visible,
  onSetupProfile,
  onRemindLater,
  onDontShowAgain,
}: ServiceProviderPromptModalProps) {
  const { theme } = useTheme();

  const handleSetupProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSetupProfile();
  };

  const handleRemindLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemindLater();
  };

  const handleDontShowAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDontShowAgain();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleRemindLater}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Background Gradient */}
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon & Title */}
            <View style={styles.header}>
              <Text style={styles.icon}>💼</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Earn on SoundBridge!
              </Text>
            </View>

            {/* Description */}
            <Text style={[styles.description, { color: theme.colors.text }]}>
              Turn your skills into income!
            </Text>

            <Text style={[styles.subDescription, { color: theme.colors.textSecondary }]}>
              Let people know what you can do for them:
            </Text>

            {/* Service Examples */}
            <View style={styles.serviceList}>
              {SERVICE_EXAMPLES.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <View style={[styles.serviceBullet, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.serviceText, { color: theme.colors.text }]}>
                    {service}
                  </Text>
                </View>
              ))}
            </View>

            {/* Value Propositions */}
            <View style={[styles.valuePropCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {VALUE_PROPS.map((prop, index) => (
                <View key={index} style={styles.valueProp}>
                  <Text style={styles.valuePropIcon}>{prop.icon}</Text>
                  <Text style={[styles.valuePropText, { color: theme.colors.text }]}>
                    {prop.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Primary Button - Setup Profile */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSetupProfile}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryButtonText}>
                  Setup Service Provider Profile
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Button - Remind Later */}
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
              onPress={handleRemindLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                Remind Me Later
              </Text>
            </TouchableOpacity>

            {/* Tertiary Link - Don't Show Again */}
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleDontShowAgain}
              activeOpacity={0.6}
            >
              <Text style={[styles.tertiaryButtonText, { color: theme.colors.textSecondary }]}>
                Don't Show Again
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  subDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  serviceList: {
    marginBottom: 24,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
  },
  serviceBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  serviceText: {
    fontSize: 16,
    fontWeight: '500',
  },
  valuePropCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  valuePropIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  valuePropText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
