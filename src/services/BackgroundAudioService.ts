import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';

export interface BackgroundAudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  artwork?: string;
  duration?: number;
}

class BackgroundAudioService {
  private sound: Audio.Sound | null = null;
  private isInitialized = false;
  private currentTrack: BackgroundAudioTrack | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private appStateSubscription: any = null;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio mode for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });


      // Set up app state listener
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

      this.isInitialized = true;
      console.log('🎵 Background audio service initialized');
    } catch (error) {
      console.error('Failed to initialize background audio service:', error);
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('🎵 App state changed to:', nextAppState);
    
    if (nextAppState === 'background' && this.sound && this.isPlaying) {
      console.log('🎵 App went to background, maintaining audio playback');
      // Keep the audio playing in background
    } else if (nextAppState === 'active' && this.sound && this.isPlaying) {
      console.log('🎵 App became active, audio should still be playing');
    }
  }


  async playTrack(track: BackgroundAudioTrack) {
    try {
      await this.initialize();

      // Stop current track if playing
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      this.currentTrack = track;
      
      // Create new sound instance with background playback enabled
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
          progressUpdateIntervalMillis: 1000,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.isPlaying = true;

      console.log('🎵 Started playing track in background:', track.title);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  }

  async pause() {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async resume() {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
      this.position = 0;
    }
  }

  async seekTo(position: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(position);
      this.position = position;
    }
  }

  async setVolume(volume: number) {
    if (this.sound) {
      await this.sound.setVolumeAsync(volume);
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      this.position = status.positionMillis || 0;
      this.duration = status.durationMillis || 0;
      this.isPlaying = status.isPlaying;

      // Debug logging
      console.log('🎵 Background playback status:', {
        isPlaying: status.isPlaying,
        position: this.position,
        duration: this.duration,
        isLoaded: status.isLoaded
      });

      // Handle playback completion
      if (status.didJustFinish) {
        this.onTrackComplete();
      }
    } else {
      console.log('🎵 Background playback status: not loaded', status);
    }
  };

  private onTrackComplete() {
    console.log('🎵 Track completed');
    // You can implement auto-play next track logic here
  }


  // Getters
  getCurrentTrack(): BackgroundAudioTrack | null {
    return this.currentTrack;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getPosition(): number {
    return this.position;
  }

  getDuration(): number {
    return this.duration;
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Export singleton instance
export const backgroundAudioService = new BackgroundAudioService();
