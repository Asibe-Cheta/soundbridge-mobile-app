/**
 * Agora Service - Wrapper for Agora React Native SDK
 * Handles audio streaming, token management, and session lifecycle
 */

import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioScenarioType,
  AudioProfileType,
  IRtcEngine,
} from 'react-native-agora';

// Agora App ID from web team
const AGORA_APP_ID = '7ad7063055ae467f83294e1da8b3be11';

export class AgoraService {
  private engine: IRtcEngine | null = null;
  private isInitialized = false;
  private currentChannelName: string | null = null;
  private listeners: Map<string, Function> = new Map();

  /**
   * Initialize Agora engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ Agora already initialized');
      return;
    }

    try {
      console.log('🎙️ Initializing Agora engine...');
      
      // Create engine instance using v4.x API
      this.engine = createAgoraRtcEngine();
      
      // Initialize the engine with app ID
      this.engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
      
      // Enable audio
      this.engine.enableAudio();
      
      // Set audio profile for high quality
      this.engine.setAudioProfile(
        AudioProfileType.AudioProfileMusicHighQuality,
        AudioScenarioType.AudioScenarioGameStreaming
      );
      
      // Enable audio volume indication (for speaking indicators)
      this.engine.enableAudioVolumeIndication(200, 3, true);
      
      this.isInitialized = true;
      console.log('✅ Agora engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Agora engine:', error);
      throw error;
    }
  }

  /**
   * Join channel as listener (audience)
   */
  async joinAsListener(
    token: string,
    channelName: string,
    uid: number
  ): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      console.log('🎧 Joining as listener...', { channelName, uid });
      
      // Set role to audience (listener)
      this.engine.setClientRole(ClientRoleType.ClientRoleAudience);
      
      // Join channel
      this.engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleAudience,
      });
      
      this.currentChannelName = channelName;
      console.log('✅ Joined channel as listener');
      
    } catch (error) {
      console.error('❌ Failed to join as listener:', error);
      throw error;
    }
  }

  /**
   * Join channel as broadcaster (speaker/host)
   */
  async joinAsBroadcaster(
    token: string,
    channelName: string,
    uid: number
  ): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      console.log('🎤 Joining as broadcaster...', { channelName, uid });
      
      // Set role to broadcaster (speaker)
      this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      
      // Join channel
      this.engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
      
      this.currentChannelName = channelName;
      console.log('✅ Joined channel as broadcaster');
      
    } catch (error) {
      console.error('❌ Failed to join as broadcaster:', error);
      throw error;
    }
  }

  /**
   * Leave current channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.engine) {
      console.warn('⚠️ Agora engine not initialized');
      return;
    }

    try {
      console.log('🚪 Leaving channel...');
      await this.engine.leaveChannel();
      this.currentChannelName = null;
      console.log('✅ Left channel');
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute local audio
   */
  async muteLocalAudio(muted: boolean): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      await this.engine.muteLocalAudioStream(muted);
      console.log(`🔇 Local audio ${muted ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('❌ Failed to mute/unmute:', error);
      throw error;
    }
  }

  /**
   * Switch from listener to broadcaster (when promoted to speaker)
   */
  async promoteToSpeaker(): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      console.log('🎤 Promoting to speaker...');
      this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      console.log('✅ Promoted to speaker');
    } catch (error) {
      console.error('❌ Failed to promote to speaker:', error);
      throw error;
    }
  }

  /**
   * Switch from broadcaster to listener (when demoted)
   */
  async demoteToListener(): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      console.log('🎧 Demoting to listener...');
      this.engine.setClientRole(ClientRoleType.ClientRoleAudience);
      // Mute local audio when becoming listener
      await this.muteLocalAudio(true);
      console.log('✅ Demoted to listener');
    } catch (error) {
      console.error('❌ Failed to demote to listener:', error);
      throw error;
    }
  }

  /**
   * Add event listener (v4.x uses registerEventHandler)
   */
  on(event: string, callback: Function): void {
    if (!this.engine) {
      console.warn('⚠️ Agora engine not initialized');
      return;
    }

    this.listeners.set(event, callback);
    // In v4.x, we register event handlers using registerEventHandler
    // For now, we'll store callbacks and call them from our registered handler
  }

  /**
   * Remove event listener
   */
  off(event: string): void {
    if (!this.engine) return;
    
    this.listeners.delete(event);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (!this.engine) return;
    
    this.listeners.clear();
    // In v4.x, we use unregisterEventHandler
    this.engine.unregisterEventHandler({});
  }

  /**
   * Register event handler for Agora events
   */
  registerEventHandler(handler: any): void {
    if (!this.engine) {
      console.warn('⚠️ Agora engine not initialized');
      return;
    }
    
    this.engine.registerEventHandler(handler);
  }

  /**
   * Destroy engine and cleanup
   */
  async destroy(): Promise<void> {
    if (!this.engine) return;

    try {
      console.log('🗑️ Destroying Agora engine...');
      
      // Leave channel if still in one
      if (this.currentChannelName) {
        await this.leaveChannel();
      }
      
      // Remove all listeners
      this.removeAllListeners();
      
      // Destroy engine
      await this.engine.destroy();
      
      this.engine = null;
      this.isInitialized = false;
      this.currentChannelName = null;
      
      console.log('✅ Agora engine destroyed');
    } catch (error) {
      console.error('❌ Failed to destroy Agora engine:', error);
    }
  }

  /**
   * Get current channel name
   */
  getCurrentChannelName(): string | null {
    return this.currentChannelName;
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get engine instance (for advanced usage)
   */
  getEngine(): IRtcEngine | null {
    return this.engine;
  }
}

// Singleton instance
export const agoraService = new AgoraService();

