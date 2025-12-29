import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OnboardingBackButtonProps = TouchableOpacityProps & {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
};

const OnboardingBackButton: React.FC<OnboardingBackButtonProps> = ({
  onPress,
  style,
  accessibilityLabel = 'Go back',
  disabled = false,
  ...rest
}) => {
  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      activeOpacity={0.85}
      style={[
        styles.button,
        {
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      {...rest}
    >
      <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default OnboardingBackButton;
