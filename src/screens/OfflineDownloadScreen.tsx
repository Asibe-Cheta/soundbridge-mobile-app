import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { offlineDownloadService, OfflineTrack, DownloadProgress } from '../services/OfflineDownloadService';

export default function OfflineDownloadScreen() {
  const navigation = useNavigation();
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 });

  useEffect(() => {
    loadOfflineTracks();
    loadStorageUsage();
    
    // Subscribe to download progress updates
    const unsubscribe = offlineDownloadService.addDownloadListener((progress) => {
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(progress.trackId, progress);
        return newMap;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadOfflineTracks = async () => {
    try {
      setLoading(true);
      const tracks = await offlineDownloadService.getOfflineTracks();
      setOfflineTracks(tracks);
    } catch (error) {
      console.error('Error loading offline tracks:', error);
      Alert.alert('Error', 'Failed to load offline tracks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStorageUsage = async () => {
    try {
      const usage = await offlineDownloadService.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading storage usage:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOfflineTracks();
    loadStorageUsage();
  };

  const handleRemoveTrack = async (track: OfflineTrack) => {
    Alert.alert(
      'Remove Track',
      `Are you sure you want to remove "${track.title}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await offlineDownloadService.removeOfflineTrack(track.id);
            if (success) {
              loadOfflineTracks();
              loadStorageUsage();
            } else {
              Alert.alert('Error', 'Failed to remove track');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Offline Tracks',
      'Are you sure you want to remove all offline tracks? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const success = await offlineDownloadService.clearAllOfflineTracks();
            if (success) {
              loadOfflineTracks();
              loadStorageUsage();
            } else {
              Alert.alert('Error', 'Failed to clear offline tracks');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTrackItem = (track: OfflineTrack) => {
    const progress = downloadProgress.get(track.id);
    
    return (
      <View key={track.id} style={styles.trackItem}>
        <View style={styles.trackImageContainer}>
          {track.coverArt ? (
            <Image source={{ uri: track.coverArt }} style={styles.trackImage} />
          ) : (
            <View style={styles.trackImagePlaceholder}>
              <Ionicons name="musical-notes" size={24} color="#666" />
            </View>
          )}
        </View>
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
          <View style={styles.trackMeta}>
            <Text style={styles.trackSize}>
              {formatFileSize(track.fileSize)}
            </Text>
            <Text style={styles.trackDate}>
              Downloaded {formatDate(track.downloadedAt)}
            </Text>
          </View>
          
          {progress && progress.status === 'downloading' && (
            <View style={styles.downloadProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progress.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress.progress)}%
              </Text>
            </View>
          )}
          
          {progress && progress.status === 'failed' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Download failed: {progress.error}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveTrack(track)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offline Downloads</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading offline tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Downloads</Text>
        {offlineTracks.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
          />
        }
      >
        {/* Storage Usage */}
        <View style={styles.storageSection}>
          <Text style={styles.sectionTitle}>Storage Usage</Text>
          <View style={styles.storageInfo}>
            <Text style={styles.storageText}>
              {formatFileSize(storageUsage.used)} used
            </Text>
            <Text style={styles.storageText}>
              {formatFileSize(storageUsage.total)} available
            </Text>
          </View>
          <View style={styles.storageBar}>
            <View 
              style={[
                styles.storageBarFill, 
                { width: `${(storageUsage.used / storageUsage.total) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Offline Tracks */}
        <View style={styles.tracksSection}>
          <Text style={styles.sectionTitle}>
            Offline Tracks ({offlineTracks.length})
          </Text>
          
          {offlineTracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="download-outline" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No Offline Tracks</Text>
              <Text style={styles.emptySubtitle}>
                Download tracks to listen offline
              </Text>
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={() => navigation.navigate('Discover' as never)}
              >
                <Text style={styles.discoverButtonText}>Discover Music</Text>
              </TouchableOpacity>
            </View>
          ) : (
            offlineTracks.map(renderTrackItem)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  storageSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageText: {
    fontSize: 14,
    color: '#aaa',
  },
  storageBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  tracksSection: {
    padding: 20,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackImageContainer: {
    marginRight: 12,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  trackImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackSize: {
    fontSize: 12,
    color: '#888',
  },
  trackDate: {
    fontSize: 12,
    color: '#888',
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
