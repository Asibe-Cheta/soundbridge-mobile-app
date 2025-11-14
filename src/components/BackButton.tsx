import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

type BackButtonProps = TouchableOpacityProps & {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
};

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  style,
  accessibilityLabel = 'Go back',
  disabled = false,
  ...rest
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const isDark = theme.isDark;
  const iconColor = isDark ? '#FF3B30' : '#0F172A';
  const backgroundColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.15)';

  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
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
          backgroundColor,
          borderColor,
          shadowColor: isDark ? '#000000' : '#0F172A',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Ionicons name="chevron-back" size={18} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default BackButton;
