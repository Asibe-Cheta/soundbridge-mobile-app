import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface GettingStartedChecklistProps {
  userId: string;
  hasCompletedProfile: boolean;
  hasSpProfile: boolean;
  hasPayoutMethod: boolean;
  hasVerification: boolean;
  hasFirstTrack: boolean;
  onGoToProfile: () => void;
  onGoToSpOnboarding: () => void;
  onGoToPaymentMethods: () => void;
  onStartVerification: () => void;
  onGoToUpload: () => void;
}

const STORAGE_KEY_PREFIX = 'sb_gs_v1_';

export default function GettingStartedChecklist({
  userId,
  hasCompletedProfile,
  hasSpProfile,
  hasPayoutMethod,
  hasVerification,
  hasFirstTrack,
  onGoToProfile,
  onGoToSpOnboarding,
  onGoToPaymentMethods,
  onStartVerification,
  onGoToUpload,
}: GettingStartedChecklistProps) {
  const { theme } = useTheme();
  const [shareDone, setShareDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          setShareDone(!!stored.shareDone);
        } catch {}
      }
      setLoaded(true);
    });
  }, [storageKey]);

  const markShareDone = useCallback(() => {
    setShareDone(true);
    AsyncStorage.setItem(storageKey, JSON.stringify({ shareDone: true })).catch(() => {});
  }, [storageKey]);

  const steps: {
    id: string;
    label: string;
    description: string;
    complete: boolean;
    onPress?: () => void;
    isManual?: boolean;
  }[] = [
    {
      id: 'account',
      label: 'Create your account',
      description: '',
      complete: true,
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      description: 'Add name, photo, bio, and genres',
      complete: hasCompletedProfile,
      onPress: onGoToProfile,
    },
    {
      id: 'sp_profile',
      label: 'Set up your Service Provider profile',
      description: 'Add your service categories, headline, and rates',
      complete: hasSpProfile,
      onPress: onGoToSpOnboarding,
    },
    {
      id: 'payout',
      label: 'Add payout details',
      description: 'Connect your bank so SoundBridge can pay you',
      complete: hasPayoutMethod,
      onPress: onGoToPaymentMethods,
    },
    {
      id: 'verification',
      label: 'Complete identity verification',
      description: 'Submit your ID to unlock your verified badge',
      complete: hasVerification,
      onPress: onStartVerification,
    },
    {
      id: 'track',
      label: 'Upload your first track',
      description: 'Share your music with the SoundBridge community',
      complete: hasFirstTrack,
      onPress: onGoToUpload,
    },
    {
      id: 'share',
      label: 'Share your SoundBridge profile link',
      description: 'Add it to Instagram, TikTok, X, YouTube and more — tap Done when you have',
      complete: shareDone,
      isManual: true,
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const allDone = completedCount === steps.length;

  if (!loaded) return null;

  if (allDone) {
    return (
      <LinearGradient
        colors={['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)']}
        style={[styles.card, { borderColor: '#10B98130' }]}
      >
        <View style={styles.congratsContent}>
          <Ionicons name="checkmark-circle" size={36} color="#10B981" />
          <Text style={[styles.congratsTitle, { color: theme.colors.text }]}>
            You're all set.
          </Text>
          <Text style={[styles.congratsBody, { color: theme.colors.textSecondary }]}>
            Your profile is ready to attract clients and fans on SoundBridge.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Getting Started</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {completedCount} of {steps.length} steps complete
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#10B98118' }]}>
          <Text style={styles.badgeText}>
            {Math.round((completedCount / steps.length) * 100)}%
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${(completedCount / steps.length) * 100}%` as any },
          ]}
        />
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const isIncomplete = !step.complete;
          const rowContent = (
            <View style={styles.stepRow}>
              <Ionicons
                name={step.complete ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={step.complete ? '#10B981' : theme.colors.textSecondary}
                style={styles.stepIcon}
              />
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: step.complete ? theme.colors.textSecondary : theme.colors.text },
                    step.complete && styles.doneLine,
                  ]}
                >
                  {step.label}
                </Text>
                {isIncomplete && step.description ? (
                  <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]}>
                    {step.description}
                  </Text>
                ) : null}
              </View>
              {isIncomplete && !step.isManual && step.onPress && (
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              )}
              {isIncomplete && step.isManual && (
                <TouchableOpacity
                  style={[styles.doneBtn, { borderColor: theme.colors.primary }]}
                  onPress={markShareDone}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.doneBtnText, { color: theme.colors.primary }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          );

          return (
            <View key={step.id}>
              {index > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              )}
              {isIncomplete && !step.isManual && step.onPress ? (
                <TouchableOpacity onPress={step.onPress} activeOpacity={0.7}>
                  {rowContent}
                </TouchableOpacity>
              ) : (
                rowContent
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  congratsContent: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  congratsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  congratsBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  steps: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  stepIcon: {
    marginRight: 12,
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  doneLine: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  doneBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
