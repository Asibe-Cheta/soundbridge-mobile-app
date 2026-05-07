import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function UploadPromptCard() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('Upload' as never)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Upload your music or podcast"
    >
      <View style={styles.left}>
        <Ionicons
          name="cloud-upload"
          size={20}
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text style={[styles.heading, { color: theme.colors.text }]}>
          Upload your music/pod
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
