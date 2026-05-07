/**
 * ExternalLinksManager Component
 * Manages external portfolio links in settings
 * Allows creators to add, edit, and delete links
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { ExternalLink, PlatformType } from '../../types/external-links';
import { PLATFORM_METADATA, MAX_EXTERNAL_LINKS } from '../../config/external-links-config';
import { externalLinksService } from '../../services/ExternalLinksService';
import { canAddMoreLinks } from '../../utils/external-links-validation';
import { AddExternalLinkModal } from './AddExternalLinkModal';

interface ExternalLinksManagerProps {
  session: Session;
  userId: string;
}

export const ExternalLinksManager: React.FC<ExternalLinksManagerProps> = ({
  session,
  userId,
}) => {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);

  useEffect(() => {
    loadLinks();
  }, [userId]);

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      const fetchedLinks = await externalLinksService.getExternalLinks(userId);
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('Error loading external links:', error);
      Alert.alert('Error', 'Failed to load external links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = () => {
    if (!canAddMoreLinks(links.length)) {
      Alert.alert(
        'Maximum Links Reached',
        `You can only add up to ${MAX_EXTERNAL_LINKS} external links.`
      );
      return;
    }
    setEditingLink(null);
    setIsModalVisible(true);
  };

  const handleEditLink = (link: ExternalLink) => {
    setEditingLink(link);
    setIsModalVisible(true);
  };

  const handleDeleteLink = (link: ExternalLink) => {
    Alert.alert(
      'Delete Link',
      `Are you sure you want to remove your ${PLATFORM_METADATA[link.platform_type].name} link?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await externalLinksService.deleteExternalLink(session, link.id);
              Alert.alert('Success', 'Link deleted successfully');
              loadLinks();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete link');
            }
          },
        },
      ]
    );
  };

  const handleSaveLink = async () => {
    // Reload links after save
    await loadLinks();
    setIsModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio Links</Text>
        <Text style={styles.description}>
          Add up to {MAX_EXTERNAL_LINKS} external platform links to showcase your work
          on other platforms. These will be displayed on your public profile.
        </Text>
      </View>

      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="link-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No external links added yet</Text>
          <Text style={styles.emptySubtext}>
            Share your presence on other platforms
          </Text>
        </View>
      ) : (
        <View style={styles.linksList}>
          {links
            .sort((a, b) => a.display_order - b.display_order)
            .map((link) => {
              const metadata = PLATFORM_METADATA[link.platform_type];
              return (
                <View key={link.id} style={styles.linkItem}>
                  <View style={styles.linkInfo}>
                    <View
                      style={[
                        styles.platformIcon,
                        { backgroundColor: `${metadata.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={metadata.icon as any}
                        size={20}
                        color={metadata.color}
                      />
                    </View>
                    <View style={styles.linkDetails}>
                      <Text style={styles.platformName}>{metadata.name}</Text>
                      <Text style={styles.linkUrl} numberOfLines={1}>
                        {link.url}
                      </Text>
                      <Text style={styles.clickCount}>
                        {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.linkActions}>
                    <TouchableOpacity
                      onPress={() => handleEditLink(link)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="pencil" size={20} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteLink(link)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.addButton,
          !canAddMoreLinks(links.length) && styles.addButtonDisabled,
        ]}
        onPress={handleAddLink}
        disabled={!canAddMoreLinks(links.length)}
      >
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={canAddMoreLinks(links.length) ? '#6366f1' : '#9CA3AF'}
        />
        <Text
          style={[
            styles.addButtonText,
            !canAddMoreLinks(links.length) && styles.addButtonTextDisabled,
          ]}
        >
          {canAddMoreLinks(links.length)
            ? 'Add External Link'
            : `Maximum links reached (${links.length}/${MAX_EXTERNAL_LINKS})`}
        </Text>
      </TouchableOpacity>

      <AddExternalLinkModal
        visible={isModalVisible}
        session={session}
        existingLink={editingLink}
        existingPlatforms={links.map((l) => l.platform_type)}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveLink}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  linksList: {
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkDetails: {
    flex: 1,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  clickCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  linkActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
