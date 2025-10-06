// src/utils/collaborationUtils.ts
// Utility functions for collaboration calendar system

import type {
  CreatorAvailability,
  CollaborationRequest,
  BookingStatus,
  AvailabilitySlot,
  ValidationResult
} from '../types/collaboration';

// ===== DATE & TIME UTILITIES =====

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const isSameDay = start.toDateString() === end.toDateString();
  
  if (isSameDay) {
    return `${formatDate(startDate)} • ${formatTime(startDate)} - ${formatTime(endDate)}`;
  } else {
    return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}`;
  }
};

export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return `In ${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `In ${months} month${months > 1 ? 's' : ''}`;
  }
};

export const isDateInPast = (dateString: string): boolean => {
  return new Date(dateString) < new Date();
};

export const isDateToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// ===== AVAILABILITY UTILITIES =====

export const transformAvailabilityToSlot = (availability: CreatorAvailability, requestCount = 0): AvailabilitySlot => {
  return {
    id: availability.id,
    startDate: new Date(availability.start_date),
    endDate: new Date(availability.end_date),
    maxRequests: availability.max_requests_per_slot,
    currentRequests: requestCount,
    notes: availability.notes,
    isAvailable: availability.is_available,
    isFullyBooked: requestCount >= availability.max_requests_per_slot
  };
};

export const sortAvailabilityByDate = (slots: CreatorAvailability[]): CreatorAvailability[] => {
  return [...slots].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
};

export const filterFutureAvailability = (slots: CreatorAvailability[]): CreatorAvailability[] => {
  const now = new Date();
  return slots.filter(slot => new Date(slot.end_date) > now);
};

export const getAvailabilityDuration = (slot: CreatorAvailability): string => {
  const start = new Date(slot.start_date);
  const end = new Date(slot.end_date);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 1) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    return `${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `${Math.round(diffHours * 10) / 10} hrs`;
  } else {
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
};

// ===== REQUEST UTILITIES =====

export const getRequestStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#F59E0B'; // Amber
    case 'accepted':
      return '#10B981'; // Green
    case 'declined':
      return '#EF4444'; // Red
    case 'expired':
      return '#6B7280'; // Gray
    default:
      return '#6B7280';
  }
};

export const getRequestStatusText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
};

export const sortRequestsByDate = (requests: CollaborationRequest[]): CollaborationRequest[] => {
  return [...requests].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const filterRequestsByStatus = (requests: CollaborationRequest[], status: string): CollaborationRequest[] => {
  return requests.filter(request => request.status === status);
};

export const groupRequestsByStatus = (requests: CollaborationRequest[]) => {
  return {
    pending: filterRequestsByStatus(requests, 'pending'),
    accepted: filterRequestsByStatus(requests, 'accepted'),
    declined: filterRequestsByStatus(requests, 'declined'),
    expired: filterRequestsByStatus(requests, 'expired')
  };
};

// ===== BOOKING STATUS UTILITIES =====

export const getBookingStatusText = (status: BookingStatus): string => {
  if (!status.collaboration_enabled) {
    return 'Not accepting collaborations';
  }
  
  if (status.available_slots === 0) {
    return 'Fully booked';
  }
  
  if (status.available_slots === 1) {
    return '1 slot available';
  }
  
  return `${status.available_slots} slots available`;
};

export const getBookingStatusColor = (status: BookingStatus): string => {
  if (!status.collaboration_enabled) {
    return '#6B7280'; // Gray
  }
  
  if (status.available_slots === 0) {
    return '#EF4444'; // Red
  }
  
  if (status.available_slots <= 2) {
    return '#F59E0B'; // Amber
  }
  
  return '#10B981'; // Green
};

export const isCreatorAvailable = (status: BookingStatus): boolean => {
  return status.collaboration_enabled && status.is_accepting_requests && status.available_slots > 0;
};

// ===== VALIDATION UTILITIES =====

export const validateTimeSlot = (
  startDate: Date,
  endDate: Date,
  availabilityWindow?: { start: Date; end: Date },
  minNoticeDays = 0
): ValidationResult => {
  const errors: string[] = [];
  
  // Basic date validation
  if (endDate <= startDate) {
    errors.push('End time must be after start time');
  }
  
  // Check if dates are in the past
  const now = new Date();
  if (startDate < now) {
    errors.push('Start time cannot be in the past');
  }
  
  // Check minimum notice period
  if (minNoticeDays > 0) {
    const minNoticeDate = new Date();
    minNoticeDate.setDate(minNoticeDate.getDate() + minNoticeDays);
    
    if (startDate < minNoticeDate) {
      errors.push(`Minimum ${minNoticeDays} days notice required`);
    }
  }
  
  // Check if within availability window
  if (availabilityWindow) {
    if (startDate < availabilityWindow.start || endDate > availabilityWindow.end) {
      errors.push('Proposed times are outside availability window');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCollaborationMessage = (message: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!message.trim()) {
    errors.push('Message is required');
  }
  
  if (message.trim().length < 10) {
    errors.push('Message must be at least 10 characters');
  }
  
  if (message.length > 1000) {
    errors.push('Message must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSubject = (subject: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!subject.trim()) {
    errors.push('Subject is required');
  }
  
  if (subject.trim().length < 3) {
    errors.push('Subject must be at least 3 characters');
  }
  
  if (subject.length > 255) {
    errors.push('Subject must be less than 255 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ===== NOTIFICATION UTILITIES =====

export const generateNotificationTitle = (type: string, requesterName: string): string => {
  switch (type) {
    case 'collaboration.request.received':
      return 'New Collaboration Request';
    case 'collaboration.request.accepted':
      return 'Collaboration Accepted!';
    case 'collaboration.request.declined':
      return 'Collaboration Declined';
    default:
      return 'Collaboration Update';
  }
};

export const generateNotificationBody = (type: string, requesterName: string, creatorName?: string): string => {
  switch (type) {
    case 'collaboration.request.received':
      return `${requesterName} wants to collaborate with you`;
    case 'collaboration.request.accepted':
      return `${creatorName} accepted your collaboration request`;
    case 'collaboration.request.declined':
      return `${creatorName} declined your collaboration request`;
    default:
      return 'Check your collaboration requests';
  }
};

// ===== SEARCH & FILTER UTILITIES =====

export const searchAvailability = (slots: CreatorAvailability[], query: string): CreatorAvailability[] => {
  if (!query.trim()) return slots;
  
  const lowerQuery = query.toLowerCase();
  return slots.filter(slot => 
    slot.notes?.toLowerCase().includes(lowerQuery) ||
    formatDate(slot.start_date).toLowerCase().includes(lowerQuery) ||
    formatTime(slot.start_date).toLowerCase().includes(lowerQuery)
  );
};

export const searchRequests = (requests: CollaborationRequest[], query: string): CollaborationRequest[] => {
  if (!query.trim()) return requests;
  
  const lowerQuery = query.toLowerCase();
  return requests.filter(request => 
    request.subject.toLowerCase().includes(lowerQuery) ||
    request.message.toLowerCase().includes(lowerQuery) ||
    request.requester?.display_name.toLowerCase().includes(lowerQuery) ||
    request.creator?.display_name.toLowerCase().includes(lowerQuery)
  );
};

// ===== EXPORT ALL UTILITIES =====

export const collaborationUtils = {
  // Date & Time
  formatDate,
  formatTime,
  formatDateRange,
  getRelativeTime,
  isDateInPast,
  isDateToday,
  
  // Availability
  transformAvailabilityToSlot,
  sortAvailabilityByDate,
  filterFutureAvailability,
  getAvailabilityDuration,
  
  // Requests
  getRequestStatusColor,
  getRequestStatusText,
  sortRequestsByDate,
  filterRequestsByStatus,
  groupRequestsByStatus,
  
  // Booking Status
  getBookingStatusText,
  getBookingStatusColor,
  isCreatorAvailable,
  
  // Validation
  validateTimeSlot,
  validateCollaborationMessage,
  validateSubject,
  
  // Notifications
  generateNotificationTitle,
  generateNotificationBody,
  
  // Search & Filter
  searchAvailability,
  searchRequests
};
