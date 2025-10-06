// src/services/NativeAudioProcessor.ts
// React Native bridge interface for native audio processing

import { NativeModules, Platform } from 'react-native';

interface NativeAudioProcessorInterface {
  // Initialization
  initialize(): Promise<boolean>;
  
  // Audio Playback
  playAudioFile(filePath: string): Promise<boolean>;
  pausePlayback(): Promise<boolean>;
  resumePlayback(): Promise<boolean>;
  stopPlayback(): Promise<boolean>;
  
  // EQ Controls
  adjustEQBand(bandIndex: number, gain: number): Promise<boolean>;
  setEQPreset(presetName: string): Promise<boolean>;
  
  // AI Enhancement
  toggleAIEnhancement(enabled: boolean, strength: number): Promise<boolean>;
  
  // Spatial Audio
  toggleSpatialAudio(enabled: boolean, width: number): Promise<boolean>;
  
  // Reverb
  setReverb(type: string, wetness: number): Promise<boolean>;
  
  // Utility
  isPlaying(): Promise<boolean>;
  cleanup(): Promise<boolean>;
}

// Get the native module
const { SoundBridgeAudioProcessor } = NativeModules;

class NativeAudioProcessor implements NativeAudioProcessorInterface {
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;

  // ===== INITIALIZATION =====

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      console.log('🎵 Initializing native audio processor...');

      if (!SoundBridgeAudioProcessor) {
        throw new Error('Native audio processor module not found');
      }

      const success = await SoundBridgeAudioProcessor.initialize();
      
      if (success) {
        this.isInitialized = true;
        console.log(`✅ Native audio processor initialized successfully on ${Platform.OS}`);
      } else {
        throw new Error('Native initialization returned false');
      }

      return success;
    } catch (error) {
      console.error('❌ Failed to initialize native audio processor:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  // ===== AUDIO PLAYBACK =====

  async playAudioFile(filePath: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      console.log('🎵 Playing audio file with native processing:', filePath);
      const success = await SoundBridgeAudioProcessor.playAudioFile(filePath);
      
      if (success) {
        console.log('✅ Native audio playback started successfully');
      } else {
        console.warn('⚠️ Native audio playback failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error playing audio file:', error);
      throw error;
    }
  }

  async pausePlayback(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const success = await SoundBridgeAudioProcessor.pausePlayback();
      console.log('⏸️ Native audio playback paused');
      return success;
    } catch (error) {
      console.error('❌ Error pausing playback:', error);
      throw error;
    }
  }

  async resumePlayback(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const success = await SoundBridgeAudioProcessor.resumePlayback();
      console.log('▶️ Native audio playback resumed');
      return success;
    } catch (error) {
      console.error('❌ Error resuming playback:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const success = await SoundBridgeAudioProcessor.stopPlayback();
      console.log('⏹️ Native audio playback stopped');
      return success;
    } catch (error) {
      console.error('❌ Error stopping playback:', error);
      throw error;
    }
  }

  // ===== EQ CONTROLS =====

  async adjustEQBand(bandIndex: number, gain: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      if (bandIndex < 0 || bandIndex > 30) {
        throw new Error(`Invalid EQ band index: ${bandIndex}`);
      }
      
      if (gain < -12 || gain > 12) {
        throw new Error(`Invalid EQ gain: ${gain}dB (must be between -12 and +12)`);
      }
      
      const success = await SoundBridgeAudioProcessor.adjustEQBand(bandIndex, gain);
      
      if (success) {
        console.log(`🎚️ Native EQ band ${bandIndex} adjusted to ${gain}dB`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error adjusting EQ band:', error);
      throw error;
    }
  }

  async setEQPreset(presetName: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const validPresets = ['flat', 'rock', 'pop', 'jazz', 'vocal', 'classical', 'electronic'];
      if (!validPresets.includes(presetName.toLowerCase())) {
        throw new Error(`Invalid EQ preset: ${presetName}`);
      }
      
      const success = await SoundBridgeAudioProcessor.setEQPreset(presetName);
      
      if (success) {
        console.log(`🎚️ Native EQ preset applied: ${presetName}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error setting EQ preset:', error);
      throw error;
    }
  }

  // ===== AI ENHANCEMENT =====

  async toggleAIEnhancement(enabled: boolean, strength: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      if (strength < 0 || strength > 1) {
        throw new Error(`Invalid AI enhancement strength: ${strength} (must be between 0 and 1)`);
      }
      
      const success = await SoundBridgeAudioProcessor.toggleAIEnhancement(enabled, strength);
      
      if (success) {
        console.log(`🤖 Native AI Enhancement ${enabled ? 'enabled' : 'disabled'} with strength ${strength}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error toggling AI enhancement:', error);
      throw error;
    }
  }

  // ===== SPATIAL AUDIO =====

  async toggleSpatialAudio(enabled: boolean, width: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      if (width < 0.5 || width > 2.0) {
        throw new Error(`Invalid spatial audio width: ${width} (must be between 0.5 and 2.0)`);
      }
      
      const success = await SoundBridgeAudioProcessor.toggleSpatialAudio(enabled, width);
      
      if (success) {
        console.log(`🔊 Native Spatial Audio ${enabled ? 'enabled' : 'disabled'} with width ${width}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error toggling spatial audio:', error);
      throw error;
    }
  }

  // ===== REVERB =====

  async setReverb(type: string, wetness: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const validTypes = ['none', 'room', 'hall', 'cathedral', 'plate', 'spring'];
      if (!validTypes.includes(type.toLowerCase())) {
        throw new Error(`Invalid reverb type: ${type}`);
      }
      
      if (wetness < 0 || wetness > 1) {
        throw new Error(`Invalid reverb wetness: ${wetness} (must be between 0 and 1)`);
      }
      
      const success = await SoundBridgeAudioProcessor.setReverb(type, wetness);
      
      if (success) {
        console.log(`🌊 Native Reverb applied: ${type} with wetness ${wetness}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error setting reverb:', error);
      throw error;
    }
  }

  // ===== UTILITY =====

  async isPlaying(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      return await SoundBridgeAudioProcessor.isPlaying();
    } catch (error) {
      console.error('❌ Error checking playback status:', error);
      return false;
    }
  }

  async cleanup(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return true;
      }

      const success = await SoundBridgeAudioProcessor.cleanup();
      
      if (success) {
        this.isInitialized = false;
        this.initializationPromise = null;
        console.log('🧹 Native audio processor cleaned up');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error cleaning up native audio processor:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPERS =====

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ===== PUBLIC GETTERS =====

  get initialized(): boolean {
    return this.isInitialized;
  }

  get platform(): string {
    return Platform.OS;
  }

  get isAvailable(): boolean {
    return !!SoundBridgeAudioProcessor;
  }
}

// Export singleton instance
export const nativeAudioProcessor = new NativeAudioProcessor();

// Export types
export type { NativeAudioProcessorInterface };

// Export utility functions
export const isNativeAudioProcessorAvailable = (): boolean => {
  return !!SoundBridgeAudioProcessor;
};

export const getNativeAudioProcessorInfo = () => {
  return {
    available: isNativeAudioProcessorAvailable(),
    platform: Platform.OS,
    version: Platform.Version,
  };
};
