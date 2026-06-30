/**
 * TEMPORARY — iOS background audio isolation test (external coding agent).
 * Bypasses expo-av teasers + STOP_AV_SOUND on iOS. Remove after test result is reported.
 */
import { Platform } from 'react-native';

export const EXPO_AV_BYPASS_FOR_BG_TEST = Platform.OS === 'ios';

export function isExpoAvBypassedForBgTest(): boolean {
  return EXPO_AV_BYPASS_FOR_BG_TEST;
}
