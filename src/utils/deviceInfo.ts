import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface UploadAttestationData {
  copyrightAttested: boolean;
  agreedAt: string;
  userAgent: string;
  devicePlatform: 'ios' | 'android';
  deviceOS: string;
  appVersion: string;
  deviceModel: string;
  termsVersion: string;
}

/**
 * Collects device information for copyright attestation
 * Used when uploading tracks to create an audit trail
 */
export const collectDeviceInfo = (): UploadAttestationData => {
  const platform = Platform.OS as 'ios' | 'android';
  const osVersion = Platform.Version;
  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const deviceModel = Device.modelName || Device.deviceName || 'Unknown Device';

  // Create user agent string similar to browser user agents
  const userAgent = `SoundBridge/${appVersion} (${platform === 'ios' ? 'iOS' : 'Android'} ${osVersion}; ${deviceModel})`;

  return {
    copyrightAttested: true,
    agreedAt: new Date().toISOString(),
    userAgent,
    devicePlatform: platform,
    deviceOS: `${platform === 'ios' ? 'iOS' : 'Android'} ${osVersion}`,
    appVersion,
    deviceModel,
    termsVersion: 'v1.0.0', // Current terms version
  };
};

/**
 * Format device info for display in admin panels or debug logs
 */
export const formatDeviceInfo = (deviceInfo: UploadAttestationData): string => {
  return `${deviceInfo.devicePlatform.toUpperCase()} ${deviceInfo.deviceOS} - ${deviceInfo.deviceModel} - App v${deviceInfo.appVersion}`;
};
