/**
 * Accessibility utilities for consistent labels and hints across the app
 */

export const accessibilityLabels = {
  // Navigation
  feedTab: 'Feed tab. View your professional network feed',
  discoverTab: 'Discover tab. Explore music and artists',
  uploadTab: 'Upload tab. Upload new music',
  networkTab: 'Network tab. Manage your connections',
  profileTab: 'Profile tab. View your profile',

  // Actions
  likePost: (isLiked: boolean) =>
    isLiked ? 'Unlike this post' : 'Like this post',
  commentPost: 'Add a comment to this post',
  sharePost: 'Share this post',
  connectUser: (username: string) =>
    `Send connection request to ${username}`,
  acceptRequest: (username: string) =>
    `Accept connection request from ${username}`,
  declineRequest: (username: string) =>
    `Decline connection request from ${username}`,
  removeConnection: (username: string) =>
    `Remove connection with ${username}`,
  dismissSuggestion: (username: string) =>
    `Dismiss connection suggestion for ${username}`,

  // Media
  postImage: 'Post image',
  userAvatar: (username: string) => `${username}'s profile picture`,
  audioPreview: 'Audio preview. Double tap to play',
  playAudio: 'Play audio',
  pauseAudio: 'Pause audio',

  // Forms
  searchInput: 'Search input. Type to search for posts, people, or opportunities',
  postInput: 'Post content input. Type your post here',
  commentInput: 'Comment input. Type your comment here',
  publishButton: 'Publish button. Tap to publish your post',
  sendButton: 'Send button. Tap to send your message',

  // Modals
  closeModal: 'Close modal',
  openComments: 'Open comments',
  openPostDetails: 'Open post details',
  createPost: 'Create new post',
};

export const accessibilityHints = {
  tapToExpand: 'Double tap to expand',
  swipeToDelete: 'Swipe right to delete',
  longPressOptions: 'Long press for more options',
  tapToReact: 'Double tap to react to this post',
  tapToComment: 'Double tap to add a comment',
  tapToShare: 'Double tap to share this post',
  tapToConnect: 'Double tap to send connection request',
  tapToAccept: 'Double tap to accept connection request',
  tapToDecline: 'Double tap to decline connection request',
};

export const accessibilityRoles = {
  button: 'button' as const,
  link: 'link' as const,
  image: 'image' as const,
  text: 'text' as const,
  header: 'header' as const,
  summary: 'summary' as const,
  alert: 'alert' as const,
};

/**
 * Get accessibility props for a button
 */
export const getButtonAccessibility = (
  label: string,
  hint?: string,
  disabled?: boolean
) => ({
  accessible: true,
  accessibilityRole: accessibilityRoles.button,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: {
    disabled: disabled || false,
  },
});

/**
 * Get accessibility props for an image
 */
export const getImageAccessibility = (label: string) => ({
  accessible: true,
  accessibilityRole: accessibilityRoles.image,
  accessibilityLabel: label,
});

/**
 * Get accessibility props for text
 */
export const getTextAccessibility = (label: string) => ({
  accessible: true,
  accessibilityRole: accessibilityRoles.text,
  accessibilityLabel: label,
});

