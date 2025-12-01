import { Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

/**
 * Show upgrade prompt when limit is reached
 */
export function showUpgradePrompt(
  navigation: NavigationProp<any>,
  message?: string,
  limitInfo?: {
    used?: number;
    limit?: number;
    remaining?: number;
    reset_date?: string;
    message?: string;
  }
) {
  const defaultMessage = 'You\'ve reached your limit. Upgrade to Pro for unlimited access.';
  const displayMessage = limitInfo?.message || message || defaultMessage;
  
  const resetInfo = limitInfo?.reset_date 
    ? `\n\nLimits reset on ${new Date(limitInfo.reset_date).toLocaleDateString()}.`
    : '';

  Alert.alert(
    'Upgrade to Pro',
    `${displayMessage}${resetInfo}`,
    [
      { text: 'Maybe Later', style: 'cancel' },
      {
        text: 'Upgrade to Pro',
        onPress: () => navigation.navigate('Upgrade' as never),
      },
    ]
  );
}

/**
 * Check if error is a limit exceeded error (429)
 */
export function isLimitExceededError(error: any): boolean {
  return error?.status === 429 || 
         error?.code === 'MESSAGE_LIMIT_REACHED' ||
         error?.upgradeRequired === true ||
         error?.limit?.upgrade_required === true;
}

/**
 * Extract limit information from error
 */
export function extractLimitInfo(error: any): {
  used?: number;
  limit?: number;
  remaining?: number;
  reset_date?: string;
  message?: string;
  upgrade_required?: boolean;
} | null {
  if (error?.limit) {
    return error.limit;
  }
  if (error?.body?.limit) {
    return error.body.limit;
  }
  if (error?.body?.error?.limit) {
    return error.body.error.limit;
  }
  return null;
}
