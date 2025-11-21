import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';

// Constants for secure storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_EMAIL_KEY = 'biometric_email';
const STORED_PASSWORD_KEY = 'biometric_password';

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  error?: string;
}

export interface BiometricCredentials {
  email: string;
  password: string;
}

/**
 * Check if biometric authentication is available on the device
 */
export const checkBiometricAvailability = async (): Promise<BiometricCapability> => {
  try {
    // Check hardware support
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return {
        available: false,
        enrolled: false,
        types: [],
        error: 'Biometric hardware not available on this device',
      };
    }

    // Check if biometrics are enrolled
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        available: true,
        enrolled: false,
        types: [],
        error: 'No biometrics enrolled. Please set up Face ID or fingerprint in your device settings.',
      };
    }

    // Get available authentication types
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: true,
      enrolled: true,
      types,
    };
  } catch (error) {
    console.error('❌ Error checking biometric availability:', error);
    return {
      available: false,
      enrolled: false,
      types: [],
      error: 'Failed to check biometric availability',
    };
  }
};

/**
 * Get user-friendly name for biometric type
 */
export const getBiometricTypeName = (types: LocalAuthentication.AuthenticationType[]): string => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris Recognition';
  }
  return 'Biometric Authentication';
};

/**
 * Authenticate user with biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check availability first
    const capability = await checkBiometricAvailability();
    if (!capability.available || !capability.enrolled) {
      return {
        success: false,
        error: capability.error || 'Biometrics not available',
      };
    }

    // Get biometric type name for prompt
    const biometricName = getBiometricTypeName(capability.types);

    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Authenticate with ${biometricName}`,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      console.log('✅ Biometric authentication successful');
      return { success: true };
    } else {
      console.log('❌ Biometric authentication failed:', result.error);
      return {
        success: false,
        error: result.error === 'user_cancel' 
          ? 'Authentication cancelled' 
          : 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('❌ Biometric authentication error:', error);
    return {
      success: false,
      error: 'Biometric authentication failed',
    };
  }
};

/**
 * Check if biometric login is enabled
 */
export const isBiometricLoginEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('❌ Error checking biometric login status:', error);
    return false;
  }
};

/**
 * Enable biometric login and store credentials
 */
export const enableBiometricLogin = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verify biometric availability
    const capability = await checkBiometricAvailability();
    if (!capability.available || !capability.enrolled) {
      return {
        success: false,
        error: capability.error || 'Biometrics not available',
      };
    }

    // Authenticate before storing credentials
    const authResult = await authenticateWithBiometrics(
      'Authenticate to enable biometric login'
    );

    if (!authResult.success) {
      return authResult;
    }

    // Store credentials securely
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    console.log('✅ Biometric login enabled successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error enabling biometric login:', error);
    return {
      success: false,
      error: 'Failed to enable biometric login',
    };
  }
};

/**
 * Disable biometric login and clear stored credentials
 */
export const disableBiometricLogin = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Authenticate before disabling
    const authResult = await authenticateWithBiometrics(
      'Authenticate to disable biometric login'
    );

    if (!authResult.success) {
      return authResult;
    }

    // Clear all stored credentials
    await SecureStore.deleteItemAsync(STORED_EMAIL_KEY);
    await SecureStore.deleteItemAsync(STORED_PASSWORD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

    console.log('✅ Biometric login disabled successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error disabling biometric login:', error);
    return {
      success: false,
      error: 'Failed to disable biometric login',
    };
  }
};

/**
 * Get stored credentials after biometric authentication
 */
export const getBiometricCredentials = async (): Promise<BiometricCredentials | null> => {
  try {
    // Check if biometric login is enabled
    const enabled = await isBiometricLoginEnabled();
    if (!enabled) {
      console.log('⚠️ Biometric login not enabled');
      return null;
    }

    // Authenticate user
    const authResult = await authenticateWithBiometrics('Login with biometrics');
    if (!authResult.success) {
      console.log('❌ Biometric authentication failed');
      return null;
    }

    // Retrieve stored credentials
    const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);

    if (!email || !password) {
      console.error('❌ Stored credentials not found');
      // Clear biometric setting if credentials are missing
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      return null;
    }

    console.log('✅ Biometric credentials retrieved successfully');
    return { email, password };
  } catch (error) {
    console.error('❌ Error retrieving biometric credentials:', error);
    return null;
  }
};

/**
 * Show biometric setup prompt with instructions
 */
export const showBiometricSetupPrompt = async (): Promise<void> => {
  const capability = await checkBiometricAvailability();
  
  if (!capability.available) {
    Alert.alert(
      'Biometric Authentication Unavailable',
      'Your device does not support biometric authentication.',
      [{ text: 'OK' }]
    );
    return;
  }

  if (!capability.enrolled) {
    const biometricName = Platform.OS === 'ios' ? 'Face ID or Touch ID' : 'biometric authentication';
    Alert.alert(
      'Set Up Biometric Authentication',
      `Please set up ${biometricName} in your device settings first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            // Platform-specific settings opening would go here
            if (Platform.OS === 'ios') {
              Alert.alert('Go to Settings > Face ID & Passcode');
            } else {
              Alert.alert('Go to Settings > Security > Biometrics');
            }
          },
        },
      ]
    );
  }
};

/**
 * Update stored credentials (e.g., after password change)
 */
export const updateBiometricCredentials = async (
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const enabled = await isBiometricLoginEnabled();
    if (!enabled) {
      return { success: true }; // Not an error if biometric isn't enabled
    }

    // Authenticate before updating
    const authResult = await authenticateWithBiometrics(
      'Authenticate to update stored credentials'
    );

    if (!authResult.success) {
      return authResult;
    }

    // Update stored credentials
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, newPassword);

    console.log('✅ Biometric credentials updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating biometric credentials:', error);
    return {
      success: false,
      error: 'Failed to update stored credentials',
    };
  }
};

