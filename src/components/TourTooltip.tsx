import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { markTourComplete, markTourSkipped } from '../services/tourService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TourTooltipProps {
  isFirstStep?: boolean;
  isLastStep?: boolean;
  currentStep: {
    order: number;
    name: string;
    text: string;
  };
  labels: {
    skip?: string;
    previous?: string;
    next?: string;
    finish?: string;
  };
  handleNext?: () => void;
  handlePrev?: () => void;
  handleStop?: () => void;
}

export default function TourTooltip({
  isFirstStep,
  isLastStep,
  currentStep,
  labels,
  handleNext,
  handlePrev,
  handleStop,
}: TourTooltipProps) {
  const handleSkipTour = async () => {
    await markTourSkipped(currentStep.order);
    if (handleStop) {
      handleStop();
    }
  };

  const handleCompleteTour = async () => {
    await markTourComplete();
    if (handleStop) {
      handleStop();
    }
  };

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          <Ionicons name="radio-button-on" size={12} color="#EC4899" />
          <Text style={styles.stepText}>Step {currentStep.order} of 15</Text>
        </View>
        <TouchableOpacity onPress={handleSkipTour} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      {/* Tour Message */}
      <Text style={styles.message}>{currentStep.text}</Text>

      {/* Buttons Row */}
      <View style={styles.buttonsRow}>
        {/* Back Button (not on first step) */}
        {!isFirstStep && handlePrev && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePrev}>
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* Next/Done Button */}
        {isLastStep ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteTour}>
            <Text style={styles.primaryButtonText}>Got it!</Text>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a0b2e',
    borderRadius: 16,
    padding: 20,
    maxWidth: SCREEN_WIDTH * 0.9,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    color: '#EC4899',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  message: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 4,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
