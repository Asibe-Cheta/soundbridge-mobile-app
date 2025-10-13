import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adService } from '../services/AdService';
import { useTheme } from '../contexts/ThemeContext';

interface AdBannerProps {
  adUnitId?: string;
  onAdLoaded?: () => void;
  onAdError?: (error: string) => void;
  onAdClicked?: () => void;
}

export default function AdBanner({ 
  adUnitId = 'banner-home',
  onAdLoaded,
  onAdError,
  onAdClicked 
}: AdBannerProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    loadAd();
  }, [adUnitId]);

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
      }, 1000);
      
    } catch (error) {
      console.error('Error loading ad:', error);
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

  const handleRetry = () => {
    loadAd();
  };

  if (adError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#666" />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Ad unavailable
          </Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Ionicons name="refresh" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B6B" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading ad...
          </Text>
        </View>
      </View>
    );
  }

  if (!adLoaded) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[styles.container, styles.adContainer, { backgroundColor: theme.colors.card }]}
      onPress={handleAdClick}
      activeOpacity={0.8}
    >
      <View style={styles.adContent}>
        <View style={styles.adInfo}>
          <Text style={[styles.adTitle, { color: theme.colors.text }]}>
            Advertisement
          </Text>
          <Text style={[styles.adDescription, { color: theme.colors.textSecondary }]}>
            Tap to learn more
          </Text>
        </View>
        <View style={styles.adIndicator}>
          <Ionicons name="open-outline" size={16} color={theme.colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  adContainer: {
    minHeight: 60,
    justifyContent: 'center',
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  adDescription: {
    fontSize: 12,
  },
  adIndicator: {
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 8,
    marginRight: 12,
  },
  retryButton: {
    padding: 4,
  },
});
