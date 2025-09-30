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
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
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
    primary: '#DC2626',
    background: '#F2F2F7', // Apple Music's light background
    surface: '#FFFFFF', // Clean white for cards
    card: '#FFFFFF', // White cards with shadows
    text: '#000000', // Pure black text
    textSecondary: '#8E8E93', // Apple's secondary text color
    border: '#D1D1D6', // Apple's border color
    accent: '#EC4899',
    success: '#34C759', // Apple's green
    warning: '#FF9500', // Apple's orange
    error: '#FF3B30', // Apple's red
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: {
    primary: '#DC2626',
    background: '#000000',
    surface: '#1A1A1A',
    card: '#262626',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#374151',
    accent: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    overlay: 'rgba(0, 0, 0, 0.7)',
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
