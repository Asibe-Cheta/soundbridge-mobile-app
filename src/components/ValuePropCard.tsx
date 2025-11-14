import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

type ValuePropCardProps = {
  storageKey?: string;
  onDismiss?: () => void;
};

const STORAGE_KEY_DEFAULT = 'hasSeenValueProp';

const ValuePropCard: React.FC<ValuePropCardProps> = ({ storageKey = STORAGE_KEY_DEFAULT, onDismiss }) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(storageKey);
        if (!storedValue) {
          setVisible(true);
          Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      } catch (error) {
        console.warn('ValuePropCard: Failed to read dismissal state', error);
        setVisible(true);
      }
    };

    checkDismissed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.warn('ValuePropCard: Failed to persist dismissal state', error);
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.text,
          opacity,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={20} color={theme.colors.primary} style={styles.icon} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Why Artists Choose SoundBridge</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton} accessibilityRole="button">
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.pointsList}>
        {valuePoints.map(point => (
          <View key={point} style={styles.pointRow}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={styles.checkIcon} />
            <Text style={[styles.pointText, { color: theme.colors.text }]}>{point}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const valuePoints = [
  'Upload music free (3 tracks)',
  'Only see what you like',
  'Tip artists directly',
  'Connect with creators',
];

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  icon: {
    marginRight: 10,
  },
  closeButton: {
    padding: 6,
  },
  pointsList: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 10,
  },
  pointText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
});

export default ValuePropCard;

