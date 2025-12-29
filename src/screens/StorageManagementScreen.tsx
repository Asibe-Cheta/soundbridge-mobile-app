import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatBytes, getStorageQuotaCached, invalidateStorageCache, StorageQuota, getStorageWarningLevel } from '../services/StorageQuotaService';
import { invalidateQuotaCache } from '../services/UploadQuotaService';
import BackButton from '../components/BackButton';
import * as Haptics from 'expo-haptics';

interface AudioFile {
  id: string;
  title: string;
  file_size: number;
  file_url: string;
  created_at: string;
  genre?: string;
}

type SortOption = 'size' | 'date' | 'name';

export default function StorageManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [files, setFiles] = useState<AudioFile[]>([]);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('size');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load storage quota
      const tier = 'premium'; // TODO: Get actual tier from user profile
      const quota = await getStorageQuotaCached(user.id, tier, true);
      setStorageQuota(quota);

      // Load files
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('id, title, file_size, file_url, created_at, genre')
        .eq('creator_id', user.id)
        .is('deleted_at', null);

      if (error) throw error;

      setFiles(data || []);
    } catch (error) {
      console.error('Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    invalidateStorageCache();
    invalidateQuotaCache();
    loadStorageData();
  };

  const handleDelete = async (file: AudioFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete File',
      `Delete "${file.title}"?\n\nThis will free up ${formatBytes(file.file_size)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(file),
        },
      ]
    );
  };

  const confirmDelete = async (file: AudioFile) => {
    try {
      setDeleting(file.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Soft delete the file (set deleted_at timestamp)
      const { error } = await supabase
        .from('audio_tracks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', file.id);

      if (error) throw error;

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== file.id));

      // Invalidate cache and reload storage quota
      invalidateStorageCache();
      invalidateQuotaCache();

      if (user && storageQuota) {
        const tier = storageQuota.tier;
        const updatedQuota = await getStorageQuotaCached(user.id, tier, true);
        setStorageQuota(updatedQuota);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'File Deleted',
        `${formatBytes(file.file_size)} freed up!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error deleting file:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const getSortedFiles = () => {
    const sorted = [...files];

    switch (sortBy) {
      case 'size':
        return sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
      case 'date':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  };

  const renderSortButton = (option: SortOption, icon: string, label: string) => (
    <TouchableOpacity
      onPress={() => {
        setSortBy(option);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        styles.sortButton,
        sortBy === option && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
        { borderColor: theme.colors.border },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={sortBy === option ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.sortButtonText,
          sortBy === option ? { color: theme.colors.primary, fontWeight: '600' } : { color: theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: AudioFile }) => (
    <View style={[styles.fileItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.fileIcon}>
        <Ionicons
          name="musical-notes"
          size={24}
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.fileInfo}>
        <Text style={[styles.fileTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.fileMeta}>
          <Text style={[styles.fileMetaText, { color: theme.colors.textSecondary }]}>
            {formatBytes(item.file_size || 0)}
          </Text>
          <Text style={[styles.fileMetaText, { color: theme.colors.textSecondary }]}>•</Text>
          <Text style={[styles.fileMetaText, { color: theme.colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => handleDelete(item)}
        style={[styles.deleteButton, { backgroundColor: '#EF4444' + '15' }]}
        activeOpacity={0.7}
        disabled={deleting === item.id}
      >
        {deleting === item.id ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => {
    if (!storageQuota) return null;

    const warningLevel = getStorageWarningLevel(storageQuota.storage_percent_used);
    const progressColor =
      warningLevel === 'critical' ? '#EF4444' :
      warningLevel === 'warning' ? '#F59E0B' : '#10B981';

    return (
      <View style={styles.header}>
        {/* Storage Overview */}
        <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.overviewHeader}>
            <Ionicons name="cloud-outline" size={32} color={theme.colors.text} />
            <View style={styles.overviewText}>
              <Text style={[styles.overviewTitle, { color: theme.colors.text }]}>
                {storageQuota.storage_used_formatted}
              </Text>
              <Text style={[styles.overviewSubtitle, { color: theme.colors.textSecondary }]}>
                of {storageQuota.storage_limit_formatted} used
              </Text>
            </View>
          </View>

          <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, storageQuota.storage_percent_used)}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {Math.round(storageQuota.storage_percent_used)}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Used</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {storageQuota.storage_available_formatted}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Available</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {files.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Files</Text>
            </View>
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={[styles.sortTitle, { color: theme.colors.text }]}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {renderSortButton('size', 'resize-outline', 'Size')}
            {renderSortButton('date', 'calendar-outline', 'Date')}
            {renderSortButton('name', 'text-outline', 'Name')}
          </View>
        </View>

        <Text style={[styles.filesTitle, { color: theme.colors.text }]}>
          Your Files ({files.length})
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cloud-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Files</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Upload your first track to get started
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header Bar */}
        <View style={[styles.headerBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton />
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Storage Management</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={getSortedFiles()}
            renderItem={renderFileItem}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  overviewText: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  sortSection: {
    marginBottom: 20,
  },
  sortTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EC489920',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  fileMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  fileMetaText: {
    fontSize: 12,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
