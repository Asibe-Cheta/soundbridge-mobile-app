import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { socialService } from '../services/api/socialService';

interface PostSaveButtonProps {
  postId: string;
  initialIsSaved?: boolean;
  onSaveChange?: (isSaved: boolean) => void;
  size?: number;
}

export default function PostSaveButton({
  postId,
  initialIsSaved = false,
  onSaveChange,
  size = 20,
}: PostSaveButtonProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (user && postId && !initialIsSaved) {
      checkSaveStatus();
    }
  }, [postId, user?.id]);

  const checkSaveStatus = async () => {
    if (!user) return;

    setIsChecking(true);
    try {
      const { data: saved } = await socialService.isBookmarked(
        user.id,
        postId,
        'post'
      );
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggle = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);

    // Optimistic update
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    try {
      const result = await socialService.toggleBookmark({
        content_id: postId,
        content_type: 'post',
      });

      if (result.error) {
        // Revert optimistic update
        setIsSaved(!newSavedState);
        
        console.error('Error toggling bookmark:', result.error);
        Alert.alert('Error', 'Failed to save post. Please try again.');
        return;
      }

      // Update with actual result
      setIsSaved(result.isSaved);
      onSaveChange?.(result.isSaved);

      // Optional: Show success feedback
      // You can add a toast notification here if you have one
      console.log(`✅ Post ${result.isSaved ? 'saved' : 'unsaved'}`);
    } catch (error) {
      // Revert optimistic update
      setIsSaved(!newSavedState);
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // Don't show save button if not logged in
  }

  if (isChecking) {
    return (
      <TouchableOpacity style={styles.button} disabled>
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleToggle}
      disabled={isLoading}
      style={styles.button}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={isSaved ? theme.colors.primary : theme.colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

