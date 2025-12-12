import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { brandingService, BrandingSettings } from '../services/BrandingService';
import RevenueCatService from '../services/RevenueCatService';
import * as ImagePicker from 'expo-image-picker';

const PREDEFINED_COLORS = [
  '#EF4444', '#DC2626', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#6366F1',
  '#000000', '#1F2937', '#374151', '#4B5563', '#6B7280',
  '#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF',
];

const LOGO_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
];

const WATERMARK_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const LAYOUT_STYLES = [
  { value: 'default', label: 'Default' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
];

export default function BrandingCustomizationScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);

  useEffect(() => {
    checkTierAccess();
    loadBranding();
  }, []);

  const checkTierAccess = async () => {
    try {
      if (RevenueCatService.isReady()) {
        const customerInfo = await RevenueCatService.getCustomerInfo();
        if (customerInfo) {
          const hasPremium = RevenueCatService.checkPremiumEntitlement(customerInfo);
          const hasUnlimited = RevenueCatService.checkUnlimitedEntitlement(customerInfo);
          setHasPremiumAccess(hasPremium || hasUnlimited);
        }
      }
    } catch (error) {
      console.error('Error checking tier access:', error);
    }
  };

  const loadBranding = async () => {
    if (!user?.id || !session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await brandingService.getUserBranding(user.id, session);
      
      if (result.success && result.branding) {
        setBranding(result.branding);
      } else {
        // Set defaults
        setBranding({
          primary_color: '#EF4444',
          secondary_color: '#1F2937',
          accent_color: '#F59E0B',
          show_powered_by: true,
          watermark_enabled: false,
          watermark_opacity: 30,
          watermark_position: 'bottom-right',
          custom_logo_position: 'top-left',
          layout_style: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error loading branding:', error);
      Alert.alert('Error', 'Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async (updates: Partial<BrandingSettings>) => {
    if (!user?.id || !session) return;

    try {
      setSaving(true);
      const updatedBranding = { ...branding, ...updates };
      const result = await brandingService.updateUserBranding(user.id, updates, session);

      if (result.success) {
        setBranding(updatedBranding);
        Alert.alert('Success', 'Branding settings updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update branding settings');
      }
    } catch (error) {
      console.error('❌ Error saving branding:', error);
      Alert.alert('Error', 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (colorType: 'primary_color' | 'secondary_color' | 'accent_color', color: string) => {
    if (!branding) return;
    saveBranding({ [colorType]: color });
    setShowColorPicker(null);
  };

  const handleLogoUpload = async () => {
    if (!hasPremiumAccess) {
      Alert.alert(
        'Premium Feature',
        'Custom logos are available for Premium and Unlimited subscribers. Upgrade to unlock this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade' as never) },
        ]
      );
      return;
    }

    if (!user?.id || !session) return;

    Alert.alert(
      'Upload Logo',
      'Choose how you want to upload your logo',
      [
        { text: 'Camera', onPress: () => uploadLogo('camera') },
        { text: 'Gallery', onPress: () => uploadLogo('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadLogo = async (source: 'camera' | 'gallery') => {
    if (!user?.id || !session) return;

    try {
      setUploadingLogo(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select a logo.');
        return;
      }

      let result;
      if (source === 'camera') {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
          Alert.alert('Permission Required', 'We need camera permissions to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 1],
          quality: 0.9,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 1],
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Logos must be under 5MB');
          return;
        }

        const uploadResult = await brandingService.uploadCustomLogo(user.id, asset.uri, session);
        
        if (uploadResult.success && uploadResult.logoUrl) {
          await saveBranding({ custom_logo_url: uploadResult.logoUrl });
          Alert.alert('Success', 'Logo uploaded successfully');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload logo');
        }
      }
    } catch (error) {
      console.error('❌ Error uploading logo:', error);
      Alert.alert('Error', 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove your custom logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => saveBranding({ custom_logo_url: null }),
        },
      ]
    );
  };

  const renderColorPicker = (colorType: 'primary_color' | 'secondary_color' | 'accent_color', label: string) => {
    if (!branding) return null;

    const currentColor = branding[colorType] || '#EF4444';
    const isOpen = showColorPicker === colorType;

    return (
      <View style={styles.colorSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.colorButton, { borderColor: theme.colors.border }]}
          onPress={() => setShowColorPicker(isOpen ? null : colorType)}
        >
          <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
          <Text style={[styles.colorValue, { color: theme.colors.text }]}>{currentColor}</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={[styles.colorPickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Predefined Colors */}
            <View style={styles.colorSwatches}>
              {PREDEFINED_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedSwatch,
                  ]}
                  onPress={() => handleColorChange(colorType, color)}
                >
                  {currentColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Hex Input */}
            <View style={styles.hexInputContainer}>
              <Text style={[styles.hexLabel, { color: theme.colors.textSecondary }]}>Or enter hex code:</Text>
              <TextInput
                style={[styles.hexInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={currentColor}
                placeholder="#EF4444"
                placeholderTextColor={theme.colors.textMuted}
                onChangeText={(text) => {
                  if (text.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                    handleColorChange(colorType, text);
                  }
                }}
                maxLength={7}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading branding settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!branding) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="color-palette-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Failed to load branding settings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Branding</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Colors Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Brand Colors</Text>
          {renderColorPicker('primary_color', 'Primary Color')}
          {renderColorPicker('secondary_color', 'Secondary Color')}
          {renderColorPicker('accent_color', 'Accent Color')}
        </View>

        {/* Custom Logo Section (Premium/Unlimited) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Custom Logo</Text>
            {!hasPremiumAccess && (
              <View style={[styles.premiumBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.primary} />
                <Text style={[styles.premiumBadgeText, { color: theme.colors.primary }]}>Premium</Text>
              </View>
            )}
          </View>

          {branding.custom_logo_url ? (
            <View style={[styles.logoPreviewContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Image source={{ uri: branding.custom_logo_url }} style={styles.logoPreview} resizeMode="contain" />
              <View style={styles.logoActions}>
                <TouchableOpacity
                  style={[styles.logoActionButton, { backgroundColor: theme.colors.surface }]}
                  onPress={handleLogoUpload}
                  disabled={!hasPremiumAccess || uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={16} color={theme.colors.text} />
                      <Text style={[styles.logoActionText, { color: theme.colors.text }]}>Replace</Text>
                    </>
                  )}
                </TouchableOpacity>
                {hasPremiumAccess && (
                  <TouchableOpacity
                    style={[styles.logoActionButton, { backgroundColor: theme.colors.error + '20' }]}
                    onPress={handleRemoveLogo}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    <Text style={[styles.logoActionText, { color: theme.colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadLogoButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={handleLogoUpload}
              disabled={!hasPremiumAccess || uploadingLogo}
            >
              {uploadingLogo ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={24} color={hasPremiumAccess ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.uploadLogoText, { color: hasPremiumAccess ? theme.colors.primary : theme.colors.textSecondary }]}>
                    Upload Logo
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {hasPremiumAccess && branding.custom_logo_url && (
            <View style={styles.logoPositionSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Logo Position</Text>
              <View style={styles.positionGrid}>
                {LOGO_POSITIONS.map((position) => (
                  <TouchableOpacity
                    key={position.value}
                    style={[
                      styles.positionButton,
                      {
                        backgroundColor: branding.custom_logo_position === position.value ? theme.colors.primary + '20' : theme.colors.surface,
                        borderColor: branding.custom_logo_position === position.value ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => saveBranding({ custom_logo_position: position.value })}
                  >
                    <Text
                      style={[
                        styles.positionButtonText,
                        {
                          color: branding.custom_logo_position === position.value ? theme.colors.primary : theme.colors.text,
                        },
                      ]}
                    >
                      {position.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Layout Style (Premium/Unlimited) */}
        {hasPremiumAccess && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Layout Style</Text>
            <View style={styles.styleGrid}>
              {LAYOUT_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  style={[
                    styles.styleButton,
                    {
                      backgroundColor: branding.layout_style === style.value ? theme.colors.primary + '20' : theme.colors.surface,
                      borderColor: branding.layout_style === style.value ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => saveBranding({ layout_style: style.value })}
                >
                  <Text
                    style={[
                      styles.styleButtonText,
                      {
                        color: branding.layout_style === style.value ? theme.colors.primary : theme.colors.text,
                      },
                    ]}
                  >
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Watermark Settings (Premium/Unlimited) */}
        {hasPremiumAccess && (
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="water" size={24} color={theme.colors.primary} />
                <View style={styles.settingContent}>
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Watermark</Text>
                  <Text style={[styles.settingSubtext, { color: theme.colors.textSecondary }]}>
                    Add watermark to your content
                  </Text>
                </View>
              </View>
              <Switch
                value={branding.watermark_enabled || false}
                onValueChange={(value) => saveBranding({ watermark_enabled: value })}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={branding.watermark_enabled ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>

            {branding.watermark_enabled && (
              <>
                <View style={styles.watermarkSettings}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Watermark Opacity</Text>
                  <Text style={[styles.opacityValue, { color: theme.colors.text }]}>
                    {branding.watermark_opacity || 30}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={100}
                  value={branding.watermark_opacity || 30}
                  onValueChange={(value) => saveBranding({ watermark_opacity: Math.round(value) })}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
                <View style={styles.positionGrid}>
                  {WATERMARK_POSITIONS.map((position) => (
                    <TouchableOpacity
                      key={position.value}
                      style={[
                        styles.positionButton,
                        {
                          backgroundColor: branding.watermark_position === position.value ? theme.colors.primary + '20' : theme.colors.surface,
                          borderColor: branding.watermark_position === position.value ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => saveBranding({ watermark_position: position.value })}
                    >
                      <Text
                        style={[
                          styles.positionButtonText,
                          {
                            color: branding.watermark_position === position.value ? theme.colors.primary : theme.colors.text,
                          },
                        ]}
                      >
                        {position.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Powered By Toggle */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={24} color={theme.colors.textSecondary} />
              <View style={styles.settingContent}>
                <Text style={[styles.settingText, { color: theme.colors.text }]}>Show "Powered by SoundBridge"</Text>
                <Text style={[styles.settingSubtext, { color: theme.colors.textSecondary }]}>
                  Required for free accounts
                </Text>
              </View>
            </View>
            <Switch
              value={branding.show_powered_by !== false}
              onValueChange={(value) => {
                if (!hasPremiumAccess && !value) {
                  Alert.alert('Required', 'Free accounts must show "Powered by SoundBridge"');
                  return;
                }
                saveBranding({ show_powered_by: value });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
              thumbColor={branding.show_powered_by !== false ? theme.colors.primary : theme.colors.textSecondary}
              disabled={!hasPremiumAccess}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  colorSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  colorValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  colorPickerContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  hexInputContainer: {
    marginTop: 8,
  },
  hexLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  hexInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  uploadLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
  },
  uploadLogoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoPreviewContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoPreview: {
    width: '100%',
    height: 100,
    marginBottom: 16,
  },
  logoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  logoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  logoActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoPositionSection: {
    marginTop: 16,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  positionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  positionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  styleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 12,
  },
  watermarkSettings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  opacityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
    marginBottom: 16,
  },
});

