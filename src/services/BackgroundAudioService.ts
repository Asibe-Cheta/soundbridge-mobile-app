import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { AppState, AppStateStatus, Platform } from 'react-native';

export interface BackgroundAudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  artwork?: string;
  duration?: number;
}

class BackgroundAudioService {
  private player: AudioPlayer | null = null;
  private isInitialized = false;
  private currentTrack: BackgroundAudioTrack | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private appStateSubscription: any = null;
  private statusListener: (() => void) | null = null;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio mode for background playback
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
        interruptionMode: 'mixWithOthers',
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
    
    if (nextAppState === 'background' && this.player && this.isPlaying) {
      console.log('🎵 App went to background, maintaining audio playback');
      // Keep the audio playing in background
    } else if (nextAppState === 'active' && this.player && this.isPlaying) {
      console.log('🎵 App became active, audio should still be playing');
    }
  }


  async playTrack(track: BackgroundAudioTrack) {
    try {
      await this.initialize();

      // Stop current track if playing
      if (this.player) {
        this.player.pause();
        if (this.statusListener) {
          this.player.removeListener('playbackStatusUpdate', this.statusListener);
        }
        this.player.remove();
        this.player = null;
      }

      this.currentTrack = track;
      
      // Create new AudioPlayer instance
      this.player = createAudioPlayer(
        { uri: track.url },
        {
          updateInterval: 1000,
          keepAudioSessionActive: true,
        }
      );
      
      // Set up status listener
      this.statusListener = this.onPlaybackStatusUpdate.bind(this);
      this.player.addListener('playbackStatusUpdate', this.statusListener);
      
      // Start playing
      this.player.play();
      this.isPlaying = true;

      console.log('🎵 Started playing track in background:', track.title);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  }

  async pause() {
    if (this.player && this.isPlaying) {
      this.player.pause();
      this.isPlaying = false;
    }
  }

  async resume() {
    if (this.player && !this.isPlaying) {
      this.player.play();
      this.isPlaying = true;
    }
  }

  async stop() {
    if (this.player) {
      this.player.pause();
      if (this.statusListener) {
        this.player.removeListener('playbackStatusUpdate', this.statusListener);
      }
      this.player.remove();
      this.player = null;
      this.isPlaying = false;
      this.position = 0;
      this.statusListener = null;
    }
  }

  async seekTo(position: number) {
    if (this.player) {
      // expo-audio seekTo expects seconds, not milliseconds
      await this.player.seekTo(position / 1000);
      this.position = position;
    }
  }

  async setVolume(volume: number) {
    if (this.player) {
      this.player.volume = volume;
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    // expo-audio status structure
    if (this.player) {
      this.position = Math.floor((this.player.currentTime || 0) * 1000); // Convert seconds to milliseconds
      this.duration = Math.floor((this.player.duration || 0) * 1000); // Convert seconds to milliseconds
      this.isPlaying = this.player.playing || false;

      // Debug logging
      console.log('🎵 Background playback status:', {
        isPlaying: this.isPlaying,
        position: this.position,
        duration: this.duration,
        isLoaded: this.player.isLoaded
      });

      // Handle playback completion
      if (this.player.isLoaded && this.position >= this.duration && this.duration > 0) {
        this.onTrackComplete();
      }
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
    if (this.player) {
      this.player.pause();
      if (this.statusListener) {
        this.player.removeListener('playbackStatusUpdate', this.statusListener);
      }
      this.player.remove();
      this.player = null;
    }
  }
}

// Export singleton instance
export const backgroundAudioService = new BackgroundAudioService();
