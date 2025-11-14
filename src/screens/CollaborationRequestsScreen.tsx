import BackButton from '../components/BackButton';
// src/screens/CollaborationRequestsScreen.tsx
// Screen for managing collaboration requests (inbox)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { collaborationUtils } from '../utils/collaborationUtils';
import type { CollaborationRequest, RespondToRequestData } from '../types/collaboration';

type TabType = 'received' | 'sent';
type FilterType = 'all' | 'pending' | 'accepted' | 'declined';

export default function CollaborationRequestsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    requests,
    loadingRequests,
    getRequests,
    respondToRequest,
    error,
    clearError
  } = useCollaboration();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CollaborationRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [respondingWith, setRespondingWith] = useState<'accepted' | 'declined'>('accepted');
  const [responseLoading, setResponseLoading] = useState(false);

  // Load requests on mount and when tab changes
  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, []);

  const loadRequests = () => {
    getRequests({
      type: activeTab,
      status: activeFilter === 'all' ? undefined : activeFilter,
      page: 1,
      limit: 50
    });
  };

  const handleRefresh = () => {
    loadRequests();
  };

  const handleRespondToRequest = (request: CollaborationRequest, response: 'accepted' | 'declined') => {
    setSelectedRequest(request);
    setRespondingWith(response);
    setResponseMessage('');
    setShowResponseModal(true);
  };

  const handleSendResponse = async () => {
    if (!selectedRequest) return;

    // Validate response message
    const validation = collaborationUtils.validateCollaborationMessage(responseMessage);
    if (!validation.isValid) {
      Alert.alert('Invalid Message', validation.errors.join('\n'));
      return;
    }

    setResponseLoading(true);
    try {
      const responseData: RespondToRequestData = {
        requestId: selectedRequest.id,
        response: respondingWith,
        responseMessage: responseMessage.trim()
      };

      const success = await respondToRequest(responseData);
      
      if (success) {
        setShowResponseModal(false);
        Alert.alert(
          'Response Sent',
          `You have ${respondingWith} the collaboration request. The requester will be notified.`
        );
      } else {
        Alert.alert('Error', 'Failed to send response. Please try again.');
      }
    } catch (error) {
      console.error('Error sending response:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setResponseLoading(false);
    }
  };

  const getFilteredRequests = () => {
    let filtered = requests;

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = collaborationUtils.filterRequestsByStatus(filtered, activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = collaborationUtils.searchRequests(filtered, searchQuery);
    }

    // Sort by date
    return collaborationUtils.sortRequestsByDate(filtered);
  };

  const renderTabButton = (tab: TabType, label: string, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[
          styles.tabButtonText,
          { color: isActive ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          { borderColor: theme.colors.border },
          isActive && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
        ]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[
          styles.filterButtonText,
          { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRequestCard = (request: CollaborationRequest) => {
    const isReceived = activeTab === 'received';
    const otherUser = isReceived ? request.requester : request.creator;
    const statusColor = collaborationUtils.getRequestStatusColor(request.status);
    const canRespond = isReceived && request.status === 'pending';

    return (
      <View
        key={request.id}
        style={[styles.requestCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        {/* Header */}
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={[styles.requestSubject, { color: theme.colors.text }]} numberOfLines={1}>
              {request.subject}
            </Text>
            <Text style={[styles.requestUser, { color: theme.colors.textSecondary }]}>
              {isReceived ? 'From' : 'To'} {otherUser?.display_name || otherUser?.username || 'Unknown User'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {collaborationUtils.getRequestStatusText(request.status)}
            </Text>
          </View>
        </View>

        {/* Time Info */}
        <View style={styles.timeInfo}>
          <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
            {collaborationUtils.formatDateRange(request.proposed_start_date, request.proposed_end_date)}
          </Text>
        </View>

        {/* Message Preview */}
        <Text style={[styles.messagePreview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {request.message}
        </Text>

        {/* Response Message */}
        {request.response_message && (
          <View style={[styles.responseContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.responseLabel, { color: theme.colors.textSecondary }]}>Response:</Text>
            <Text style={[styles.responseText, { color: theme.colors.text }]}>
              {request.response_message}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.requestActions}>
          <Text style={[styles.requestDate, { color: theme.colors.textSecondary }]}>
            {collaborationUtils.getRelativeTime(request.created_at)}
          </Text>
          
          {canRespond && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                onPress={() => handleRespondToRequest(request, 'declined')}
              >
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                onPress={() => handleRespondToRequest(request, 'accepted')}
              >
                <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderResponseModal = () => (
    <Modal
      visible={showResponseModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowResponseModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowResponseModal(false)} disabled={responseLoading}>
            <Text style={[styles.modalCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {respondingWith === 'accepted' ? 'Accept Request' : 'Decline Request'}
          </Text>
          <TouchableOpacity onPress={handleSendResponse} disabled={responseLoading}>
            {responseLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.modalSend, { color: theme.colors.primary }]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedRequest && (
            <>
              {/* Request Info */}
              <View style={[styles.requestSummary, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                  {selectedRequest.subject}
                </Text>
                <Text style={[styles.summaryUser, { color: theme.colors.textSecondary }]}>
                  From {selectedRequest.requester?.display_name || selectedRequest.requester?.username}
                </Text>
                <Text style={[styles.summaryTime, { color: theme.colors.textSecondary }]}>
                  {collaborationUtils.formatDateRange(selectedRequest.proposed_start_date, selectedRequest.proposed_end_date)}
                </Text>
                <Text style={[styles.summaryMessage, { color: theme.colors.text }]}>
                  {selectedRequest.message}
                </Text>
              </View>

              {/* Response Message */}
              <View style={styles.responseSection}>
                <Text style={[styles.responseLabel, { color: theme.colors.text }]}>
                  Response Message *
                </Text>
                <TextInput
                  style={[styles.responseInput, { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text 
                  }]}
                  value={responseMessage}
                  onChangeText={setResponseMessage}
                  placeholder={
                    respondingWith === 'accepted' 
                      ? "Great! I'd love to collaborate. Let me know if you need any adjustments to the time..."
                      : "Thank you for your interest, but I won't be able to collaborate at this time..."
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                  {responseMessage.length}/1000
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const filteredRequests = getFilteredRequests();
  const receivedCount = collaborationUtils.filterRequestsByStatus(requests, 'pending').filter(r => 
    requests.some(req => req.creator && req.creator.id === r.creator?.id)
  ).length;
  const sentCount = requests.filter(r => r.requester).length;

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
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Collaboration Requests</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#EF444420' }]}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('received', 'Received', receivedCount)}
        {renderTabButton('sent', 'Sent', sentCount)}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search requests..."
            placeholderTextColor={theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filtersContent}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('pending', 'Pending')}
          {renderFilterButton('accepted', 'Accepted')}
          {renderFilterButton('declined', 'Declined')}
        </View>
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loadingRequests}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loadingRequests && requests.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading requests...
            </Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {searchQuery ? 'No matching requests' : `No ${activeTab} requests`}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : activeTab === 'received' 
                  ? 'Collaboration requests from other creators will appear here'
                  : 'Requests you send to other creators will appear here'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {filteredRequests.map(renderRequestCard)}
          </View>
        )}
      </ScrollView>

      {/* Response Modal */}
      {renderResponseModal()}
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  requestsList: {
    gap: 12,
    paddingBottom: 24,
  },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requestUser: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  timeText: {
    fontSize: 14,
  },
  messagePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSend: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  requestSummary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryUser: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryTime: {
    fontSize: 14,
    marginBottom: 12,
  },
  summaryMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  responseSection: {
    marginBottom: 24,
  },
  responseInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});
