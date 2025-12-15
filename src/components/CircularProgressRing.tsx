import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface CircularProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0-100
  backgroundColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
}

export default function CircularProgressRing({
  size,
  strokeWidth,
  progress,
  backgroundColor = 'rgba(255, 255, 255, 0.05)',
  progressColor = '#60A5FA',
  children,
}: CircularProgressRingProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const radius = size / 2;
  const circleRadius = radius - strokeWidth / 2;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const progressPercentage = Math.min(Math.max(progress, 0), 100) / 100;
  
  // Rotation angle: -90deg (top) to 270deg (full circle)
  const rotation = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['-90deg', '270deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring - full circle, always visible */}
      <View
        style={[
          styles.backgroundRing,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* Progress indicator - using rotating mask */}
      {progressPercentage > 0.01 && ( // Only show if progress > 1%
        <View
          style={[
            styles.progressWrapper,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
          pointerEvents="none"
        >
          {/* Mask container that clips the progress arc */}
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              overflow: 'hidden',
            }}
          >
            {/* Progress arc - semicircle that rotates, only visible portion */}
            {progressPercentage <= 0.5 ? (
              <Animated.View
                style={{
                  position: 'absolute',
                  width: size,
                  height: size / 2,
                  top: 0,
                  left: 0,
                  borderWidth: strokeWidth,
                  borderColor: progressColor,
                  borderTopLeftRadius: radius,
                  borderTopRightRadius: radius,
                  borderBottomWidth: 0,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                  transform: [{ rotate: rotation }],
                }}
              />
            ) : (
              <>
                {/* First half - always visible when > 50% */}
                <View
                  style={{
                    position: 'absolute',
                    width: size,
                    height: size / 2,
                    top: 0,
                    left: 0,
                    borderWidth: strokeWidth,
                    borderColor: progressColor,
                    borderTopLeftRadius: radius,
                    borderTopRightRadius: radius,
                    borderBottomWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    transform: [{ rotate: '-90deg' }],
                  }}
                />
                {/* Second half - rotates to show remaining progress */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: size,
                    height: size / 2,
                    top: size / 2,
                    left: 0,
                    borderWidth: strokeWidth,
                    borderColor: progressColor,
                    borderBottomLeftRadius: radius,
                    borderBottomRightRadius: radius,
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    transform: [{ rotate: rotation }],
                  }}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* Children (album art) - positioned inside the ring */}
      {children && (
        <View style={[styles.content, { 
          width: size - (strokeWidth * 2) - 8, // Account for ring + gap
          height: size - (strokeWidth * 2) - 8,
          borderRadius: (size - (strokeWidth * 2) - 8) / 2,
          overflow: 'hidden',
        }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  progressWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  content: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
});
