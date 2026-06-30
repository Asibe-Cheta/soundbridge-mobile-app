import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  history: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
}

export default function SearchHistoryPanel({ history, onSelect, onRemove, onClearAll }: Props) {
  const { theme } = useTheme();

  if (history.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Recent</Text>
        <TouchableOpacity onPress={onClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.clearAll, { color: theme.colors.primary }]}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {history.map((term, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.item, { borderBottomColor: theme.colors.border }]}
            onPress={() => onSelect(term)}
          >
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <Text style={[styles.itemText, { color: theme.colors.text }]} numberOfLines={1}>
              {term}
            </Text>
            <TouchableOpacity
              onPress={() => onRemove(term)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearAll: {
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
  },
});
