import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    primary: string;
    background: string;
    backgroundGradient: {
      start: string;
      middle: string;
      end: string;
    };
    surface: string;
    card: string;
    cardBackground: string; // rgba(255, 255, 255, 0.1) with backdrop blur
    cardHover: string; // rgba(255, 255, 255, 0.2)
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderCard: string; // rgba(255, 255, 255, 0.1)
    accent: string;
    accentRed: string;
    accentPink: string;
    accentPurple: string;
    accentBlue: string;
    gradientPrimary: {
      start: string;
      end: string;
    };
    gradientPrimaryHover: {
      start: string;
      end: string;
    };
    success: string;
    warning: string;
    warningBackground: string;
    warningBorder: string;
    error: string;
    overlay: string;
  };
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const lightTheme: Theme = {
  mode: 'light',
  isDark: false,
  colors: {
    primary: '#DC2626', // red-600
    background: '#F2F2F7', // Apple Music's light background
    backgroundGradient: {
      start: '#F2F2F7',
      middle: '#F2F2F7',
      end: '#F2F2F7',
    },
    surface: '#FFFFFF', // Clean white for cards
    card: '#FFFFFF', // White cards with shadows
    cardBackground: '#FFFFFF', // Solid white for light theme
    cardHover: '#F5F5F5', // Light gray hover
    text: '#000000', // Pure black text
    textSecondary: '#8E8E93', // Apple's secondary text color
    textMuted: '#8E8E93', // Same as secondary for light theme
    border: '#D1D1D6', // Apple's border color
    borderCard: '#D1D1D6', // Same as border for light theme
    accent: '#EC4899', // pink-500
    accentRed: '#DC2626', // red-600
    accentPink: '#EC4899', // pink-500
    accentPurple: '#7C3AED', // purple-600
    accentBlue: '#3B82F6', // blue-500
    gradientPrimary: {
      start: '#DC2626', // red-600
      end: '#EC4899', // pink-500
    },
    gradientPrimaryHover: {
      start: '#B91C1C', // red-700
      end: '#DB2777', // pink-600
    },
    success: '#34C759', // Apple's green
    warning: '#FF9500', // Apple's orange
    warningBackground: 'rgba(255, 149, 0, 0.2)', // orange/20
    warningBorder: 'rgba(255, 149, 0, 0.3)', // orange/30
    error: '#FF3B30', // Apple's red
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: {
    primary: '#DC2626', // red-600
    background: '#0A0E1A', // Darker base with blue tones (ElevenLabs-inspired)
    backgroundGradient: {
      start: '#111827', // gray-900
      middle: '#581c87', // purple-900
      end: '#111827', // gray-900
    },
    surface: 'rgba(26, 35, 50, 0.4)', // Blue-gray with transparency for glassmorphism
    card: 'rgba(26, 35, 50, 0.6)', // Blue-gray card with more opacity
    cardBackground: 'rgba(59, 130, 246, 0.08)', // Light blue tint with low opacity for glassmorphism
    cardHover: 'rgba(59, 130, 246, 0.15)', // Slightly more blue on hover
    text: '#FFFFFF', // white
    textSecondary: 'rgba(255, 255, 255, 0.85)', // white/85
    textMuted: 'rgba(255, 255, 255, 0.6)', // white/60
    border: 'rgba(147, 197, 253, 0.2)', // Light blue border (ElevenLabs-style)
    borderCard: 'rgba(147, 197, 253, 0.15)', // Lighter blue border for cards
    accent: '#EC4899', // pink-500
    accentRed: '#DC2626', // red-600
    accentPink: '#EC4899', // pink-500
    accentPurple: '#7C3AED', // purple-600
    accentBlue: '#60A5FA', // Lighter blue-400 (ElevenLabs-inspired, was blue-500)
    gradientPrimary: {
      start: '#DC2626', // red-600
      end: '#EC4899', // pink-500
    },
    gradientPrimaryHover: {
      start: '#B91C1C', // red-700
      end: '#DB2777', // pink-600
    },
    success: '#10B981', // emerald-500
    warning: '#FCD34D', // yellow-400
    warningBackground: 'rgba(234, 179, 8, 0.2)', // yellow-500/20
    warningBorder: 'rgba(234, 179, 8, 0.3)', // yellow-500/30
    error: '#EF4444', // red-500
    overlay: 'rgba(10, 14, 26, 0.85)', // Dark blue overlay
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@soundbridge_theme_mode';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const currentIsDark = getCurrentTheme().isDark;
    setThemeMode(currentIsDark ? 'light' : 'dark');
  };

  const getCurrentTheme = (): Theme => {
    let isDark: boolean;
    
    if (themeMode === 'system') {
      isDark = systemColorScheme === 'dark';
    } else {
      isDark = themeMode === 'dark';
    }

    return isDark ? darkTheme : lightTheme;
  };

  const theme = getCurrentTheme();

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
