import { Platform } from 'react-native';

const fontFamilyBold = Platform.select({
  ios: 'Inter_700Bold',
  android: 'Inter_700Bold',
  default: 'Inter_700Bold',
});

const fontFamilySemiBold = Platform.select({
  ios: 'Inter_600SemiBold',
  android: 'Inter_600SemiBold',
  default: 'Inter_600SemiBold',
});

const fontFamilyRegular = Platform.select({
  ios: 'Inter_400Regular',
  android: 'Inter_400Regular',
  default: 'Inter_400Regular',
});

const systemFontFamilyBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

const systemFontFamilySemiBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

const systemFontFamilyRegular = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

export const Typography = {
  headerLarge: {
    fontFamily: fontFamilyBold,
    fontSize: 32,
    lineHeight: 38,
  },
  headerMedium: {
    fontFamily: fontFamilySemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamilyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fontFamilyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: fontFamilySemiBold,
    fontSize: 17,
    lineHeight: 22,
  },
};

export const SystemTypography = {
  headerLarge: {
    fontFamily: systemFontFamilyBold,
    fontSize: 32,
    lineHeight: 38,
  },
  headerMedium: {
    fontFamily: systemFontFamilySemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: systemFontFamilyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: systemFontFamilyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: systemFontFamilySemiBold,
    fontSize: 17,
    lineHeight: 22,
  },
};
