import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface SearchFilters {
  contentType: 'all' | 'tracks' | 'artists' | 'events' | 'playlists';
  genre: string[];
  duration: {
    min: number;
    max: number;
  };
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  sortBy: 'relevance' | 'newest' | 'oldest' | 'popular' | 'duration';
  sortOrder: 'asc' | 'desc';
  isExplicit: boolean | null; // null = all, true = explicit only, false = clean only
  language: string[];
  location: string;
}

interface AdvancedSearchFiltersProps {
  visible: boolean;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}

const GENRES = [
  'Gospel', 'Afrobeats', 'UK Drill', 'Hip Hop', 'R&B', 'Pop',
  'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Reggae',
  'Folk', 'Blues', 'Funk', 'Soul', 'Alternative', 'Indie'
];

const LANGUAGES = [
  'English', 'Yoruba', 'Igbo', 'Pidgin', 'French', 'Spanish',
  'Portuguese', 'Arabic', 'Swahili', 'Other'
];

const DURATION_RANGES = [
  { label: 'Any', min: 0, max: 3600 },
  { label: 'Short (0-2 min)', min: 0, max: 120 },
  { label: 'Medium (2-5 min)', min: 120, max: 300 },
  { label: 'Long (5+ min)', min: 300, max: 3600 },
];

export default function AdvancedSearchFilters({
  visible,
  filters,
  onFiltersChange,
  onClose,
  onApply,
  onReset,
}: AdvancedSearchFiltersProps) {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const updateFilters = (updates: Partial<SearchFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = localFilters.genre;
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];
    updateFilters({ genre: newGenres });
  };

  const toggleLanguage = (language: string) => {
    const currentLanguages = localFilters.language;
    const newLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter(l => l !== language)
      : [...currentLanguages, language];
    updateFilters({ language: newLanguages });
  };

  const setDurationRange = (range: { min: number; max: number }) => {
    updateFilters({ duration: range });
  };

  const setContentType = (type: SearchFilters['contentType']) => {
    updateFilters({ contentType: type });
  };

  const setSortBy = (sortBy: SearchFilters['sortBy']) => {
    updateFilters({ sortBy });
  };

  const setExplicitFilter = (value: boolean | null) => {
    updateFilters({ isExplicit: value });
  };

  const resetFilters = () => {
    const defaultFilters: SearchFilters = {
      contentType: 'all',
      genre: [],
      duration: { min: 0, max: 3600 },
      dateRange: { start: null, end: null },
      sortBy: 'relevance',
      sortOrder: 'desc',
      isExplicit: null,
      language: [],
      location: '',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onReset();
  };

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const FilterChip = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.background,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        }
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#fff' : theme.colors.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const OptionButton = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        {
          backgroundColor: selected ? theme.colors.primary : 'transparent',
          borderColor: theme.colors.border,
        }
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,
          { color: selected ? '#fff' : theme.colors.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Advanced Search
          </Text>
          <TouchableOpacity onPress={resetFilters} style={styles.headerButton}>
            <Text style={[styles.resetText, { color: theme.colors.primary }]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Content Type */}
          <FilterSection title="Content Type">
            <View style={styles.optionsRow}>
              {(['all', 'tracks', 'artists', 'events', 'playlists'] as const).map(type => (
                <OptionButton
                  key={type}
                  label={type.charAt(0).toUpperCase() + type.slice(1)}
                  selected={localFilters.contentType === type}
                  onPress={() => setContentType(type)}
                />
              ))}
            </View>
          </FilterSection>

          {/* Genres */}
          <FilterSection title="Genres">
            <View style={styles.chipsContainer}>
              {GENRES.map(genre => (
                <FilterChip
                  key={genre}
                  label={genre}
                  selected={localFilters.genre.includes(genre)}
                  onPress={() => toggleGenre(genre)}
                />
              ))}
            </View>
          </FilterSection>

          {/* Duration */}
          <FilterSection title="Duration">
            <View style={styles.optionsRow}>
              {DURATION_RANGES.map((range, index) => (
                <OptionButton
                  key={index}
                  label={range.label}
                  selected={
                    localFilters.duration.min === range.min &&
                    localFilters.duration.max === range.max
                  }
                  onPress={() => setDurationRange(range)}
                />
              ))}
            </View>
          </FilterSection>

          {/* Languages */}
          <FilterSection title="Languages">
            <View style={styles.chipsContainer}>
              {LANGUAGES.map(language => (
                <FilterChip
                  key={language}
                  label={language}
                  selected={localFilters.language.includes(language)}
                  onPress={() => toggleLanguage(language)}
                />
              ))}
            </View>
          </FilterSection>

          {/* Sort By */}
          <FilterSection title="Sort By">
            <View style={styles.optionsRow}>
              {(['relevance', 'newest', 'oldest', 'popular', 'duration'] as const).map(sort => (
                <OptionButton
                  key={sort}
                  label={sort.charAt(0).toUpperCase() + sort.slice(1)}
                  selected={localFilters.sortBy === sort}
                  onPress={() => setSortBy(sort)}
                />
              ))}
            </View>
          </FilterSection>

          {/* Content Rating */}
          <FilterSection title="Content Rating">
            <View style={styles.optionsRow}>
              <OptionButton
                label="All Content"
                selected={localFilters.isExplicit === null}
                onPress={() => setExplicitFilter(null)}
              />
              <OptionButton
                label="Clean Only"
                selected={localFilters.isExplicit === false}
                onPress={() => setExplicitFilter(false)}
              />
              <OptionButton
                label="Explicit Allowed"
                selected={localFilters.isExplicit === true}
                onPress={() => setExplicitFilter(true)}
              />
            </View>
          </FilterSection>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={onApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
