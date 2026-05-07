import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Vibration,
  Dimensions,
  Animated,
  Clipboard,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import VerifiedAvatar from '../components/VerifiedAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers, supabase } from '../lib/supabase';
import { useOnlinePresence } from '../hooks/useOnlinePresence';

const { height: SCREEN_H } = Dimensions.get('window');

interface ReplyData {
  replyTo: { content: string; senderName: string };
  text: string;
}

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
      otherUser?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
        is_verified?: boolean;
        role: string;
      };
      recipientId?: string;
    };
  };
}

function parseReplyContent(content: string, _type?: string): ReplyData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.replyTo && parsed.text) return parsed as ReplyData;
  } catch {}
  return null;
}

function isForwardedContent(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed.forwarded === true && typeof parsed.text === 'string';
  } catch {}
  return false;
}

function getForwardedText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.forwarded === true) return parsed.text;
  } catch {}
  return content;
}

function isDeletedMessage(content: string): boolean {
  try { return JSON.parse(content)?._sb_deleted === true; } catch { return false; }
}

function isEditedMessage(content: string): boolean {
  try { const p = JSON.parse(content); return p._sb_edited === true && typeof p.text === 'string'; } catch { return false; }
}

function getEditedText(content: string): string {
  try { const p = JSON.parse(content); if (p._sb_edited === true) return p.text; } catch {}
  return content;
}

function getDisplayText(content: string): string {
  const reply = parseReplyContent(content);
  if (reply) return reply.text;
  if (isForwardedContent(content)) return getForwardedText(content);
  if (isEditedMessage(content)) return getEditedText(content);
  return content;
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const { isUserOnline, getLastSeen } = useOnlinePresence();
  const { conversationId, otherUser: initialOtherUser } = route.params;

  const [otherUser, setOtherUser] = useState<ChatScreenProps['route']['params']['otherUser'] | null>(initialOtherUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Reply & context menu
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [contextMenuMsg, setContextMenuMsg] = useState<Message | null>(null);

  // Edit message
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');

  // Forward modal
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardQuery, setForwardQuery] = useState('');
  const [forwardUsers, setForwardUsers] = useState<any[]>([]);
  const [forwardSending, setForwardSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);
  const readStatusSubscriptionRef = useRef<any>(null);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const inputRef = useRef<TextInput>(null);

  // ─── Presence helpers ────────────────────────────────────────────────────────
  const formatLastSeen = (date: Date | null): string => {
    if (!date) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    return `Last seen ${Math.floor(diffHours / 24)}d ago`;
  };

  const getPresenceSubtitle = (): string => {
    if (!otherUser) return '';
    if (isUserOnline(otherUser.id)) return 'Online';
    return formatLastSeen(getLastSeen(otherUser.id));
  };

  // ─── Load / subscribe ────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    subscribeToReadStatus();
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (readStatusSubscriptionRef.current) supabase.removeChannel(readStatusSubscriptionRef.current);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    const loadOtherUser = async () => {
      if (otherUser || !user || !conversationId) return;
      const [userId1, userId2] = conversationId.split('_');
      const otherUserId = userId1 === user.id ? userId2 : userId1;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified, role')
          .eq('id', otherUserId)
          .single();
        if (!error) setOtherUser(data);
      } catch {}
    };
    loadOtherUser();
  }, [conversationId, user, otherUser]);

  const loadMessages = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userId1, userId2] = conversationId.split('_');
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, sender_id, recipient_id, content, message_type, is_read, read_at, created_at,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
          recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
        `)
        .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      await markMessagesAsRead();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
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
      const otherUserId = userId1 === user.id ? userId2 : userId1;
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);
    } catch {}
  };

  const subscribeToMessages = () => {
    if (!user) return;
    const handleNewMessage = async (messageId: string) => {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, sender_id, recipient_id, content, message_type, is_read, read_at, created_at,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
          recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
        `)
        .eq('id', messageId)
        .single();
      if (!data) return;
      const [userId1, userId2] = conversationId.split('_');
      const belongs =
        (data.sender_id === userId1 && data.recipient_id === userId2) ||
        (data.sender_id === userId2 && data.recipient_id === userId1);
      if (!belongs) return;
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      await markMessagesAsRead();
    };
    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, (p) => handleNewMessage(p.new.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, (p) => handleNewMessage(p.new.id))
      .subscribe();
    subscriptionRef.current = subscription;
  };

  const subscribeToReadStatus = () => {
    if (!user) return;
    const subscription = supabase
      .channel(`messages-read:${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, (payload) => {
        const [userId1, userId2] = conversationId.split('_');
        const u = payload.new as any;
        const belongs = (u.sender_id === userId1 && u.recipient_id === userId2) || (u.sender_id === userId2 && u.recipient_id === userId1);
        if (belongs) {
          setMessages(prev => prev.map(m => m.id === u.id ? { ...m, is_read: u.is_read, read_at: u.read_at } : m));
        }
      })
      .subscribe();
    readStatusSubscriptionRef.current = subscription;
  };

  // ─── Send ────────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!messageText.trim() || !user || !session) return;
    try {
      setSending(true);
      const [userId1, userId2] = conversationId.split('_');
      const recipientId = userId1 === user.id ? userId2 : userId1;

      let content = messageText.trim();
      let messageType = 'text';

      if (replyingTo) {
        messageType = 'text';
        const replyContent = replyingTo.message_type === 'reply'
          ? (parseReplyContent(replyingTo.content, 'reply')?.text ?? replyingTo.content)
          : replyingTo.content;
        content = JSON.stringify({
          replyTo: {
            content: replyContent.length > 120 ? replyContent.slice(0, 120) + '…' : replyContent,
            senderName: replyingTo.sender?.display_name ?? 'SoundBridge',
          },
          text: messageText.trim(),
        });
        setReplyingTo(null);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, recipient_id: recipientId, content, message_type: messageType, is_read: false })
        .select(`
          id, sender_id, recipient_id, content, message_type, is_read, read_at, created_at,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
          recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
        `)
        .single();
      if (error) throw error;
      if (data) {
        setMessages(prev => [...prev, data]);
        setMessageText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        dbHelpers.triggerInstantMessagePush(data.id).catch(() => {});
      }
    } catch (err: any) {
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      console.error('❌ sendMessage error:', msg, err);
      Alert.alert('Error', `Failed to send message.\n${msg}`);
    } finally {
      setSending(false);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleLongPress = (message: Message) => {
    Vibration.vibrate(40);
    setContextMenuMsg(message);
  };

  const handleSwipeReply = (message: Message) => {
    setReplyingTo(message);
    setTimeout(() => swipeableRefs.current.get(message.id)?.close(), 80);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleCopyMessage = () => {
    if (!contextMenuMsg) return;
    Clipboard.setString(getDisplayText(contextMenuMsg.content));
    setContextMenuMsg(null);
  };

  const handleEditMessage = () => {
    if (!contextMenuMsg) return;
    setEditingMsg(contextMenuMsg);
    setEditText(getDisplayText(contextMenuMsg.content));
    setContextMenuMsg(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const submitEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    const newContent = JSON.stringify({ _sb_edited: true, text: editText.trim() });
    setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: newContent } : m));
    setEditingMsg(null);
    setEditText('');
    const { error } = await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', editingMsg.id)
      .eq('sender_id', user!.id);
    if (error) {
      console.error('❌ edit error:', error.message);
      Alert.alert('Error', `Failed to edit message: ${error.message}`);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!contextMenuMsg) return;
    const msg = contextMenuMsg;
    setContextMenuMsg(null);
    const deletedContent = JSON.stringify({ _sb_deleted: true });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: deletedContent } : m));
    const { error } = await supabase
      .from('messages')
      .update({ content: deletedContent })
      .eq('id', msg.id)
      .eq('sender_id', user!.id);
    if (error) {
      console.error('❌ delete-for-everyone error:', error.message);
      Alert.alert('Error', `Failed to delete message: ${error.message}`);
    }
  };

  const handleContextReply = () => {
    if (!contextMenuMsg) return;
    setReplyingTo(contextMenuMsg);
    setContextMenuMsg(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleDeleteForYou = () => {
    if (!contextMenuMsg) return;
    const id = contextMenuMsg.id;
    setContextMenuMsg(null);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleOpenForward = () => {
    if (!contextMenuMsg) return;
    setForwardMessage(contextMenuMsg);
    setContextMenuMsg(null);
    setShowForwardModal(true);
    searchForwardUsers('');
  };

  const handleReport = () => {
    if (!contextMenuMsg) return;
    const msg = contextMenuMsg;
    setContextMenuMsg(null);
    navigation.navigate('ReportContent', {
      contentType: 'message',
      contentId: msg.id,
      reportedUserId: msg.sender_id,
    });
  };

  // ─── Forward ─────────────────────────────────────────────────────────────────
  const searchForwardUsers = async (query: string) => {
    setForwardQuery(query);
    try {
      if (query.trim().length >= 1) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified, role')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .order('username', { ascending: true })
          .limit(30);
        setForwardUsers((data || []).filter((p: any) => p.id !== user?.id));
      } else {
        if (!user) return;
        // Merge recent conversations + followers + following, deduplicated
        const [convResult, followersResult, followingResult] = await Promise.all([
          dbHelpers.getConversations(user.id),
          supabase
            .from('follows')
            .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, is_verified, role)')
            .eq('following_id', user.id)
            .limit(50),
          supabase
            .from('follows')
            .select('following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url, is_verified, role)')
            .eq('follower_id', user.id)
            .limit(50),
        ]);

        const seen = new Set<string>();
        const merged: any[] = [];

        const addUser = (u: any) => {
          if (!u || u.id === user.id || seen.has(u.id)) return;
          seen.add(u.id);
          merged.push(u);
        };

        // Recent convos first (highest relevance)
        (convResult.data || []).forEach((c: any) => addUser(c.otherUser));
        // Then followers
        (followersResult.data || []).forEach((r: any) => addUser(r.follower));
        // Then following
        (followingResult.data || []).forEach((r: any) => addUser(r.following));

        setForwardUsers(merged);
      }
    } catch {}
  };

  const sendForward = async (targetUser: any) => {
    if (!forwardMessage || !user || !session) return;
    try {
      setForwardSending(true);
      const recipientId = targetUser.id;
      const replyData = parseReplyContent(forwardMessage.content);
      const rawText = replyData ? replyData.text : isForwardedContent(forwardMessage.content) ? getForwardedText(forwardMessage.content) : forwardMessage.content;
      const content = JSON.stringify({ forwarded: true, text: rawText });
      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        message_type: 'text',
        is_read: false,
      });
      setShowForwardModal(false);
      setForwardMessage(null);
      Alert.alert('Forwarded', `Message sent to ${targetUser.display_name}`);
    } catch {
      Alert.alert('Error', 'Failed to forward message.');
    } finally {
      setForwardSending(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // ─── Render helpers ───────────────────────────────────────────────────────────
  const renderSwipeAction = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    isOwn: boolean
  ) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: 'clamp' });
    return (
      <View style={[styles.swipeAction, isOwn ? styles.swipeActionRight : styles.swipeActionLeft]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <View style={styles.swipeActionIcon}>
            <Ionicons name="arrow-undo" size={16} color="#7c3aed" />
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const deleted = isDeletedMessage(item.content);
    const edited = isEditedMessage(item.content);
    const replyData = deleted ? null : parseReplyContent(item.content);
    const displayText = deleted ? '' : getDisplayText(item.content);

    return (
      <Swipeable
        ref={ref => swipeableRefs.current.set(item.id, ref)}
        renderLeftActions={(progress, dragX) => !isOwnMessage ? renderSwipeAction(progress, dragX, false) : null}
        renderRightActions={(progress, dragX) => isOwnMessage ? renderSwipeAction(progress, dragX, true) : null}
        onSwipeableOpen={(direction) => {
          if (direction === 'left' && !isOwnMessage) handleSwipeReply(item);
          if (direction === 'right' && isOwnMessage) handleSwipeReply(item);
        }}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer]}>
          {!isOwnMessage && (
            <TouchableOpacity
              style={styles.messageAvatar}
              onPress={() => otherUser && navigation.navigate('CreatorProfile', { creatorId: otherUser.id })}
            >
              <VerifiedAvatar avatarUrl={otherUser?.avatar_url} isVerified={otherUser?.is_verified} size={28} fallbackIconSize={14} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={300}
            style={[
              styles.messageBubble,
              isOwnMessage ? { backgroundColor: '#7c3aed' } : { backgroundColor: theme.colors.card },
            ]}
          >
            {/* Quoted reply preview */}
            {replyData && (
              <View style={[
                styles.quoteBubble,
                { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.15)' : theme.colors.surface },
              ]}>
                <View style={[styles.quoteBar, { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.6)' : '#7c3aed' }]} />
                <View style={styles.quoteContent}>
                  <Text style={[styles.quoteSender, { color: isOwnMessage ? 'rgba(255,255,255,0.9)' : '#7c3aed' }]}>
                    {replyData.replyTo.senderName}
                  </Text>
                  <Text
                    style={[styles.quoteText, { color: isOwnMessage ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {replyData.replyTo.content}
                  </Text>
                </View>
              </View>
            )}

            {!deleted && isForwardedContent(item.content) && (
              <View style={styles.forwardedLabel}>
                <Ionicons
                  name="arrow-redo"
                  size={11}
                  color={isOwnMessage ? 'rgba(255,255,255,0.65)' : theme.colors.textSecondary}
                />
                <Text style={[styles.forwardedLabelText, { color: isOwnMessage ? 'rgba(255,255,255,0.65)' : theme.colors.textSecondary }]}>
                  Forwarded
                </Text>
              </View>
            )}

            {deleted ? (
              <Text style={[styles.messageText, styles.deletedText, isOwnMessage ? { color: 'rgba(255,255,255,0.45)' } : { color: theme.colors.textSecondary }]}>
                This message was deleted.
              </Text>
            ) : (
              <Text style={[styles.messageText, isOwnMessage ? { color: '#FFFFFF' } : { color: theme.colors.text }]}>
                {displayText}
              </Text>
            )}

            {edited && !deleted && (
              <Text style={[styles.editedLabel, isOwnMessage ? { color: 'rgba(255,255,255,0.5)' } : { color: theme.colors.textSecondary }]}>
                edited
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwnMessage ? { color: 'rgba(255,255,255,0.65)' } : { color: theme.colors.textSecondary }]}>
                {formatTime(item.created_at)}
              </Text>
              {isOwnMessage && item.is_read && (
                <Text style={styles.readReceiptText}>Read</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No messages yet</Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        Start the conversation with {otherUser?.display_name || 'this user'}
      </Text>
    </View>
  );

  // ─── Context menu (long press) ────────────────────────────────────────────────
  const renderContextMenu = () => {
    if (!contextMenuMsg) return null;
    const isOwn = contextMenuMsg.sender_id === user?.id;
    const replyData = parseReplyContent(contextMenuMsg.content);
    const previewText = replyData ? replyData.text : isForwardedContent(contextMenuMsg.content) ? getForwardedText(contextMenuMsg.content) : contextMenuMsg.content;

    const isDeleted = isDeletedMessage(contextMenuMsg.content);
    const actions = [
      ...(!isDeleted ? [
        { icon: 'arrow-undo-outline', label: 'Reply', onPress: handleContextReply, color: theme.colors.text },
        { icon: 'copy-outline', label: 'Copy', onPress: handleCopyMessage, color: theme.colors.text },
        { icon: 'share-outline', label: 'Forward', onPress: handleOpenForward, color: theme.colors.text },
        ...(isOwn ? [{ icon: 'pencil-outline', label: 'Edit', onPress: handleEditMessage, color: theme.colors.text }] : []),
      ] : []),
      { icon: 'trash-outline', label: 'Delete for you', onPress: handleDeleteForYou, color: '#ef4444' },
      ...(isOwn && !isDeleted ? [{ icon: 'trash-bin-outline', label: 'Delete for everyone', onPress: handleDeleteForEveryone, color: '#ef4444' }] : []),
      ...(!isOwn ? [{ icon: 'flag-outline', label: 'Report', onPress: handleReport, color: '#ef4444' }] : []),
    ];

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setContextMenuMsg(null)}>
        <TouchableWithoutFeedback onPress={() => setContextMenuMsg(null)}>
          <View style={styles.contextOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contextSheet, { backgroundColor: theme.isDark ? '#1a1a2e' : '#fff', borderColor: theme.colors.border }]}>
                {/* Message preview */}
                <View style={[styles.contextPreview, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.contextPreviewLabel, { color: theme.colors.textSecondary }]}>
                    {isOwn ? 'You' : otherUser?.display_name ?? 'User'}
                  </Text>
                  <Text style={[styles.contextPreviewText, { color: theme.colors.text }]} numberOfLines={3}>
                    {previewText}
                  </Text>
                </View>

                {/* Actions */}
                {actions.map((action, i) => (
                  <TouchableOpacity
                    key={action.label}
                    style={[
                      styles.contextAction,
                      { borderBottomColor: theme.colors.border },
                      i === actions.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={action.icon as any} size={20} color={action.color} style={styles.contextActionIcon} />
                    <Text style={[styles.contextActionLabel, { color: action.color }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ─── Forward modal ────────────────────────────────────────────────────────────
  const renderForwardModal = () => (
    <Modal visible={showForwardModal} transparent animationType="slide" onRequestClose={() => setShowForwardModal(false)}>
      <View style={[styles.forwardSheet, { backgroundColor: theme.isDark ? '#0e0b1f' : '#fff' }]}>
        {/* Header — matches LinkedIn style */}
        <View style={[styles.forwardHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setShowForwardModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.forwardTitle, { color: theme.colors.text }]}>Forward</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* To: search row */}
        <View style={[styles.forwardToRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.forwardToLabel, { color: theme.colors.textSecondary }]}>To:</Text>
          <TextInput
            style={[styles.forwardSearchInput, { color: theme.colors.text }]}
            placeholder="Type a name or multiple names"
            placeholderTextColor={theme.colors.textSecondary}
            value={forwardQuery}
            onChangeText={searchForwardUsers}
            autoFocus
          />
        </View>

        {/* Suggested / Results list */}
        <FlatList
          data={forwardUsers}
          keyExtractor={(item) => item.id}
          style={styles.forwardList}
          ListHeaderComponent={
            forwardUsers.length > 0 ? (
              <Text style={[styles.forwardSectionHeader, { color: theme.colors.textSecondary }]}>
                {forwardQuery.length > 0 ? 'Results' : 'Suggested'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.forwardUserRow, { borderBottomColor: theme.colors.border }]}
              onPress={() => sendForward(item)}
              disabled={forwardSending}
              activeOpacity={0.7}
            >
              <VerifiedAvatar avatarUrl={item.avatar_url} isVerified={item.is_verified} size={44} />
              <View style={styles.forwardUserInfo}>
                <Text style={[styles.forwardUserName, { color: theme.colors.text }]}>{item.display_name}</Text>
                <Text style={[styles.forwardUserUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  @{item.username}
                  {item.professional_headline ? ` · ${item.professional_headline}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.forwardEmpty, { color: theme.colors.textSecondary }]}>
              {forwardQuery.length > 0 ? 'No users found' : 'Loading suggestions…'}
            </Text>
          }
        />
      </View>
    </Modal>
  );

  // ─── Main render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerUser}>
            <TouchableOpacity onPress={() => otherUser && navigation.navigate('CreatorProfile', { creatorId: otherUser.id })}>
              <View style={styles.headerAvatarWrap}>
                <VerifiedAvatar avatarUrl={otherUser?.avatar_url} isVerified={otherUser?.is_verified} size={36} fallbackIconSize={20} />
                {otherUser && isUserOnline(otherUser.id) && (
                  <View style={[styles.onlineDot, { borderColor: theme.colors.surface }]} />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.headerUserInfo}>
              <Text style={[styles.headerUserName, { color: theme.colors.text }]} numberOfLines={1}>
                {otherUser?.display_name || 'User'}
              </Text>
              {otherUser && getPresenceSubtitle() ? (
                <Text
                  style={[styles.headerUserRole, { color: isUserOnline(otherUser.id) ? '#4CAF50' : theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {getPresenceSubtitle()}
                </Text>
              ) : (
                <Text style={[styles.headerUserRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  @{otherUser?.username || 'user'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

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

          {/* Reply bar */}
          {replyingTo && (
            <View style={[styles.replyBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
              <View style={styles.replyBarInner}>
                <View style={styles.replyBarAccent} />
                <View style={styles.replyBarContent}>
                  <Text style={[styles.replyBarSender, { color: '#7c3aed' }]}>
                    {replyingTo.sender_id === user?.id ? 'You' : (replyingTo.sender?.display_name ?? 'SoundBridge')}
                  </Text>
                  <Text style={[styles.replyBarText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {getDisplayText(replyingTo.content)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Edit bar */}
          {editingMsg && (
            <View style={[styles.replyBar, { backgroundColor: theme.colors.surface, borderTopColor: '#7c3aed' }]}>
              <View style={styles.replyBarInner}>
                <View style={[styles.replyBarAccent, { backgroundColor: '#7c3aed' }]} />
                <View style={styles.replyBarContent}>
                  <Text style={[styles.replyBarSender, { color: '#7c3aed' }]}>Editing message</Text>
                  <Text style={[styles.replyBarText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {getDisplayText(editingMsg.content)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setEditingMsg(null); setEditText(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.text }]}
                placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
                placeholderTextColor={theme.colors.textSecondary}
                value={editingMsg ? editText : messageText}
                onChangeText={editingMsg ? setEditText : setMessageText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: (editingMsg ? editText.trim() : messageText.trim()) ? 1 : 0.5 }]}
                onPress={editingMsg ? submitEdit : sendMessage}
                disabled={!(editingMsg ? editText.trim() : messageText.trim()) || sending}
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

      {renderContextMenu()}
      {renderForwardModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { padding: 4, marginRight: 8 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatarWrap: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerDefaultAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2 },
  headerUserInfo: { flex: 1 },
  headerUserName: { fontSize: 16, fontWeight: '600' },
  headerUserRole: { fontSize: 12 },
  headerButton: { padding: 8 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  // Swipe
  swipeAction: { justifyContent: 'center', alignItems: 'center', width: 60, marginBottom: 12 },
  swipeActionLeft: { alignItems: 'flex-start', paddingLeft: 12 },
  swipeActionRight: { alignItems: 'flex-end', paddingRight: 12 },
  swipeActionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.15)', justifyContent: 'center', alignItems: 'center' },

  // Messages
  messageContainer: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  ownMessageContainer: { justifyContent: 'flex-end' },
  otherMessageContainer: { justifyContent: 'flex-start' },
  messageAvatar: { marginRight: 8 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { fontSize: 11 },
  readReceiptText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginLeft: 4, fontWeight: '500' },
  forwardedLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4, opacity: 0.85 },
  forwardedLabelText: { fontSize: 11, fontStyle: 'italic' },
  deletedText: { fontStyle: 'italic', opacity: 0.7 },
  editedLabel: { fontSize: 10, fontStyle: 'italic', marginTop: 2, opacity: 0.7 },

  // Quote bubble (inside message)
  quoteBubble: { flexDirection: 'row', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  quoteBar: { width: 3, borderRadius: 2, flexShrink: 0 },
  quoteContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 6 },
  quoteSender: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  quoteText: { fontSize: 12, lineHeight: 16 },

  // Reply bar (above input)
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, gap: 12 },
  replyBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBarAccent: { width: 3, height: 36, borderRadius: 2, backgroundColor: '#7c3aed', flexShrink: 0 },
  replyBarContent: { flex: 1 },
  replyBarSender: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  replyBarText: { fontSize: 13, lineHeight: 16 },

  // Input
  inputContainer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 4 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyStateText: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  emptyStateSubtext: { fontSize: 14, textAlign: 'center' },

  // Context menu
  contextOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  contextSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, overflow: 'hidden', paddingBottom: 32 },
  contextPreview: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  contextPreviewLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  contextPreviewText: { fontSize: 15, lineHeight: 20 },
  contextAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  contextActionIcon: { marginRight: 16 },
  contextActionLabel: { fontSize: 16 },

  // Forward modal
  forwardSheet: { flex: 1, paddingTop: Platform.OS === 'ios' ? 56 : 32 },
  forwardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  forwardTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  forwardToRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  forwardToLabel: { fontSize: 16, fontWeight: '500', width: 30 },
  forwardSearchInput: { flex: 1, fontSize: 16 },
  forwardSectionHeader: { fontSize: 13, fontWeight: '700', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  forwardList: { flex: 1 },
  forwardUserRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  forwardUserInfo: { flex: 1 },
  forwardUserName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  forwardUserUsername: { fontSize: 13 },
  forwardEmpty: { textAlign: 'center', paddingTop: 48, fontSize: 14 },
});
