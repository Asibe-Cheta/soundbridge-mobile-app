import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys for tour management
const TOUR_KEYS = {
  HAS_SEEN_TOUR: 'app_tour_has_seen',
  TOUR_COMPLETED_AT: 'app_tour_completed_at',
  TOUR_SKIPPED: 'app_tour_skipped',
  TOUR_SKIPPED_AT: 'app_tour_skipped_at',
  TOUR_SKIPPED_AT_STEP: 'app_tour_skipped_at_step',
};

export interface TourStats {
  hasSeenTour: boolean;
  completedAt: string | null;
  skippedAt: string | null;
  skippedAtStep: number | null;
}

/**
 * Check if the user should see the app tour
 * Returns true only if:
 * - User has NOT seen the tour before
 * - User has NOT skipped the tour before
 */
export async function checkShouldShowTour(): Promise<boolean> {
  try {
    const hasSeenTour = await AsyncStorage.getItem(TOUR_KEYS.HAS_SEEN_TOUR);
    const tourSkipped = await AsyncStorage.getItem(TOUR_KEYS.TOUR_SKIPPED);

    // Don't show tour if user has already seen it or skipped it
    if (hasSeenTour === 'true' || tourSkipped === 'true') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking tour status:', error);
    return false; // Default to not showing tour if there's an error
  }
}

/**
 * Mark the tour as completed
 * Saves completion status and timestamp to AsyncStorage
 */
export async function markTourComplete(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.multiSet([
      [TOUR_KEYS.HAS_SEEN_TOUR, 'true'],
      [TOUR_KEYS.TOUR_COMPLETED_AT, timestamp],
    ]);
    console.log('✅ Tour marked as complete');
  } catch (error) {
    console.error('Error marking tour as complete:', error);
  }
}

/**
 * Mark the tour as skipped
 * Saves skip status, timestamp, and the step number where user skipped
 * @param currentStep - The step number where user clicked skip
 */
export async function markTourSkipped(currentStep: number): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.multiSet([
      [TOUR_KEYS.TOUR_SKIPPED, 'true'],
      [TOUR_KEYS.TOUR_SKIPPED_AT, timestamp],
      [TOUR_KEYS.TOUR_SKIPPED_AT_STEP, currentStep.toString()],
    ]);
    console.log(`⏭️ Tour skipped at step ${currentStep}`);
  } catch (error) {
    console.error('Error marking tour as skipped:', error);
  }
}

/**
 * Reset tour state (for testing or "Restart Tour" feature)
 * Clears all tour-related AsyncStorage keys
 */
export async function resetTour(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      TOUR_KEYS.HAS_SEEN_TOUR,
      TOUR_KEYS.TOUR_COMPLETED_AT,
      TOUR_KEYS.TOUR_SKIPPED,
      TOUR_KEYS.TOUR_SKIPPED_AT,
      TOUR_KEYS.TOUR_SKIPPED_AT_STEP,
    ]);
    console.log('🔄 Tour state reset successfully');
  } catch (error) {
    console.error('Error resetting tour:', error);
  }
}

/**
 * Get tour statistics and metadata
 * Returns an object with tour status information
 */
export async function getTourStats(): Promise<TourStats> {
  try {
    const keys = [
      TOUR_KEYS.HAS_SEEN_TOUR,
      TOUR_KEYS.TOUR_COMPLETED_AT,
      TOUR_KEYS.TOUR_SKIPPED_AT,
      TOUR_KEYS.TOUR_SKIPPED_AT_STEP,
    ];

    const values = await AsyncStorage.multiGet(keys);
    const stats: TourStats = {
      hasSeenTour: values[0][1] === 'true',
      completedAt: values[1][1],
      skippedAt: values[2][1],
      skippedAtStep: values[3][1] ? parseInt(values[3][1], 10) : null,
    };

    return stats;
  } catch (error) {
    console.error('Error getting tour stats:', error);
    return {
      hasSeenTour: false,
      completedAt: null,
      skippedAt: null,
      skippedAtStep: null,
    };
  }
}
