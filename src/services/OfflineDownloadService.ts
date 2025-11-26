import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
// Note: expo-av removed, using expo-audio if needed in future

export interface OfflineTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverArt?: string;
  url: string;
  localPath: string;
  downloadedAt: string;
  fileSize: number;
}

export interface DownloadProgress {
  trackId: string;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

class OfflineDownloadService {
  private downloads: Map<string, DownloadProgress> = new Map();
  private downloadListeners: ((progress: DownloadProgress) => void)[] = [];
  private STORAGE_KEY = 'offline_tracks';
  private DOWNLOAD_DIR = `${FileSystem.documentDirectory}offline_tracks/`;

  // ===== INITIALIZATION =====
  
  async initialize(): Promise<boolean> {
    try {
      console.log('📱 Initializing offline download service...');
      
      // Ensure download directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.DOWNLOAD_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.DOWNLOAD_DIR, { intermediates: true });
        console.log('📁 Created offline tracks directory');
      }
      
      console.log('✅ Offline download service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize offline download service:', error);
      return false;
    }
  }

  // ===== DOWNLOAD MANAGEMENT =====
  
  async downloadTrack(track: Omit<OfflineTrack, 'localPath' | 'downloadedAt' | 'fileSize'>): Promise<boolean> {
    try {
      const trackId = track.id;
      const fileName = `${trackId}.mp3`;
      const localPath = `${this.DOWNLOAD_DIR}${fileName}`;
      
      console.log('📥 Starting download for track:', track.title);
      
      // Check if already downloaded
      const existingTrack = await this.getOfflineTrack(trackId);
      if (existingTrack) {
        console.log('✅ Track already downloaded:', track.title);
        return true;
      }
      
      // Update download progress
      this.updateDownloadProgress(trackId, {
        trackId,
        progress: 0,
        status: 'downloading'
      });
      
      // Start download
      const downloadResult = await FileSystem.downloadAsync(
        track.url,
        localPath,
        {
          headers: {
            'User-Agent': 'SoundBridge-Mobile/1.0.0'
          }
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) {
        throw new Error('Downloaded file not found');
      }
      
      // Create offline track object
      const offlineTrack: OfflineTrack = {
        ...track,
        localPath,
        downloadedAt: new Date().toISOString(),
        fileSize: fileInfo.size || 0
      };
      
      // Save to storage
      await this.saveOfflineTrack(offlineTrack);
      
      // Update progress
      this.updateDownloadProgress(trackId, {
        trackId,
        progress: 100,
        status: 'completed'
      });
      
      console.log('✅ Track downloaded successfully:', track.title);
      return true;
      
    } catch (error) {
      console.error('❌ Download failed for track:', track.title, error);
      
      this.updateDownloadProgress(track.id, {
        trackId: track.id,
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  async downloadPlaylist(playlistId: string, tracks: Omit<OfflineTrack, 'localPath' | 'downloadedAt' | 'fileSize'>[]): Promise<number> {
    console.log('📥 Starting playlist download:', tracks.length, 'tracks');
    
    let successCount = 0;
    const maxConcurrent = 3; // Limit concurrent downloads
    
    for (let i = 0; i < tracks.length; i += maxConcurrent) {
      const batch = tracks.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (track) => {
        const success = await this.downloadTrack(track);
        if (success) successCount++;
        return success;
      });
      
      await Promise.all(batchPromises);
    }
    
    console.log('✅ Playlist download completed:', successCount, '/', tracks.length);
    return successCount;
  }

  // ===== OFFLINE TRACK MANAGEMENT =====
  
  async getOfflineTracks(): Promise<OfflineTrack[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const tracks: OfflineTrack[] = JSON.parse(stored);
      
      // Verify files still exist
      const validTracks: OfflineTrack[] = [];
      for (const track of tracks) {
        const fileInfo = await FileSystem.getInfoAsync(track.localPath);
        if (fileInfo.exists) {
          validTracks.push(track);
        } else {
          console.log('🗑️ Removing invalid offline track:', track.title);
        }
      }
      
      // Update storage if any tracks were removed
      if (validTracks.length !== tracks.length) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(validTracks));
      }
      
      return validTracks;
    } catch (error) {
      console.error('❌ Error getting offline tracks:', error);
      return [];
    }
  }

  async getOfflineTrack(trackId: string): Promise<OfflineTrack | null> {
    try {
      const tracks = await this.getOfflineTracks();
      return tracks.find(track => track.id === trackId) || null;
    } catch (error) {
      console.error('❌ Error getting offline track:', error);
      return null;
    }
  }

  async removeOfflineTrack(trackId: string): Promise<boolean> {
    try {
      const track = await this.getOfflineTrack(trackId);
      if (!track) return false;
      
      // Delete file
      const fileInfo = await FileSystem.getInfoAsync(track.localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(track.localPath);
      }
      
      // Remove from storage
      const tracks = await this.getOfflineTracks();
      const updatedTracks = tracks.filter(t => t.id !== trackId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedTracks));
      
      console.log('🗑️ Removed offline track:', track.title);
      return true;
    } catch (error) {
      console.error('❌ Error removing offline track:', error);
      return false;
    }
  }

  async clearAllOfflineTracks(): Promise<boolean> {
    try {
      const tracks = await this.getOfflineTracks();
      
      // Delete all files
      for (const track of tracks) {
        const fileInfo = await FileSystem.getInfoAsync(track.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(track.localPath);
        }
      }
      
      // Clear storage
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      
      console.log('🗑️ Cleared all offline tracks:', tracks.length);
      return true;
    } catch (error) {
      console.error('❌ Error clearing offline tracks:', error);
      return false;
    }
  }

  // ===== STORAGE HELPERS =====
  
  private async saveOfflineTrack(track: OfflineTrack): Promise<void> {
    try {
      const tracks = await this.getOfflineTracks();
      const existingIndex = tracks.findIndex(t => t.id === track.id);
      
      if (existingIndex >= 0) {
        tracks[existingIndex] = track;
      } else {
        tracks.push(track);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(tracks));
    } catch (error) {
      console.error('❌ Error saving offline track:', error);
      throw error;
    }
  }

  // ===== DOWNLOAD PROGRESS =====
  
  private updateDownloadProgress(trackId: string, progress: DownloadProgress): void {
    this.downloads.set(trackId, progress);
    this.downloadListeners.forEach(listener => listener(progress));
  }

  getDownloadProgress(trackId: string): DownloadProgress | null {
    return this.downloads.get(trackId) || null;
  }

  addDownloadListener(listener: (progress: DownloadProgress) => void): () => void {
    this.downloadListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.downloadListeners.indexOf(listener);
      if (index > -1) {
        this.downloadListeners.splice(index, 1);
      }
    };
  }

  // ===== UTILITY METHODS =====
  
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    try {
      const tracks = await this.getOfflineTracks();
      const used = tracks.reduce((total, track) => total + track.fileSize, 0);
      
      // Get available space (approximate)
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      const total = dirInfo.size || 0;
      
      return { used, total };
    } catch (error) {
      console.error('❌ Error getting storage usage:', error);
      return { used: 0, total: 0 };
    }
  }

  async isTrackOffline(trackId: string): Promise<boolean> {
    const track = await this.getOfflineTrack(trackId);
    return track !== null;
  }

  getOfflineTrackUrl(trackId: string): string | null {
    // This would be used by the audio player to get local file URL
    return `${this.DOWNLOAD_DIR}${trackId}.mp3`;
  }

  // ===== AUDIO PLAYER INTEGRATION =====
  
  async createOfflineAudioTrack(trackId: string): Promise<any> {
    try {
      const offlineTrack = await this.getOfflineTrack(trackId);
      if (!offlineTrack) return null;
      
      // Create audio source for offline playback
      return {
        uri: `file://${offlineTrack.localPath}`,
        isNetwork: false,
        shouldCache: false
      };
    } catch (error) {
      console.error('❌ Error creating offline audio track:', error);
      return null;
    }
  }
}

// Export singleton instance
export const offlineDownloadService = new OfflineDownloadService();
