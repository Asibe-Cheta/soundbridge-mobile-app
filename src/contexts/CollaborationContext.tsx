// src/contexts/CollaborationContext.tsx
// Context for managing collaboration calendar state and operations

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { dbHelpers } from '../lib/supabase';
import { notificationService } from '../services/NotificationService';
import type {
  CreatorAvailability,
  CollaborationRequest,
  BookingStatus,
  CreateAvailabilityRequest,
  CreateCollaborationRequest,
  RespondToRequestData,
  CollaborationFilters,
  ApiResponse,
  PaginatedResponse
} from '../types/collaboration';

interface CollaborationContextType {
  // Availability Management
  availability: CreatorAvailability[];
  loadingAvailability: boolean;
  createAvailabilitySlot: (slotData: CreateAvailabilityRequest) => Promise<boolean>;
  updateAvailabilitySlot: (slotId: string, updates: Partial<CreateAvailabilityRequest>) => Promise<boolean>;
  deleteAvailabilitySlot: (slotId: string) => Promise<boolean>;
  refreshAvailability: () => Promise<void>;

  // Request Management
  requests: CollaborationRequest[];
  loadingRequests: boolean;
  sendCollaborationRequest: (requestData: CreateCollaborationRequest) => Promise<boolean>;
  respondToRequest: (responseData: RespondToRequestData) => Promise<boolean>;
  getRequests: (filters?: CollaborationFilters) => Promise<void>;

  // Booking Status
  getBookingStatus: (creatorId: string) => Promise<BookingStatus | null>;

  // Offline Support
  syncPendingActions: () => Promise<void>;
  hasPendingActions: boolean;

  // Error Handling
  error: string | null;
  clearError: () => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

interface CollaborationProviderProps {
  children: ReactNode;
}

// Offline action types
interface PendingAction {
  id: string;
  type: 'create_availability' | 'send_request' | 'respond_to_request';
  data: any;
  timestamp: number;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const { user } = useAuth();
  
  // State
  const [availability, setAvailability] = useState<CreatorAvailability[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingActions, setHasPendingActions] = useState(false);

  // Load user's availability on mount
  useEffect(() => {
    if (user?.id) {
      refreshAvailability();
      getRequests();
      checkPendingActions();
    }
  }, [user?.id]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  // ===== AVAILABILITY MANAGEMENT =====

  const refreshAvailability = async () => {
    if (!user?.id) return;

    setLoadingAvailability(true);
    try {
      console.log('🔄 Refreshing availability for user:', user.id);
      const response = await dbHelpers.getCreatorAvailability(user.id);
      
      if (response.success && response.data) {
        setAvailability(response.data);
        console.log('✅ Availability refreshed:', response.data.length, 'slots');
      } else {
        console.log('⚠️ No availability data:', response.error);
        setAvailability([]);
      }
    } catch (error) {
      console.error('❌ Error refreshing availability:', error);
      setError('Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const createAvailabilitySlot = async (slotData: CreateAvailabilityRequest): Promise<boolean> => {
    try {
      console.log('📅 Creating availability slot:', slotData);
      
      // Try online first
      const response = await dbHelpers.createAvailabilitySlot(slotData);
      
      if (response.success && response.data) {
        // Add to local state
        setAvailability(prev => [...prev, response.data!].sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        ));
        console.log('✅ Availability slot created:', response.data.id);
        return true;
      } else {
        // Store for offline sync
        await storePendingAction({
          id: `create_${Date.now()}`,
          type: 'create_availability',
          data: slotData,
          timestamp: Date.now()
        });
        setError('Slot will be created when online');
        return false;
      }
    } catch (error) {
      console.error('❌ Error creating availability slot:', error);
      
      // Store for offline sync
      await storePendingAction({
        id: `create_${Date.now()}`,
        type: 'create_availability',
        data: slotData,
        timestamp: Date.now()
      });
      
      setError('Slot will be created when online');
      return false;
    }
  };

  const updateAvailabilitySlot = async (slotId: string, updates: Partial<CreateAvailabilityRequest>): Promise<boolean> => {
    try {
      console.log('📅 Updating availability slot:', slotId);
      
      const response = await dbHelpers.updateAvailabilitySlot(slotId, updates);
      
      if (response.success && response.data) {
        // Update local state
        setAvailability(prev => prev.map(slot => 
          slot.id === slotId ? response.data! : slot
        ));
        console.log('✅ Availability slot updated:', slotId);
        return true;
      } else {
        setError(response.error || 'Failed to update slot');
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating availability slot:', error);
      setError('Failed to update slot');
      return false;
    }
  };

  const deleteAvailabilitySlot = async (slotId: string): Promise<boolean> => {
    try {
      console.log('📅 Deleting availability slot:', slotId);
      
      const response = await dbHelpers.deleteAvailabilitySlot(slotId);
      
      if (response.success) {
        // Remove from local state
        setAvailability(prev => prev.filter(slot => slot.id !== slotId));
        console.log('✅ Availability slot deleted:', slotId);
        return true;
      } else {
        setError(response.error || 'Failed to delete slot');
        return false;
      }
    } catch (error) {
      console.error('❌ Error deleting availability slot:', error);
      setError('Failed to delete slot');
      return false;
    }
  };

  // ===== REQUEST MANAGEMENT =====

  const getRequests = async (filters: CollaborationFilters = {}) => {
    if (!user?.id) return;

    setLoadingRequests(true);
    try {
      console.log('🤝 Getting collaboration requests:', filters);
      const response = await dbHelpers.getCollaborationRequests(filters);
      
      if (response.success && response.data) {
        setRequests(response.data.data);
        console.log('✅ Requests loaded:', response.data.data.length);
      } else {
        console.log('⚠️ No requests data:', response.error);
        setRequests([]);
      }
    } catch (error) {
      console.error('❌ Error getting requests:', error);
      setError('Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const sendCollaborationRequest = async (requestData: CreateCollaborationRequest): Promise<boolean> => {
    try {
      console.log('🤝 Sending collaboration request:', requestData);
      
      // Try online first
      const response = await dbHelpers.sendCollaborationRequest(requestData);
      
      if (response.success && response.data) {
        // Add to local state
        setRequests(prev => [response.data!, ...prev]);
        console.log('✅ Collaboration request sent:', response.data.id);
        return true;
      } else {
        // Store for offline sync
        await storePendingAction({
          id: `request_${Date.now()}`,
          type: 'send_request',
          data: requestData,
          timestamp: Date.now()
        });
        setError('Request will be sent when online');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending collaboration request:', error);
      
      // Store for offline sync
      await storePendingAction({
        id: `request_${Date.now()}`,
        type: 'send_request',
        data: requestData,
        timestamp: Date.now()
      });
      
      setError('Request will be sent when online');
      return false;
    }
  };

  const respondToRequest = async (responseData: RespondToRequestData): Promise<boolean> => {
    try {
      console.log('🤝 Responding to collaboration request:', responseData);
      
      const response = await dbHelpers.respondToCollaborationRequest(responseData);
      
      if (response.success && response.data) {
        // Update local state
        setRequests(prev => prev.map(request => 
          request.id === responseData.requestId ? response.data! : request
        ));
        console.log('✅ Response sent:', responseData.requestId);
        return true;
      } else {
        setError(response.error || 'Failed to respond to request');
        return false;
      }
    } catch (error) {
      console.error('❌ Error responding to request:', error);
      setError('Failed to respond to request');
      return false;
    }
  };

  // ===== BOOKING STATUS =====

  const getBookingStatus = async (creatorId: string): Promise<BookingStatus | null> => {
    try {
      console.log('📊 Getting booking status for:', creatorId);
      const response = await dbHelpers.getCreatorBookingStatus(creatorId);
      
      if (response.success && response.data) {
        console.log('✅ Booking status retrieved:', response.data);
        return response.data;
      } else {
        console.log('⚠️ Failed to get booking status:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting booking status:', error);
      return null;
    }
  };

  // ===== OFFLINE SUPPORT =====

  const storePendingAction = async (action: PendingAction) => {
    try {
      const existingActions = await AsyncStorage.getItem('pending_collaboration_actions');
      const actions: PendingAction[] = existingActions ? JSON.parse(existingActions) : [];
      actions.push(action);
      await AsyncStorage.setItem('pending_collaboration_actions', JSON.stringify(actions));
      setHasPendingActions(true);
      console.log('💾 Stored pending action:', action.type);
    } catch (error) {
      console.error('❌ Error storing pending action:', error);
    }
  };

  const checkPendingActions = async () => {
    try {
      const existingActions = await AsyncStorage.getItem('pending_collaboration_actions');
      const actions: PendingAction[] = existingActions ? JSON.parse(existingActions) : [];
      setHasPendingActions(actions.length > 0);
    } catch (error) {
      console.error('❌ Error checking pending actions:', error);
    }
  };

  const syncPendingActions = async () => {
    try {
      const existingActions = await AsyncStorage.getItem('pending_collaboration_actions');
      const actions: PendingAction[] = existingActions ? JSON.parse(existingActions) : [];
      
      if (actions.length === 0) {
        setHasPendingActions(false);
        return;
      }

      console.log('🔄 Syncing', actions.length, 'pending actions');
      const successfulActions: string[] = [];

      for (const action of actions) {
        try {
          let success = false;

          switch (action.type) {
            case 'create_availability':
              const createResponse = await dbHelpers.createAvailabilitySlot(action.data);
              success = createResponse.success;
              if (success && createResponse.data) {
                setAvailability(prev => [...prev, createResponse.data!]);
              }
              break;

            case 'send_request':
              const requestResponse = await dbHelpers.sendCollaborationRequest(action.data);
              success = requestResponse.success;
              if (success && requestResponse.data) {
                setRequests(prev => [requestResponse.data!, ...prev]);
              }
              break;

            case 'respond_to_request':
              const responseResponse = await dbHelpers.respondToCollaborationRequest(action.data);
              success = responseResponse.success;
              if (success && responseResponse.data) {
                setRequests(prev => prev.map(request => 
                  request.id === action.data.requestId ? responseResponse.data! : request
                ));
              }
              break;
          }

          if (success) {
            successfulActions.push(action.id);
          }
        } catch (error) {
          console.error('❌ Error syncing action:', action.type, error);
        }
      }

      // Remove successful actions
      if (successfulActions.length > 0) {
        const remainingActions = actions.filter(action => !successfulActions.includes(action.id));
        await AsyncStorage.setItem('pending_collaboration_actions', JSON.stringify(remainingActions));
        setHasPendingActions(remainingActions.length > 0);
        console.log('✅ Synced', successfulActions.length, 'actions,', remainingActions.length, 'remaining');
      }
    } catch (error) {
      console.error('❌ Error syncing pending actions:', error);
    }
  };

  // ===== UTILITY FUNCTIONS =====

  const clearError = () => setError(null);

  const value: CollaborationContextType = {
    // Availability Management
    availability,
    loadingAvailability,
    createAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    refreshAvailability,

    // Request Management
    requests,
    loadingRequests,
    sendCollaborationRequest,
    respondToRequest,
    getRequests,

    // Booking Status
    getBookingStatus,

    // Offline Support
    syncPendingActions,
    hasPendingActions,

    // Error Handling
    error,
    clearError,
    
    // Notifications (for future use)
    notificationService
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration(): CollaborationContextType {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}
