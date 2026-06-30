import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

// Features the user is losing access to
const LOSING_FEATURES = [
  { icon: 'cloud-upload-outline',  label: 'Unlimited music uploads' },
  { icon: 'bulb-outline',          label: 'AI Career Adviser' },
  { icon: 'analytics-outline',     label: 'Advanced event analytics' },
  { icon: 'megaphone-outline',     label: 'Headline Posts' },
  { icon: 'cut-outline',           label: 'Audio snippet trimmer' },
  { icon: 'rocket-outline',        label: 'Priority discovery placement' },
];

interface Props {
  visible: boolean;
  copyVariant: 'standard' | 'final';
  onContinuePremium: () => void;
  onRemindLater: () => void;
  onContinueFree: () => void;
}

export default function EarlyAdopterConversionModal({
  visible,
  copyVariant,
  onContinuePremium,
  onRemindLater,
  onContinueFree,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const headline = copyVariant === 'final'
    ? 'Still thinking about it?'
    : 'You have been here from the start.';

  const subtext = copyVariant === 'final'
    ? 'Premium is waiting for you whenever you are ready. Everything you had before is still there.'
    : 'Your 3 month Premium access has now ended. Thank you for being one of our earliest supporters. We built something we are proud of and you were part of that.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Blurred backdrop */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 0}
          tint={isDark ? 'dark' : 'dark'}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[StyleSheet.absoluteFillObject, styles.backdropTint]} />

        {/* Card */}
        <View style={[styles.card, { backgroundColor: isDark ? '#0F1526' : '#fff' }]}>

          {/* Gradient header band */}
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBand}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.bandText}>Early Adopter</Text>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Headline */}
            <Text style={[styles.headline, { color: theme.colors.text }]}>
              {headline}
            </Text>

            {/* Subtext */}
            <Text style={[styles.subtext, { color: theme.colors.textSecondary }]}>
              {subtext}
            </Text>

            {/* Feature list */}
            <View style={[styles.featureBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
              <Text style={[styles.featureBoxTitle, { color: theme.colors.textSecondary }]}>
                What you had with Premium
              </Text>
              {LOSING_FEATURES.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <Ionicons name={f.icon as any} size={16} color="#DC2626" style={styles.featureIcon} />
                  <Text style={[styles.featureLabel, { color: theme.colors.text }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Pricing line */}
            <Text style={[styles.pricingLine, { color: theme.colors.textSecondary }]}>
              Continue as a Premium member for just{' '}
              <Text style={[styles.pricingHighlight, { color: theme.colors.text }]}>£6.99 per month.</Text>
            </Text>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Primary CTA */}
            <TouchableOpacity
              onPress={onContinuePremium}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Continue as Premium</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Remind me later */}
            <TouchableOpacity
              onPress={onRemindLater}
              activeOpacity={0.7}
              style={[styles.secondaryBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>
                Remind me later
              </Text>
            </TouchableOpacity>

            {/* Continue with Free */}
            <TouchableOpacity onPress={onContinueFree} activeOpacity={0.6} style={styles.tertiaryBtn}>
              <Text style={[styles.tertiaryBtnText, { color: theme.colors.textSecondary }]}>
                Continue with Free plan
              </Text>
            </TouchableOpacity>
          </View>

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
  backdropTint: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  // Header band
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bandText: {
    ...Typography.label,
    color: '#fff',
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },

  // Scroll area
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
    gap: 16,
  },
  headline: {
    ...Typography.headerMedium,
    fontSize: 24,
    lineHeight: 30,
  },
  subtext: {
    ...Typography.body,
    lineHeight: 24,
  },

  // Feature list
  featureBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  featureBoxTitle: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 20,
  },
  featureLabel: {
    ...Typography.body,
    fontSize: 14,
    flex: 1,
  },

  // Pricing
  pricingLine: {
    ...Typography.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  pricingHighlight: {
    fontWeight: '700' as const,
  },

  // Action buttons
  actions: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  primaryBtnWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryBtn: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...Typography.button,
    color: '#fff',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...Typography.button,
    fontSize: 15,
  },
  tertiaryBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  tertiaryBtnText: {
    ...Typography.label,
    textDecorationLine: 'underline',
  },
});
