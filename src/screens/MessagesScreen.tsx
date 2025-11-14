import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbHelpers } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at?: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  receiver: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  updated_at: string;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'conversations' | 'search'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      if (!user) {
        console.log('ℹ️ No user logged in, cannot load conversations');
        setConversations([]);
        return;
      }
      
      console.log('🔧 Loading conversations for user:', user.id);
      const { success, data } = await dbHelpers.getConversations(user.id);
      
      if (success && data && data.length > 0) {
        console.log('✅ Conversations loaded:', data.length, 'conversations');
        // Transform the data to match our interface
        const transformedConversations: Conversation[] = data.map((conv: any) => {
          // Determine which participant is the "other user"
          const otherUser = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
          
          return {
            id: conv.id,
            other_user: {
              id: otherUser.id,
              username: otherUser.username,
              display_name: otherUser.display_name,
              avatar_url: otherUser.avatar_url,
            },
            last_message: conv.last_message?.[0] ? {
              content: conv.last_message[0].content,
              created_at: conv.last_message[0].created_at,
              sender_id: conv.last_message[0].sender_id,
            } : null,
            unread_count: 0, // TODO: Implement unread count logic
            updated_at: conv.updated_at,
          };
        });
        
        setConversations(transformedConversations);
      } else {
        console.log('ℹ️ No conversations found for user');
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      // Don't show alert for empty conversations - it's normal for new users
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('🔍 Searching for users:', query);
      const { success, data } = await dbHelpers.searchProfiles(query, 10);
      
      if (success && data) {
        // Transform to match our search interface
        const searchResults = data.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          is_online: false, // TODO: Implement online status
        }));
        
        console.log('✅ User search results:', searchResults.length, 'users found');
        setSearchResults(searchResults);
      } else {
        console.log('ℹ️ No users found for search query');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Navigate to chat screen
    console.log('Navigate to conversation:', conversation.id);
    Alert.alert('Navigation', `Open conversation with ${conversation.other_user.display_name}`);
  };

  const handleUserPress = (user: any) => {
    // Start new conversation
    console.log('Start conversation with:', user.username);
    Alert.alert('New Chat', `Start conversation with ${user.display_name}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.conversationAvatar}>
        {item.other_user.avatar_url ? (
          <Image
            source={{ uri: item.other_user.avatar_url }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.other_user.display_name}
          </Text>
          <Text style={[styles.conversationTime, { color: theme.colors.textSecondary }]}>
            {item.last_message ? formatTime(item.last_message.created_at) : ''}
          </Text>
        </View>
        
        <View style={styles.conversationFooter}>
          <Text 
            style={[
              styles.lastMessage,
              { color: theme.colors.textSecondary },
              item.unread_count > 0 && { color: theme.colors.text, fontWeight: '500' }
            ]} 
            numberOfLines={1}
          >
            {item.last_message ? item.last_message.content : 'No messages yet'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.searchResultAvatar}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={[styles.onlineIndicator, { backgroundColor: item.is_online ? '#4CAF50' : '#666' }]} />
      </View>

      <View style={styles.searchResultContent}>
        <Text style={[styles.searchResultName, { color: theme.colors.text }]}>{item.display_name}</Text>
        <Text style={[styles.searchResultUsername, { color: theme.colors.textSecondary }]}>@{item.username}</Text>
      </View>

      <TouchableOpacity style={styles.startChatButton}>
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Conversations Yet</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        Start a conversation with other creators and connect with the community.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
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
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Messages</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="add" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'conversations' && { backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={() => setActiveTab('conversations')}
        >
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'conversations' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}>
            Conversations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'search' && { backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'search' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}>
            Find People
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'conversations' ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.conversationsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#DC2626"
                colors={['#DC2626']}
              />
            }
            ListEmptyComponent={loading ? null : renderEmptyState}
          />
        ) : (
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search for creators..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View style={styles.noResultsState}>
                    <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.text }]}>No users found</Text>
                    <Text style={[styles.noResultsSubtext, { color: theme.colors.textSecondary }]}>
                      Try searching with a different name
                    </Text>
                  </View>
                ) : (
                  <View style={styles.searchPromptState}>
                    <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.searchPromptText, { color: theme.colors.text }]}>Search for creators</Text>
                    <Text style={[styles.searchPromptSubtext, { color: theme.colors.textSecondary }]}>
                      Find and connect with other music creators
                    </Text>
                  </View>
                )
              }
            />
          </View>
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  conversationsList: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginLeft: 8,
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResultsList: {
    flexGrow: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultUsername: {
    fontSize: 14,
  },
  startChatButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noResultsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  searchPromptState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  searchPromptText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  searchPromptSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});