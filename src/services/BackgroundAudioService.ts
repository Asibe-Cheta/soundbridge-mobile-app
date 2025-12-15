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

type StatusUpdateCallback = (status: { position: number; duration: number; isPlaying: boolean }) => void;

class BackgroundAudioService {
  private player: AudioPlayer | null = null;
  private isInitialized = false;
  private currentTrack: BackgroundAudioTrack | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private appStateSubscription: any = null;
  private statusListener: (() => void) | null = null;
  private statusCallbacks: Set<StatusUpdateCallback> = new Set();
  private onTrackFinished: (() => void) | null = null;

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

      // Stop current track if playing - ensure complete cleanup
      if (this.player) {
        console.log('🛑 Stopping previous track before playing new one...');
        try {
          this.player.pause();
          if (this.statusListener) {
            this.player.removeListener('playbackStatusUpdate', this.statusListener);
          }
          this.player.remove();
          this.player = null;
          this.statusListener = null;
          console.log('✅ Previous track stopped');
        } catch (error) {
          console.error('Error stopping previous player:', error);
          // Force cleanup
          this.player = null;
          this.statusListener = null;
        }
      }

      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50));

      this.currentTrack = track;
      
      // Create new AudioPlayer instance
      this.player = createAudioPlayer(
        { uri: track.url },
        {
          updateInterval: 500, // Update every 500ms for smoother progress
          keepAudioSessionActive: true,
        }
      );
      
      // Reset position and duration
      this.position = 0;
      this.duration = 0;
      
      // Set up status listener
      this.statusListener = this.onPlaybackStatusUpdate.bind(this);
      this.player.addListener('playbackStatusUpdate', this.statusListener);
      
      // Start playing
      this.player.play();
      this.isPlaying = true;

      // Poll for initial duration (expo-audio may not have it immediately)
      const checkDuration = setInterval(() => {
        if (this.player && this.player.isLoaded && this.player.duration > 0) {
          const initialDuration = Math.floor(this.player.duration);
          const initialPosition = Math.floor(this.player.currentTime || 0);
          
          if (initialDuration !== this.duration) {
            this.duration = initialDuration;
            this.position = initialPosition;
            
            // Notify callbacks immediately
            this.statusCallbacks.forEach(callback => {
              callback({
                position: initialPosition,
                duration: initialDuration,
                isPlaying: this.isPlaying,
              });
            });
            
            console.log('🎵 Initial duration loaded:', initialDuration, 'seconds');
            clearInterval(checkDuration);
          }
        }
      }, 100);
      
      // Stop checking after 5 seconds
      setTimeout(() => clearInterval(checkDuration), 5000);

      console.log('🎵 Started playing track in background:', track.title);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  }

  async pause() {
    console.log('⏸️ Pausing background audio service...');
    if (this.player) {
      try {
        this.player.pause();
        this.isPlaying = false;
        
        // Notify all callbacks that playback has paused
        this.statusCallbacks.forEach(callback => {
          callback({
            position: this.position,
            duration: this.duration,
            isPlaying: false,
          });
        });
        
        console.log('✅ Background audio service paused');
      } catch (error) {
        console.error('Error pausing player:', error);
      }
    } else {
      console.warn('⚠️ No player to pause');
    }
  }

  async resume() {
    console.log('▶️ Resuming background audio service...');
    if (this.player) {
      try {
        this.player.play();
        this.isPlaying = true;
        
        // Notify all callbacks that playback has resumed
        this.statusCallbacks.forEach(callback => {
          callback({
            position: this.position,
            duration: this.duration,
            isPlaying: true,
          });
        });
        
        console.log('✅ Background audio service resumed');
      } catch (error) {
        console.error('Error resuming player:', error);
      }
    } else {
      console.warn('⚠️ No player to resume');
    }
  }

  async stop() {
    console.log('🛑 Stopping background audio service...');
    if (this.player) {
      try {
        this.player.pause();
        if (this.statusListener) {
          this.player.removeListener('playbackStatusUpdate', this.statusListener);
        }
        this.player.remove();
        this.player = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
        this.statusListener = null;
        this.currentTrack = null;
        console.log('✅ Background audio service stopped successfully');
      } catch (error) {
        console.error('Error stopping player:', error);
        // Force cleanup even if there's an error
        this.player = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
        this.statusListener = null;
        this.currentTrack = null;
      }
    }
  }

  async seekTo(position: number) {
    if (this.player) {
      // expo-audio seekTo expects seconds (position is already in seconds from AudioPlayerContext)
      await this.player.seekTo(position);
      this.position = Math.floor(position);
      
      // Notify callbacks of position change
      this.statusCallbacks.forEach(callback => {
        callback({
          position: this.position,
          duration: this.duration,
          isPlaying: this.isPlaying,
        });
      });
      
      console.log('🎵 Seeked to:', position, 'seconds');
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
      // expo-audio provides currentTime and duration in seconds
      const newPosition = Math.floor(this.player.currentTime || 0);
      const newDuration = Math.floor(this.player.duration || 0);
      const newIsPlaying = this.player.playing || false;

      // Check if track finished
      if (newDuration > 0 && newPosition >= newDuration - 0.5 && this.position < newDuration - 0.5) {
        // Track just finished - emit event for context to handle
        this.statusCallbacks.forEach(callback => {
          callback({
            position: newDuration,
            duration: newDuration,
            isPlaying: false,
          });
        });
        // Call track finished callback
        this.onTrackComplete();
        return;
      }

      // Update internal state (stored in seconds)
      const positionChanged = this.position !== newPosition;
      const durationChanged = this.duration !== newDuration;
      
      this.position = newPosition;
      this.duration = newDuration;
      this.isPlaying = newIsPlaying;

      // Notify all callbacks (only if values changed to avoid unnecessary updates)
      if (positionChanged || durationChanged || this.isPlaying !== newIsPlaying) {
        this.statusCallbacks.forEach(callback => {
          callback({
            position: newPosition,
            duration: newDuration,
            isPlaying: newIsPlaying,
          });
        });
      }

      // Debug logging (only when duration is available or position changes significantly)
      if (newDuration > 0 && (durationChanged || newPosition % 5 === 0)) {
        console.log('🎵 Background playback status:', {
          isPlaying: newIsPlaying,
          position: newPosition,
          duration: newDuration,
          isLoaded: this.player.isLoaded
        });
      }

      // Handle playback completion
      if (this.player.isLoaded && newDuration > 0 && newPosition >= newDuration) {
        this.onTrackComplete();
      }
    }
  };

  // Subscribe to status updates
  onStatusUpdate(callback: StatusUpdateCallback): () => void {
    this.statusCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  // Set callback for when track finishes
  setOnTrackFinished(callback: () => void) {
    this.onTrackFinished = callback;
  }

  // Clear track finished callback
  clearOnTrackFinished() {
    this.onTrackFinished = null;
  }

  private onTrackComplete() {
    console.log('🎵 Track completed');
    // Call the track finished callback if set
    if (this.onTrackFinished) {
      this.onTrackFinished();
    }
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
