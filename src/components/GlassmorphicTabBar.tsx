import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassmorphicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <BlurView
        intensity={80}
        tint="dark"
        style={[
          styles.blurContainer,
          {
            backgroundColor: 'rgba(37, 25, 70, 0.6)', // #251946 with transparency
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(86, 28, 133, 0.2)', 'rgba(37, 25, 70, 0.3)']} // #561C85 and #251946
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            let iconName: keyof typeof Ionicons.glyphMap;
            if (route.name === 'Feed' || route.name === 'Home') {
              iconName = isFocused ? 'home' : 'home-outline';
            } else if (route.name === 'Discover') {
              iconName = isFocused ? 'search' : 'search-outline';
            } else if (route.name === 'Upload') {
              iconName = isFocused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'Network' || route.name === 'Messages') {
              iconName = isFocused ? 'people' : 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = isFocused ? 'person' : 'person-outline';
            } else {
              iconName = 'ellipse-outline';
            }
            
            // Use custom label if provided, otherwise map route names to display labels
            let displayLabel = typeof label === 'string' ? label : route.name;
            if (route.name === 'Discover' && displayLabel === 'Discover') {
              displayLabel = 'Explore';
            } else if (route.name === 'Network' && displayLabel === 'Network') {
              displayLabel = 'Connect';
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <View style={[
                  styles.tabContent,
                  isFocused && styles.tabContentFocused,
                ]}>
                  <Ionicons
                    name={iconName}
                    size={24}
                    color={isFocused ? theme.colors.primary : 'rgba(255, 255, 255, 0.6)'}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused ? theme.colors.primary : 'rgba(255, 255, 255, 0.6)',
                      },
                    ]}
                  >
                    {displayLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabContentFocused: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)', // red-600 with low opacity
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

