/**
 * Time Window Validation Helper
 * Checks if current time is within user's notification time window
 */

/**
 * Check if current time is within notification time window
 * @param startHour User's notification start hour (0-23)
 * @param endHour User's notification end hour (0-23)
 * @param timezone User's timezone (optional, defaults to UTC)
 * @returns true if within window, false otherwise
 */
export function isWithinTimeWindow(
  startHour: number,
  endHour: number,
  timezone: string = 'UTC'
): boolean {
  try {
    // Get current hour in user's timezone
    const now = new Date();
    const currentHour = parseInt(
      now.toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone
      })
    );

    // Handle same-day time window (e.g., 8 AM - 10 PM)
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    }

    // Handle overnight time window (e.g., 10 PM - 6 AM)
    return currentHour >= startHour || currentHour <= endHour;

  } catch (error) {
    console.error('Error checking time window:', error);
    // Default to allowing notification if timezone check fails
    return true;
  }
}

/**
 * Get user-friendly time window description
 */
export function formatTimeWindow(startHour: number, endHour: number): string {
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}
