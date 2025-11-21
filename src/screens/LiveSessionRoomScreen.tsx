/**
 * Live Session Room Screen
 * The actual live audio session interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { agoraService } from '../services/AgoraService';
import { generateAgoraTokenWithRetry } from '../services/AgoraTokenService';
import { LiveSession, LiveSessionComment, LiveSessionParticipant, LiveSessionTip } from '../types/liveSession';
import { LiveTippingService } from '../services/LiveTippingService';
import LiveTippingModal from '../components/live-sessions/LiveTippingModal';
import TipNotificationItem from '../components/live-sessions/TipNotificationItem';
import EnhancedParticipantsGrid from '../components/live-sessions/EnhancedParticipantsGrid';
import ParticipantOptionsModal from '../components/live-sessions/ParticipantOptionsModal';

interface LiveSessionRoomScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: string;
      session?: LiveSession;
    };
  };
}

export default function LiveSessionRoomScreen({ navigation, route }: LiveSessionRoomScreenProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { sessionId } = route.params;
  
  // State
  const [session, setSession] = useState<LiveSession | null>(route.params.session || null);
  const [participants, setParticipants] = useState<LiveSessionParticipant[]>([]);
  const [comments, setComments] = useState<LiveSessionComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [tips, setTips] = useState<LiveSessionTip[]>([]);
  const [activeTipNotifications, setActiveTipNotifications] = useState<LiveSessionTip[]>([]);
  const [totalTips, setTotalTips] = useState(0);
  
  // Role & Audio State
  const [myRole, setMyRole] = useState<'listener' | 'speaker' | 'host'>('listener');
  const [isMuted, setIsMuted] = useState(true); // Speakers start muted
  const [handRaised, setHandRaised] = useState(false);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTippingModal, setShowTippingModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<LiveSessionParticipant | null>(null);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // Refs
  const commentsScrollRef = useRef<FlatList>(null);
  const commentsSubscriptionRef = useRef<any>(null);
  const participantsSubscriptionRef = useRef<any>(null);
  const tipsSubscriptionRef = useRef<any>(null);
  const sessionSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    initializeSession();
    
    return () => {
      cleanup();
    };
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Fetch session details if not provided
      let sessionData = session;
      if (!sessionData) {
        const { success, data, error: fetchError } = await dbHelpers.getSessionDetails(sessionId);
        if (!success || !data) {
          throw new Error('Session not found');
        }
        sessionData = data;
        setSession(data);
      }
      
      // 2. Determine user's role
      const isHost = sessionData.creator_id === user?.id;
      let userRole: 'listener' | 'speaker' | 'host' = isHost ? 'host' : 'listener';
      
      // Check if user already has a different role (e.g., previously promoted to speaker)
      // This would happen if they rejoin the session
      // For Phase 4, we'll always start as listener or host
      
      setMyRole(userRole);
      console.log('👤 Joining as:', userRole);
      
      // 3. Initialize Agora engine
      await agoraService.initialize();
      
      // 4. Generate Agora token (token service will check authentication)
      console.log('🔑 [ROOM] Generating Agora token...');
      const agoraRole = (userRole === 'host' || userRole === 'speaker') ? 'publisher' : 'audience';
      const tokenData = await generateAgoraTokenWithRetry(sessionId, agoraRole);
      
      console.log('🎫 [ROOM] Token result:', { 
        success: tokenData.success, 
        hasToken: !!tokenData.token,
        channelName: tokenData.channelName,
        uid: tokenData.uid,
        error: tokenData.error 
      });
      
      if (!tokenData.success || !tokenData.token || !tokenData.channelName || !tokenData.uid) {
        throw new Error(tokenData.error || 'Failed to generate token');
      }
      
      // 6. Join Agora channel with appropriate role
      setIsJoining(true);
      if (userRole === 'host' || userRole === 'speaker') {
        await agoraService.joinAsBroadcaster(tokenData.token, tokenData.channelName, tokenData.uid);
        setIsMuted(true); // Start muted for safety
      } else {
        await agoraService.joinAsListener(tokenData.token, tokenData.channelName, tokenData.uid);
      }
      
      // 7. Create participant record in database
      if (user) {
        await dbHelpers.joinLiveSession(sessionId, user.id, userRole);
      }
      
      // 8. Load initial data
      await Promise.all([
        loadParticipants(),
        loadComments(),
      ]);
      
      // 9. Subscribe to real-time updates
      subscribeToUpdates();
      
      // 10. Setup Agora event listeners for speaking indicators
      setupAgoraListeners();
      
      console.log('✅ Session initialized successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join session';
      console.error('❌ Session initialization error:', errorMessage);
      setError(errorMessage);
      
      Alert.alert(
        'Failed to Join',
        errorMessage,
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Retry',
            onPress: () => initializeSession(),
          },
        ]
      );
    } finally {
      setIsLoading(false);
      setIsJoining(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const { success, data } = await dbHelpers.getSessionParticipants(sessionId);
      if (success && data) {
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { success, data } = await dbHelpers.getSessionComments(sessionId, 100);
      if (success && data) {
        setComments(data);
        // Auto-scroll to bottom
        setTimeout(() => {
          commentsScrollRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to comments
    commentsSubscriptionRef.current = dbHelpers.subscribeToSessionComments(
      sessionId,
      (newComment) => {
        setComments(prev => [...prev, newComment]);
        // Auto-scroll to bottom
        setTimeout(() => {
          commentsScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    // Subscribe to participants
    participantsSubscriptionRef.current = dbHelpers.subscribeToSessionParticipants(
      sessionId,
      () => {
        loadParticipants();
      }
    );

    // Subscribe to tips
    tipsSubscriptionRef.current = dbHelpers.subscribeToSessionTips(
      sessionId,
      (newTip) => {
        console.log('💰 New tip received:', newTip);
        setTips(prev => [...prev, newTip]);
        setTotalTips(prev => prev + (newTip.amount || 0));
        
        // Add to active notifications
        setActiveTipNotifications(prev => [...prev, newTip]);
      }
    );

    // Subscribe to session status changes (to detect when host ends session)
    sessionSubscriptionRef.current = supabase
      .channel(`session_status_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('📡 Session status changed:', payload);
          if (payload.new && payload.new.status === 'ended') {
            setSessionEnded(true);
            setSession(prev => prev ? { ...prev, status: 'ended' } : null);
          }
        }
      )
      .subscribe();
  };

  const cleanup = async () => {
    console.log('🧹 Cleaning up session...');
    
    try {
      // If host is leaving, end the session
      if (myRole === 'host' && user && !sessionEnded) {
        console.log('🔴 Host leaving - ending session...');
        await dbHelpers.endLiveSession(sessionId, user.id);
      }
      
      // Leave Agora channel
      await agoraService.leaveChannel();
      
      // Update participant record
      if (user) {
        await dbHelpers.leaveLiveSession(sessionId, user.id);
      }
      
      // Unsubscribe from real-time
      if (commentsSubscriptionRef.current) {
        await supabase.removeChannel(commentsSubscriptionRef.current);
      }
      if (participantsSubscriptionRef.current) {
        await supabase.removeChannel(participantsSubscriptionRef.current);
      }
      if (tipsSubscriptionRef.current) {
        await supabase.removeChannel(tipsSubscriptionRef.current);
      }
      if (sessionSubscriptionRef.current) {
        await supabase.removeChannel(sessionSubscriptionRef.current);
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleSendComment = async (content?: string) => {
    const messageContent = content || commentText.trim();
    
    if (!messageContent || !user) return;
    
    try {
      setIsSendingComment(true);
      
      const commentType = messageContent.length <= 2 ? 'emoji' : 'text';
      
      const { success, error: sendError } = await dbHelpers.sendSessionComment(
        sessionId,
        user.id,
        messageContent,
        commentType
      );
      
      if (!success) {
        throw new Error(sendError?.message || 'Failed to send comment');
      }
      
      // Clear input only for text comments
      if (!content) {
        setCommentText('');
      }
      
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Error', 'Failed to send comment');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleSendTip = async (amount: number, message?: string) => {
    if (!session?.creator_id) {
      Alert.alert('Error', 'Creator information not available');
      return;
    }

    try {
      await LiveTippingService.sendLiveTip({
        sessionId,
        creatorId: session.creator_id,
        amount,
        message,
      });
      
      console.log('✅ Tip sent successfully');
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      throw error; // Let modal handle the error
    }
  };

  const handleRemoveTipNotification = (tip: LiveSessionTip) => {
    setActiveTipNotifications(prev => prev.filter(t => t.id !== tip.id));
  };

  // ========== Agora Event Listeners ==========
  
  const setupAgoraListeners = () => {
    // Register event handler for Agora v4.x
    agoraService.registerEventHandler({
      // Audio volume indication for speaking indicators
      onAudioVolumeIndication: (connection: any, speakers: any[]) => {
        const newSpeakingUids = new Set<number>();
        speakers.forEach((speaker: any) => {
          if (speaker.volume > 10) { // Threshold to consider as speaking
            newSpeakingUids.add(speaker.uid);
          }
        });
        setSpeakingUids(newSpeakingUids);
      },

      // User joined
      onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
        console.log('👤 User joined Agora channel:', remoteUid);
      },

      // User offline
      onUserOffline: (connection: any, remoteUid: number, reason: number) => {
        console.log('👤 User left Agora channel:', remoteUid);
      },
    });
  };

  // ========== Interactive Speaking Handlers ==========

  const handleRaiseHand = async () => {
    if (!user || myRole !== 'listener') return;

    try {
      const { success } = await dbHelpers.raiseHand(sessionId, user.id);
      if (success) {
        setHandRaised(true);
        Alert.alert(
          'Hand Raised',
          'Your hand is raised. The host may invite you to speak.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error raising hand:', error);
      Alert.alert('Error', 'Failed to raise hand. Please try again.');
    }
  };

  const handleLowerHand = async () => {
    if (!user) return;

    try {
      const { success } = await dbHelpers.lowerHand(sessionId, user.id);
      if (success) {
        setHandRaised(false);
      }
    } catch (error) {
      console.error('Error lowering hand:', error);
    }
  };

  const handleToggleMute = async () => {
    if (myRole === 'listener') return;

    try {
      const newMutedState = !isMuted;
      await agoraService.muteLocalAudio(newMutedState);
      await dbHelpers.toggleMute(sessionId, user!.id, newMutedState);
      setIsMuted(newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  };

  const handleParticipantPress = (participant: LiveSessionParticipant) => {
    if (myRole !== 'host') return; // Only host can manage participants
    if (participant.user_id === user?.id) return; // Can't manage yourself
    if (participant.role === 'host') return; // Can't manage other hosts

    setSelectedParticipant(participant);
    setShowParticipantModal(true);
  };

  const handlePromoteToSpeaker = async (participant: LiveSessionParticipant) => {
    try {
      await dbHelpers.promoteToSpeaker(sessionId, participant.user_id);
      Alert.alert(
        'Promoted!',
        `${participant.user?.display_name} is now a speaker.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error promoting to speaker:', error);
      Alert.alert('Error', 'Failed to promote participant');
    }
  };

  const handleDemoteToListener = async (participant: LiveSessionParticipant) => {
    try {
      await dbHelpers.demoteToListener(sessionId, participant.user_id);
      Alert.alert(
        'Demoted',
        `${participant.user?.display_name} is now a listener.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error demoting to listener:', error);
      Alert.alert('Error', 'Failed to demote participant');
    }
  };

  const handleRemoveParticipant = async (participant: LiveSessionParticipant) => {
    try {
      await dbHelpers.removeParticipant(sessionId, participant.user_id);
      Alert.alert(
        'Removed',
        `${participant.user?.display_name} has been removed from the session.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error removing participant:', error);
      Alert.alert('Error', 'Failed to remove participant');
    }
  };

  // ========== Role Change Handling (from real-time updates) ==========

  useEffect(() => {
    // Monitor participants for role changes affecting current user
    const myParticipant = participants.find(p => p.user_id === user?.id);
    if (myParticipant && myParticipant.role !== myRole) {
      const newRole = myParticipant.role as 'listener' | 'speaker' | 'host';
      console.log('🔄 Role changed from', myRole, 'to', newRole);
      
      // Update local state
      setMyRole(newRole);
      
      // Update Agora role
      if (newRole === 'speaker' || newRole === 'host') {
        agoraService.promoteToSpeaker().then(() => {
          setIsMuted(true); // Start muted
          Alert.alert(
            '🎤 You\'re now a speaker!',
            'You can now unmute and speak in the session.',
            [{ text: 'Got it!' }]
          );
        });
      } else if (newRole === 'listener' && myRole !== 'listener') {
        agoraService.demoteToListener().then(() => {
          setIsMuted(false);
          setHandRaised(false);
          Alert.alert(
            'Demoted to Listener',
            'You can no longer speak in the session.',
            [{ text: 'OK' }]
          );
        });
      }
    }
  }, [participants, user?.id, myRole]);

  const handleLeave = () => {
    Alert.alert(
      'Leave Session',
      'Are you sure you want to leave this live session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Live Session',
      'Are you sure you want to end this session? All participants will be disconnected.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            
            try {
              console.log('🔴 Ending session...');
              const { success, error } = await dbHelpers.endLiveSession(sessionId, user.id);
              
              if (!success || error) {
                throw new Error('Failed to end session');
              }
              
              setSessionEnded(true);
              
              Alert.alert(
                'Session Ended',
                'Your live session has been ended successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('❌ Error ending session:', error);
              Alert.alert('Error', 'Failed to end the session. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle session ended state (when host ends session)
  useEffect(() => {
    if (sessionEnded && myRole !== 'host') {
      Alert.alert(
        'Session Ended',
        'The host has ended this live session.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [sessionEnded, myRole]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          {isJoining ? 'Joining session...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.primary} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => initializeSession()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const speakers = participants.filter(p => p.role === 'speaker' || p.role === 'host');
  const listeners = participants.filter(p => p.role === 'listener');

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleLeave} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {session?.title || 'Live Session'}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText, { color: theme.colors.textSecondary }]}>
                {participants.length} listening
              </Text>
            </View>
          </View>
          
          {myRole === 'host' && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowHostMenu(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          {myRole !== 'host' && <View style={styles.headerButton} />}
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Creator Info */}
            <View style={styles.creatorSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Hosted by
              </Text>
              <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                {session?.creator?.display_name || 'Unknown'}
              </Text>
            </View>

            {/* Participants - Enhanced Grid */}
            <View style={styles.participantsSection}>
              <EnhancedParticipantsGrid
                participants={participants}
                myRole={myRole}
                speakingUids={speakingUids}
                currentUserId={user?.id}
                onParticipantPress={myRole === 'host' ? handleParticipantPress : undefined}
              />
            </View>

            {/* Tips Summary */}
            {totalTips > 0 && (
              <View style={[styles.tipsSummary, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="cash" size={20} color="#FFD700" />
                <Text style={[styles.tipsSummaryText, { color: theme.colors.text }]}>
                  ${totalTips.toFixed(2)} in tips
                </Text>
              </View>
            )}

            {/* Comments */}
            <View style={styles.commentsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Live Chat
              </Text>
              <FlatList
                ref={commentsScrollRef}
                data={comments.slice(-50)} // Show last 50 comments
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.commentBubble}>
                    <Text style={[styles.commentUsername, { color: theme.colors.textSecondary }]}>
                      {item.user?.display_name || 'Anonymous'}
                    </Text>
                    <Text style={[styles.commentText, { color: theme.colors.text }]}>
                      {item.content}
                    </Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
              />
            </View>
          </ScrollView>

          {/* Bottom Controls */}
          <View style={[styles.bottomControls, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            {/* Role-Based Controls */}
            <View style={styles.roleControls}>
              {/* Speaker/Host: Microphone Control */}
              {(myRole === 'speaker' || myRole === 'host') && (
                <TouchableOpacity
                  style={[
                    styles.roleControlButton,
                    isMuted && styles.roleControlButtonMuted,
                    { backgroundColor: isMuted ? theme.colors.surface : theme.colors.primary },
                  ]}
                  onPress={handleToggleMute}
                >
                  <Ionicons
                    name={isMuted ? 'mic-off' : 'mic'}
                    size={24}
                    color={isMuted ? theme.colors.textSecondary : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.roleControlButtonText,
                      { color: isMuted ? theme.colors.textSecondary : '#FFFFFF' },
                    ]}
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Listener: Hand Raise Control */}
              {myRole === 'listener' && (
                <TouchableOpacity
                  style={[
                    styles.roleControlButton,
                    handRaised && styles.roleControlButtonActive,
                    { backgroundColor: handRaised ? theme.colors.primary : theme.colors.surface },
                  ]}
                  onPress={handRaised ? handleLowerHand : handleRaiseHand}
                >
                  <Text style={styles.handEmoji}>✋</Text>
                  <Text
                    style={[
                      styles.roleControlButtonText,
                      { color: handRaised ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {handRaised ? 'Lower Hand' : 'Raise Hand'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Emoji Quick Reactions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiBar}>
              {['👏', '🔥', '❤️', '🎵', '🎤', '💯'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => handleSendComment(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Comment Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Say something..."
                placeholderTextColor={theme.colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={200}
              />
              
              {/* Tip Button */}
              <TouchableOpacity
                style={styles.tipButton}
                onPress={() => setShowTippingModal(true)}
              >
                <LinearGradient
                  colors={['#DC2626', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tipButtonGradient}
                >
                  <Ionicons name="cash" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendButton, { opacity: commentText.trim() ? 1 : 0.5 }]}
                onPress={() => handleSendComment()}
                disabled={!commentText.trim() || isSendingComment}
              >
                {isSendingComment ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons name="send" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Tip Notifications Overlay */}
        <View style={styles.tipNotificationsOverlay} pointerEvents="box-none">
          {activeTipNotifications.map((tip) => (
            <TipNotificationItem
              key={tip.id}
              tip={tip}
              onComplete={() => handleRemoveTipNotification(tip)}
            />
          ))}
        </View>
      </SafeAreaView>

      {/* Tipping Modal */}
      <LiveTippingModal
        visible={showTippingModal}
        creatorName={session?.creator?.display_name || 'Creator'}
        creatorId={session?.creator_id || ''}
        sessionId={sessionId}
        onClose={() => setShowTippingModal(false)}
        onSendTip={handleSendTip}
      />

      {/* Participant Options Modal (Host Only) */}
      {myRole === 'host' && (
        <ParticipantOptionsModal
          visible={showParticipantModal}
          participant={selectedParticipant}
          isHost={true}
          onClose={() => {
            setShowParticipantModal(false);
            setSelectedParticipant(null);
          }}
          onPromoteToSpeaker={handlePromoteToSpeaker}
          onDemoteToListener={handleDemoteToListener}
          onRemoveParticipant={handleRemoveParticipant}
        />
      )}

      {/* Host Menu Modal */}
      <Modal
        visible={showHostMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHostMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHostMenu(false)}
        >
          <View style={[styles.hostMenuContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.hostMenuTitle, { color: theme.colors.text }]}>
              Host Menu
            </Text>
            
            <TouchableOpacity
              style={[styles.hostMenuItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowHostMenu(false);
                handleEndSession();
              }}
            >
              <Ionicons name="stop-circle" size={24} color="#EF4444" />
              <Text style={[styles.hostMenuItemText, { color: '#EF4444' }]}>
                End Session
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hostMenuItem}
              onPress={() => setShowHostMenu(false)}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.hostMenuItemText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  liveText: {
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  creatorSection: {
    padding: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  participantsSection: {
    padding: 16,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  participantCard: {
    padding: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
  },
  commentsSection: {
    padding: 16,
    flex: 1,
  },
  commentsList: {
    marginTop: 8,
    maxHeight: 300,
  },
  commentsListContent: {
    paddingBottom: 16,
  },
  commentBubble: {
    marginBottom: 12,
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomControls: {
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emojiBar: {
    marginBottom: 12,
  },
  emojiButton: {
    padding: 8,
    marginRight: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
  },
  tipButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tipButtonGradient: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    padding: 8,
  },
  tipsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 8,
  },
  tipsSummaryText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipNotificationsOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  roleControls: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  roleControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleControlButtonMuted: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleControlButtonActive: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  roleControlButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  handEmoji: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hostMenuContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
  },
  hostMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  hostMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
    borderBottomWidth: 1,
  },
  hostMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

