import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
  onPress: () => void;
  visible?: boolean;
}

export default function EventMatchPulseIndicator({ onPress, visible = true }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.9, duration: 1000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 1000, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Events picked for you"
      accessibilityRole="button"
      style={styles.hitArea}
    >
      <View style={styles.anchor}>
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale }], opacity },
          ]}
        />
        <View style={styles.dot} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anchor: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
});
