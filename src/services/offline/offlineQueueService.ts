import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { feedService } from '../api/feedService';
import { networkService } from '../api/networkService';

interface QueuedAction {
  id: string;
  type: 'post' | 'comment' | 'reaction' | 'connection';
  data: any;
  timestamp: number;
  retryCount: number;
}

export class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private readonly QUEUE_KEY = '@soundbridge_offline_queue';
  private readonly MAX_RETRIES = 3;
  private networkListener: any = null;

  /**
   * Initialize and load persisted queue
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued actions from storage`);
      }

      // Listen for network changes
      this.networkListener = NetInfo.addEventListener((state) => {
        if (state.isConnected && this.queue.length > 0) {
          console.log('🌐 Network connected, processing queue...');
          this.processQueue();
        }
      });

      // Process queue if already online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && this.queue.length > 0) {
        this.processQueue();
      }

      console.log('✅ Offline queue service initialized');
    } catch (error) {
      console.error('❌ Error initializing offline queue:', error);
    }
  }

  /**
   * Add action to queue
   */
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.persist();

    console.log(`📦 Queued action: ${action.type} (${this.queue.length} in queue)`);

    // Try to process immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processQueue();
    }
  }

  /**
   * Process queued actions
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.queue.length} queued actions...`);

    try {
      while (this.queue.length > 0) {
        const action = this.queue[0];

        try {
          await this.executeAction(action);
          this.queue.shift(); // Remove successfully processed action
          console.log(`✅ Processed action: ${action.type} (${action.id})`);
        } catch (error) {
          action.retryCount++;

          if (action.retryCount >= this.MAX_RETRIES) {
            console.error(`❌ Max retries exceeded for action: ${action.type} (${action.id})`);
            this.queue.shift(); // Remove failed action
          } else {
            console.log(`⚠️ Retrying action (${action.retryCount}/${this.MAX_RETRIES}): ${action.type}`);
            // Move to end of queue for retry
            this.queue.shift();
            this.queue.push(action);
            break; // Stop processing and retry later
          }
        }

        await this.persist();
      }
    } finally {
      this.isProcessing = false;
      console.log(`✅ Queue processing complete. ${this.queue.length} actions remaining`);
    }
  }

  /**
   * Execute specific action
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'post':
        await feedService.createPost(action.data);
        break;

      case 'comment':
        await feedService.addComment(action.data.postId, action.data.content, action.data.parentCommentId);
        break;

      case 'reaction':
        await feedService.addReaction(action.data.postId, action.data.reactionType);
        break;

      case 'connection':
        await networkService.sendConnectionRequest(action.data.userId, action.data.message);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ Error persisting offline queue:', error);
    }
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { length: number; isProcessing: boolean } {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persist();
    console.log('🗑️ Offline queue cleared');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}

export const offlineQueueService = new OfflineQueueService();

