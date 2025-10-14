import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adService } from '../services/AdService';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface AdInterstitialProps {
  visible: boolean;
  adUnitId?: string;
  onAdClosed: () => void;
  onAdLoaded?: () => void;
  onAdError?: (error: string) => void;
  onAdClicked?: () => void;
}

export default function AdInterstitial({
  visible,
  adUnitId = 'interstitial-tracks',
  onAdClosed,
  onAdLoaded,
  onAdError,
  onAdClicked,
}: AdInterstitialProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  // Use 3 seconds per mobile UX best practices (web team recommendation)
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (visible) {
      loadAd();
    } else {
      // Reset state when modal closes
      setLoading(true);
      setAdLoaded(false);
      setAdError(null);
      setCountdown(3); // 3 seconds per mobile UX best practices
    }
  }, [visible]);

  useEffect(() => {
    if (adLoaded && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [adLoaded, countdown]);

  const loadAd = async () => {
    try {
      setLoading(true);
      setAdError(null);
      
      // Check if ads are enabled
      if (!adService.isAdEnabled('free')) {
        setAdError('Ads disabled');
        return;
      }

      // Simulate ad loading (replace with real ad network SDK)
      setTimeout(() => {
        setAdLoaded(true);
        setLoading(false);
        onAdLoaded?.();
        
        // Track ad impression
        adService.trackAdEvent({
          type: 'impression',
          adUnitId,
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error loading interstitial ad:', error);
      setAdError(error instanceof Error ? error.message : 'Failed to load ad');
      setLoading(false);
      onAdError?.(error instanceof Error ? error.message : 'Failed to load ad');
    }
  };

  const handleAdClick = () => {
    // Track ad click
    adService.trackAdEvent({
      type: 'click',
      adUnitId,
    });
    
    onAdClicked?.();
    
    // Show alert for demo purposes
    Alert.alert(
      'Ad Clicked',
      'This would open the advertiser\'s website in a real implementation.',
      [{ text: 'OK' }]
    );
  };

  const handleClose = () => {
    if (countdown > 0) {
      return; // Don't allow closing during countdown
    }
    onAdClosed();
  };

  const handleRetry = () => {
    loadAd();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                Loading ad...
              </Text>
            </View>
          )}

          {adError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
              <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                Ad Unavailable
              </Text>
              <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                {adError}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {adLoaded && (
            <>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButtonTop}
                onPress={handleClose}
                disabled={countdown > 0}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={countdown > 0 ? '#666' : theme.colors.text} 
                />
                {countdown > 0 && (
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Ad Content */}
              <TouchableOpacity 
                style={styles.adContent}
                onPress={handleAdClick}
                activeOpacity={0.9}
              >
                <View style={styles.adHeader}>
                  <Text style={[styles.adTitle, { color: theme.colors.text }]}>
                    Advertisement
                  </Text>
                  <Ionicons name="open-outline" size={20} color={theme.colors.textSecondary} />
                </View>
                
                <View style={styles.adBody}>
                  <View style={styles.adImagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#666" />
                  </View>
                  
                  <View style={styles.adTextContainer}>
                    <Text style={[styles.adHeadline, { color: theme.colors.text }]}>
                      Discover Amazing Products
                    </Text>
                    <Text style={[styles.adDescription, { color: theme.colors.textSecondary }]}>
                      Tap to explore our featured collection and find exactly what you're looking for.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.adFooter}>
                  <Text style={[styles.adCta, { color: '#FF6B6B' }]}>
                    Tap to Learn More
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: height * 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  closeButtonTop: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  countdownBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adContent: {
    flex: 1,
    padding: 20,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  adBody: {
    flex: 1,
  },
  adImagePlaceholder: {
    height: 200,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  adTextContainer: {
    marginBottom: 20,
  },
  adHeadline: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },
  adDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  adFooter: {
    alignItems: 'center',
  },
  adCta: {
    fontSize: 16,
    fontWeight: '600',
  },
});
