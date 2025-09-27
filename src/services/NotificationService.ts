import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  newTracks: boolean;
  messages: boolean;
  followers: boolean;
  likes: boolean;
  comments: boolean;
  playlistUpdates: boolean;
  systemUpdates: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private settings: NotificationSettings = {
    enabled: true,
    newTracks: true,
    messages: true,
    followers: true,
    likes: true,
    comments: true,
    playlistUpdates: true,
    systemUpdates: true,
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get the token that uniquely identifies this device
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });

      this.expoPushToken = token.data;
      console.log('Expo Push Token:', this.expoPushToken);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'SoundBridge',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    // TODO: Save to AsyncStorage or send to backend
    console.log('Notification settings updated:', this.settings);
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Notification types for different events
  async notifyNewTrack(artistName: string, trackTitle: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.newTracks) return;
    
    await this.scheduleLocalNotification(
      'New Track Available! 🎵',
      `${artistName} just released "${trackTitle}"`,
      { type: 'new_track', artistName, trackTitle }
    );
  }

  async notifyNewMessage(senderName: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.messages) return;
    
    await this.scheduleLocalNotification(
      'New Message 💬',
      `${senderName} sent you a message`,
      { type: 'message', senderName }
    );
  }

  async notifyNewFollower(followerName: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.followers) return;
    
    await this.scheduleLocalNotification(
      'New Follower! 👥',
      `${followerName} started following you`,
      { type: 'follower', followerName }
    );
  }

  async notifyTrackLiked(likerName: string, trackTitle: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.likes) return;
    
    await this.scheduleLocalNotification(
      'Track Liked! ❤️',
      `${likerName} liked your track "${trackTitle}"`,
      { type: 'like', likerName, trackTitle }
    );
  }

  async notifyNewComment(commenterName: string, trackTitle: string): Promise<void> {
    if (!this.settings.enabled || !this.settings.comments) return;
    
    await this.scheduleLocalNotification(
      'New Comment 💭',
      `${commenterName} commented on "${trackTitle}"`,
      { type: 'comment', commenterName, trackTitle }
    );
  }
}

export default NotificationService.getInstance();
