/**
 * ExternalLinksDisplay Component
 * Displays external portfolio links on creator profiles
 * Matches web implementation design specs
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExternalLink } from '../../types/external-links';
import { PLATFORM_METADATA } from '../../config/external-links-config';
import { externalLinksService } from '../../services/ExternalLinksService';

interface ExternalLinksDisplayProps {
  links: ExternalLink[];
  showClickCounts?: boolean; // Show click counts to profile owner
}

export const ExternalLinksDisplay: React.FC<ExternalLinksDisplayProps> = ({
  links,
  showClickCounts = false,
}) => {
  // Use useRef to store scale values that persist across renders
  const scaleValuesRef = React.useRef<Animated.Value[]>([]);

  if (!links || links.length === 0) {
    return null;
  }

  // Sort by display_order
  const sortedLinks = [...links].sort((a, b) => a.display_order - b.display_order);

  // Initialize scale values for each link
  React.useEffect(() => {
    scaleValuesRef.current = sortedLinks.map(() => new Animated.Value(1));
  }, [sortedLinks.length]);

  const handleLinkPress = async (link: ExternalLink, index: number) => {
    // Animate press - only if scale value exists
    const scaleValue = scaleValuesRef.current[index];
    if (scaleValue) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Track click (fire and forget)
    externalLinksService.trackLinkClick(link.id);

    // Open URL
    try {
      const canOpen = await Linking.canOpenURL(link.url);
      if (canOpen) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.linksRow}>
        {sortedLinks.map((link, index) => {
          const metadata = PLATFORM_METADATA[link.platform_type];
          if (!metadata) return null;

          const scaleValue = scaleValuesRef.current[index] || new Animated.Value(1);

          return (
            <Animated.View
              key={link.id}
              style={[
                styles.linkWrapper,
                { transform: [{ scale: scaleValue }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.linkButton,
                  {
                    backgroundColor: `${metadata.color}20`, // 20% opacity
                    borderColor: `${metadata.color}66`, // 40% opacity
                  },
                ]}
                onPress={() => handleLinkPress(link, index)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={metadata.icon as any}
                  size={20}
                  color={metadata.color}
                />
              </TouchableOpacity>
              {showClickCounts && (
                <Text style={styles.clickCount}>{link.click_count}</Text>
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  linkWrapper: {
    marginRight: 12, // 12dp spacing between icons
    marginBottom: 4,
  },
  linkButton: {
    width: 40, // 40dp for mobile
    height: 40,
    borderRadius: 20, // Circle
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clickCount: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
});
