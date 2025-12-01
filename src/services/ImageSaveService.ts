/**
 * Image Save Service
 * 
 * Handles saving images from posts to the device's photo gallery
 */

import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

class ImageSaveService {
  /**
   * Request media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Check if media library permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking media library permissions:', error);
      return false;
    }
  }

  /**
   * Download image from URL and save to gallery
   * @param imageUrl - URL of the image to save
   * @param filename - Optional custom filename (default: image-{timestamp}.jpg)
   */
  async saveImageToGallery(imageUrl: string, filename?: string): Promise<boolean> {
    try {
      console.log('📸 ImageSaveService.saveImageToGallery: Starting...');
      
      // Check/request permissions
      console.log('📸 Checking permissions...');
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        console.log('📸 Requesting permissions...');
        const granted = await this.requestPermissions();
        if (!granted) {
          console.error('❌ Permission denied by user');
          Alert.alert(
            'Permission Required',
            'Please grant photo library access to save images to your gallery.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      console.log('✅ Permissions granted');

      // Generate filename if not provided
      const imageFilename = filename || `soundbridge-${Date.now()}.jpg`;
      console.log('📸 Downloading image to:', imageFilename);

      // Download image to temporary file
      const fileUri = `${FileSystem.cacheDirectory}${imageFilename}`;
      console.log('📸 Download URI:', fileUri);
      console.log('📸 Source URL:', imageUrl);
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      console.log('📸 Download result:', downloadResult);

      if (!downloadResult.uri) {
        throw new Error('Failed to download image - no URI returned');
      }

      console.log('✅ Image downloaded, saving to gallery...');
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      console.log('✅ Asset created:', asset.id);
      
      // Add to default album (Photos on iOS, Pictures on Android)
      const album = await MediaLibrary.getAlbumAsync('SoundBridge');
      if (album) {
        console.log('📸 Adding to existing SoundBridge album');
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        console.log('📸 Creating new SoundBridge album');
        // Create album if it doesn't exist
        await MediaLibrary.createAlbumAsync('SoundBridge', asset, false);
      }
      console.log('✅ Image added to album');

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        console.log('✅ Temporary file cleaned up');
      } catch (cleanupError) {
        // Ignore cleanup errors
        console.warn('⚠️ Failed to cleanup temporary file:', cleanupError);
      }

      return true;
    } catch (error: any) {
      console.error('❌ Error saving image to gallery:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Provide user-friendly error messages
      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        Alert.alert(
          'Permission Denied',
          'Unable to save image. Please grant photo library access in Settings.',
          [{ text: 'OK' }]
        );
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        Alert.alert(
          'Network Error',
          'Failed to download image. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Save Failed',
          'Unable to save image to gallery. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
      return false;
    }
  }

  /**
   * Save image with user feedback
   * Shows success/error alerts
   */
  async saveImageWithFeedback(imageUrl: string, filename?: string): Promise<void> {
    console.log('📸 ImageSaveService: Starting save process for:', imageUrl);
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ ImageSaveService: Invalid image URL provided:', imageUrl);
      Alert.alert('Error', 'Invalid image URL. Cannot save image.', [{ text: 'OK' }]);
      return;
    }

    try {
      const success = await this.saveImageToGallery(imageUrl, filename);
      
      if (success) {
        console.log('✅ ImageSaveService: Image saved successfully');
        Alert.alert('Success', 'Image saved to gallery!', [{ text: 'OK' }]);
      } else {
        console.log('⚠️ ImageSaveService: Save returned false');
      }
    } catch (error) {
      console.error('❌ ImageSaveService: Unexpected error in saveImageWithFeedback:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.', [{ text: 'OK' }]);
    }
  }
}

export const imageSaveService = new ImageSaveService();

