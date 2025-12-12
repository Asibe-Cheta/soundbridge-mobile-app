import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import subscriptionService from '../services/SubscriptionService';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
  recipient: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
}

interface ChatScreenProps {
  navigation: any;
  route: {
    params: {
      conversationId: string;
      otherUser: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
        role: string;
      };
    };
  };
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const { conversationId, otherUser } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);
  const readStatusSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    subscribeToReadStatus();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (readStatusSubscriptionRef.current) {
        supabase.removeChannel(readStatusSubscriptionRef.current);
      }
    };
  }, [conversationId, user?.id]);

  const loadMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [userId1, userId2] = conversationId.split('_');
      
      // Fetch messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          read_at,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark messages as read
      await markMessagesAsRead();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    
    try {
      const [userId1, userId2] = conversationId.split('_');
      
      await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .or(`sender_id.eq.${userId1},sender_id.eq.${userId2}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!user) return;
    
    // Subscribe to new messages for current user
    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔔 New message received:', payload.new);
          
          // Fetch the full message with user details
          const { data, error } = await supabase
            .from('messages')
            .select(`
              id,
              sender_id,
              recipient_id,
              content,
              message_type,
              is_read,
              read_at,
              created_at,
              sender:profiles!messages_sender_id_fkey(
                id,
                username,
                display_name,
                avatar_url,
                role
              ),
              recipient:profiles!messages_recipient_id_fkey(
                id,
                username,
                display_name,
                avatar_url,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            // Check if message belongs to current conversation
            const messageSenderId = data.sender_id;
            const messageRecipientId = data.recipient_id;
            const [userId1, userId2] = conversationId.split('_');
            
            const belongsToConversation = 
              (messageSenderId === userId1 && messageRecipientId === userId2) ||
              (messageSenderId === userId2 && messageRecipientId === userId1);
            
            if (belongsToConversation) {
              setMessages(prev => [...prev, data]);
              
              // Auto-scroll to bottom
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
              
              // Mark as read
              await markMessagesAsRead();
            }
          }
        }
      )
      .subscribe();
    
    subscriptionRef.current = subscription;
  };

  const subscribeToReadStatus = () => {
    if (!user) return;
    
    // Subscribe to UPDATE events for messages where current user is sender
    // This will notify us when the recipient reads our messages
    const subscription = supabase
      .channel(`messages-read:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('✅ Message read status updated:', payload.new);
          
          // Check if the updated message belongs to current conversation
          const [userId1, userId2] = conversationId.split('_');
          const updatedMessage = payload.new as any;
          
          const belongsToConversation = 
            (updatedMessage.sender_id === userId1 && updatedMessage.recipient_id === userId2) ||
            (updatedMessage.sender_id === userId2 && updatedMessage.recipient_id === userId1);
          
          if (belongsToConversation) {
            // Update the message in the local state
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, is_read: updatedMessage.is_read, read_at: updatedMessage.read_at }
                : msg
            ));
          }
        }
      )
      .subscribe();
    
    readStatusSubscriptionRef.current = subscription;
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !session) return;

    try {
      setSending(true);

      // Check message limits before sending
      console.log('📬 Checking message limits before sending...');
      const limitCheck = await subscriptionService.canSendMessage(session);

      if (!limitCheck.canSend) {
        console.log('❌ Message limit reached');
        setSending(false);

        Alert.alert(
          'Message Limit Reached',
          limitCheck.reason || 'You have reached your message limit for this month.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade to Pro',
              onPress: () => navigation.navigate('Upgrade' as never),
            },
          ]
        );
        return;
      }

      console.log('✅ Message limit check passed');

      const [userId1, userId2] = conversationId.split('_');
      const recipientId = userId1 === user.id ? userId2 : userId1;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: messageText.trim(),
          message_type: 'text',
          is_read: false
        })
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          read_at,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data]);
        setMessageText('');

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Error',
        'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer]}>
        {!isOwnMessage && (
          <View style={styles.messageAvatar}>
            {otherUser.avatar_url ? (
              <Image
                source={{ uri: otherUser.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage 
            ? { backgroundColor: theme.colors.primary } 
            : { backgroundColor: theme.colors.card }
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage 
              ? { color: '#FFFFFF' } 
              : { color: theme.colors.text }
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage 
                ? { color: 'rgba(255, 255, 255, 0.7)' } 
                : { color: theme.colors.textSecondary }
            ]}>
              {formatTime(item.created_at)}
            </Text>
            {/* Read receipt indicator for sent messages */}
            {isOwnMessage && (
              <View style={styles.readReceipt}>
                {item.is_read ? (
                  <Ionicons 
                    name="checkmark-done" 
                    size={14} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                ) : (
                  <Ionicons 
                    name="checkmark" 
                    size={14} 
                    color="rgba(255, 255, 255, 0.6)" 
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        Start the conversation with {otherUser.display_name}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerUser}>
            {otherUser.avatar_url ? (
              <Image
                source={{ uri: otherUser.avatar_url }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={[styles.headerDefaultAvatar, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.headerUserInfo}>
              <Text style={[styles.headerUserName, { color: theme.colors.text }]} numberOfLines={1}>
                {otherUser.display_name}
              </Text>
              <Text style={[styles.headerUserRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                @{otherUser.username}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Message Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textSecondary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: messageText.trim() ? 1 : 0.5 }]}
                onPress={sendMessage}
                disabled={!messageText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerDefaultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserInfo: {
    flex: 1,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerUserRole: {
    fontSize: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  defaultAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  readReceipt: {
    marginLeft: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

