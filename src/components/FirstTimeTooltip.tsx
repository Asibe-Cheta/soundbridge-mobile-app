import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type TooltipAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type FirstTimeTooltipProps = {
  visible: boolean;
  title: string;
  description: string;
  actions: TooltipAction[];
  style?: StyleProp<ViewStyle>;
};

const FirstTimeTooltip: React.FC<FirstTimeTooltipProps> = ({ visible, title, description, actions, style }) => {
  const { theme } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.overlay]}>
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.text,
          },
          style,
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>

        <View style={styles.actionsRow}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.label}
              onPress={action.onPress}
              style={[
                styles.actionButton,
                action.variant === 'primary'
                  ? { backgroundColor: theme.colors.primary }
                  : { borderColor: theme.colors.border, borderWidth: 1 },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.actionText,
                  action.variant === 'primary' ? { color: '#FFFFFF' } : { color: theme.colors.text },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  tooltip: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    maxWidth: 320,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FirstTimeTooltip;

