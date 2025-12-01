import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullScreenImageModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function FullScreenImageModal({
  visible,
  imageUrl,
  onClose,
}: FullScreenImageModalProps) {
  const { theme } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleLongPress = async () => {
    if (!imageUrl) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('📸 FullScreenImageModal: Starting share process for:', imageUrl);
      console.log('📸 Platform:', Platform.OS);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }

      // Download image to temporary file
      const filename = `soundbridge-${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      console.log('📸 Downloading image to:', fileUri);

      // Use fetch to download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('📸 Image downloaded, converting to base64...');
      
      // Convert blob to base64 and write to file
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1] || base64data;
            
            console.log('📸 Writing file...');
            // Write file using FileSystem (works on both iOS and Android)
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('📸 File written, opening native share sheet...');
            
            // Show native share sheet with "Save to Photos/Gallery" option
            // Works on both iOS and Android
            const shareOptions: Sharing.SharingOptions = {
              mimeType: 'image/jpeg',
              dialogTitle: 'Save or Share Image',
            };
            
            // iOS-specific UTI
            if (Platform.OS === 'ios') {
              shareOptions.UTI = 'public.jpeg';
            }
            
            await Sharing.shareAsync(fileUri, shareOptions);
            console.log('✅ Share sheet closed');

            // Clean up temporary file after a delay
            setTimeout(async () => {
              try {
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
                console.log('✅ Temporary file cleaned up');
              } catch (e) {
                console.warn('⚠️ Failed to cleanup:', e);
              }
            }, 1000);

            resolve();
          } catch (error: any) {
            console.error('❌ Error sharing image:', error);
            Alert.alert('Error', 'Failed to share image. Please try again.');
            reject(error);
          }
        };
        reader.onerror = () => {
          Alert.alert('Error', 'Failed to process image.');
          reject(new Error('Failed to read image'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      console.error('❌ Error in handleLongPress:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden={Platform.OS === 'ios'} barStyle="light-content" />
      <SafeAreaView 
        style={[styles.container, { backgroundColor: '#000000' }]} 
        edges={Platform.OS === 'ios' ? [] : ['top', 'bottom']}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          
          {imageError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="image-outline" size={64} color="#666666" />
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              onLongPress={handleLongPress}
              style={styles.imageTouchable}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Hint Text */}
        <View style={styles.hintContainer}>
          <Ionicons name="hand-left-outline" size={16} color="#FFFFFF" style={{ opacity: 0.6 }} />
          <View style={styles.hintTextContainer}>
            <Text style={styles.hintText}>Long press to save or share</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  hintTextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
});

