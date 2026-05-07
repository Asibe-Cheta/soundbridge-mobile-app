/**
 * ExternalLinksScreen
 * Dedicated screen for managing external portfolio links
 * Clean, simple interface matching the app's design language
 */

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ExternalLink, PlatformType } from '../types/external-links';
import { externalLinksService } from '../services/ExternalLinksService';
import { AddExternalLinkModal } from '../components/ExternalLinks/AddExternalLinkModal';
import { PLATFORM_METADATA } from '../config/external-links-config';
import { SystemTypography as Typography } from '../constants/Typography';

export default function ExternalLinksScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        loadLinks();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadLinks = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.user?.id) return;

      const fetchedLinks = await externalLinksService.getExternalLinks(
        session.data.session.user.id
      );
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  const handleAddLink = () => {
    if (links.length >= 2) {
      Alert.alert('Limit Reached', 'You can only add up to 2 external links.');
      return;
    }
    setEditingLink(null);
    setModalVisible(true);
  };

  const handleEditLink = (link: ExternalLink) => {
    setEditingLink(link);
    setModalVisible(true);
  };

  const handleDeleteLink = (link: ExternalLink) => {
    Alert.alert(
      'Delete Link',
      `Remove ${PLATFORM_METADATA[link.platform_type]?.name} link?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!session) return;
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

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingLink(null);
  };

  const handleModalSave = () => {
    setModalVisible(false);
    setEditingLink(null);
    loadLinks();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>External Links</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>External Links</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Please sign in to manage external links
          </Text>
        </View>
      </View>
    );
  }

  const existingPlatforms: PlatformType[] = links.map(link => link.platform_type);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>External Links</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Portfolio Links
          </Text>
          <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
            Add up to 2 external platform links to showcase your work on other platforms.
            These will be displayed on your public profile.
          </Text>
        </View>

        {/* Links List */}
        {links.length > 0 && (
          <View style={styles.linksSection}>
            {links.map((link) => {
              const metadata = PLATFORM_METADATA[link.platform_type];
              if (!metadata) return null;

              return (
                <View
                  key={link.id}
                  style={[
                    styles.linkItem,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.linkContent}>
                    <View
                      style={[
                        styles.platformIcon,
                        { backgroundColor: `${metadata.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={metadata.icon as any}
                        size={24}
                        color={metadata.color}
                      />
                    </View>
                    <View style={styles.linkInfo}>
                      <Text style={[styles.platformName, { color: theme.colors.text }]}>
                        {metadata.name}
                      </Text>
                      <Text
                        style={[styles.linkUrl, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {link.url}
                      </Text>
                      <Text style={[styles.clickCount, { color: theme.colors.textSecondary }]}>
                        {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.linkActions}>
                    <TouchableOpacity
                      onPress={() => handleEditLink(link)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="pencil" size={20} color={theme.colors.primary} />
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

        {/* Empty State */}
        {links.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="link" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No external links added yet
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Share your presence on other platforms
            </Text>
          </View>
        )}

        {/* Add Button */}
        {links.length < 2 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddLink}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add External Link</Text>
          </TouchableOpacity>
        )}

        {/* Limit Message */}
        {links.length >= 2 && (
          <View style={styles.limitMessage}>
            <Ionicons name="information-circle" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.limitText, { color: theme.colors.textSecondary }]}>
              You've reached the maximum of 2 external links
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      {session && (
        <AddExternalLinkModal
          visible={modalVisible}
          session={session}
          existingLink={editingLink}
          existingPlatforms={existingPlatforms}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  infoSection: {
    padding: 16,
  },
  infoTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoDescription: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  linksSection: {
    paddingHorizontal: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkInfo: {
    flex: 1,
  },
  platformName: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkUrl: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  clickCount: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  linkActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  addButtonText: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  limitMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  limitText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
});
