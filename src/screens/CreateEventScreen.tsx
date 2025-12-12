import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  venue: string;
  category: string;
  price_gbp: string;
  price_ngn: string;
  max_attendees: string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
}

const EVENT_CATEGORIES = [
  'Music Concert',
  'Birthday Party',
  'Carnival',
  'Get Together',
  'Music Karaoke',
  'Comedy Night',
  'Gospel Concert',
  'Instrumental',
  'Jazz Room',
  'Workshop',
  'Conference',
  'Festival',
  'Other'
];

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    venue: '',
    category: '',
    price_gbp: '',
    price_ngn: '',
    max_attendees: '',
    image_url: '',
    latitude: null,
    longitude: null,
    country: '',
  });

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const geocodeLocation = async (locationText: string) => {
    if (!locationText.trim()) return;

    try {
      setGeocoding(true);
      console.log('🌍 Geocoding location:', locationText);

      // Geocode the location string to get coordinates
      const results = await Location.geocodeAsync(locationText);

      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        console.log('✅ Geocoded coordinates:', { latitude, longitude });

        // Reverse geocode to get country
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const country = reverseGeocode[0]?.country || '';
        console.log('🌍 Detected country:', country);

        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          country,
        }));

        // Show confirmation to user
        Alert.alert(
          'Location Found',
          `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\nCountry: ${country}`,
          [{ text: 'OK' }]
        );
      } else {
        console.warn('⚠️ No geocoding results found for:', locationText);
        Alert.alert(
          'Location Not Found',
          'Could not find coordinates for this location. Please check the location name and try again, or tap "Use Anyway" to continue without coordinates.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Use Anyway',
              onPress: () => {
                // Clear coordinates but keep location text
                setFormData(prev => ({
                  ...prev,
                  latitude: null,
                  longitude: null,
                  country: '',
                }));
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error geocoding location:', error);
      Alert.alert(
        'Geocoding Error',
        'Failed to get coordinates for this location. You can still create the event without precise coordinates.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                latitude: null,
                longitude: null,
                country: '',
              }));
            },
          },
        ]
      );
    } finally {
      setGeocoding(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        // Upload image to Supabase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const fileName = `event-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from('event-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const { data: { publicUrl}} = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return false;
    }
    if (!formData.event_date) {
      Alert.alert('Error', 'Please select an event date');
      return false;
    }
    if (!formData.event_time) {
      Alert.alert('Error', 'Please select an event time');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Combine date and time into ISO 8601 format
      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      
      // Prepare request body according to API spec
      const eventData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_date: eventDateTime.toISOString(),
        location: formData.location.trim(),
        category: formData.category,
      };

      // Add optional fields only if they have values
      if (formData.venue.trim()) {
        eventData.venue = formData.venue.trim();
      }
      if (formData.price_gbp) {
        const price = parseFloat(formData.price_gbp);
        if (price >= 0) {
          eventData.price_gbp = price;
        }
      }
      if (formData.price_ngn) {
        const price = parseFloat(formData.price_ngn);
        if (price >= 0) {
          eventData.price_ngn = price;
        }
      }
      if (formData.max_attendees) {
        const maxAttendees = parseInt(formData.max_attendees);
        if (maxAttendees >= 1) {
          eventData.max_attendees = maxAttendees;
        }
      }
      if (formData.image_url) {
        eventData.image_url = formData.image_url;
      }

      // Add geocoded coordinates if available
      if (formData.latitude !== null && formData.longitude !== null) {
        eventData.latitude = formData.latitude;
        eventData.longitude = formData.longitude;
        console.log('📍 Including coordinates:', { lat: formData.latitude, lng: formData.longitude });
      } else {
        console.warn('⚠️ Creating event without coordinates - proximity features will not work');
      }

      // Add country if available
      if (formData.country) {
        eventData.country = formData.country;
      }

      // Call API endpoint
      const response = await fetch('https://www.soundbridge.live/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract error message from API response
        const errorMessage = result.error || result.message || `HTTP ${response.status}: Failed to create event`;
        throw new Error(errorMessage);
      }

      Alert.alert(
        'Success!',
        'Your event has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error?.message || 'Failed to create event. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border}]}>
        <BackButton onPress={() => navigation.goBack() } style={styles.headerButton} />
        <Text style={[styles.headerTitle, { color: theme.colors.text}]}>Create Event</Text>
        <TouchableOpacity 
          style={[styles.headerButton, { opacity: loading ? 0.5 : 1}]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[styles.headerButtonText, { color: theme.colors.primary}]}>
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Event Image */}
          <View style={styles.imageSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Event Image</Text>
            <TouchableOpacity style={[styles.imagePicker, { borderColor: theme.colors.border}]} onPress={pickImage}>
              {formData.image_url ? (
                <Image source={{ uri: formData.image_url}} style={styles.eventImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  {uploadingImage ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color={theme.colors.textSecondary} />
                      <Text style={[styles.imagePlaceholderText, { color: theme.colors.textSecondary}]}>
                        Tap to add image
                      </Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Event Title */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Event Title *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
              placeholder="Enter event title"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
            />
          </View>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Description *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
              placeholder="Describe your event..."
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Date & Time */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TextInput
                style={[styles.dateInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.event_date}
                onChangeText={(value) => handleInputChange('event_date', value)}
              />
              <TextInput
                style={[styles.timeInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                placeholder="HH:MM"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.event_time}
                onChangeText={(value) => handleInputChange('event_time', value)}
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Location *</Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.locationInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                placeholder="City, Country (e.g., Luton, UK)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.location}
                onChangeText={(value) => handleInputChange('location', value)}
              />
              <TouchableOpacity
                style={[styles.geocodeButton, { backgroundColor: theme.colors.primary}]}
                onPress={() => geocodeLocation(formData.location)}
                disabled={!formData.location.trim() || geocoding}
              >
                {geocoding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            {formData.latitude !== null && formData.longitude !== null && (
              <View style={[styles.coordinatesDisplay, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.coordinatesText, { color: theme.colors.textSecondary}]}>
                  Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            <Text style={[styles.helperText, { color: theme.colors.textSecondary}]}>
              Tap the location icon to get precise coordinates for proximity features
            </Text>
          </View>

          {/* Venue */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Venue (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
              placeholder="Venue name"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.venue}
              onChangeText={(value) => handleInputChange('venue', value)}
            />
          </View>

          {/* Category */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Category *</Text>
            <View style={styles.categoryGrid}>
              {EVENT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: formData.category === category ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,}
                  ]}
                  onPress={() => handleInputChange('category', category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: formData.category === category ? '#FFFFFF' : theme.colors.text}
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Pricing (Optional)</Text>
            <View style={styles.pricingRow}>
              <View style={styles.priceInputContainer}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary}]}>GBP</Text>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.price_gbp}
                  onChangeText={(value) => handleInputChange('price_gbp', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputContainer}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary}]}>NGN</Text>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.price_ngn}
                  onChangeText={(value) => handleInputChange('price_ngn', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Max Attendees */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Max Attendees (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.max_attendees}
              onChangeText={(value) => handleInputChange('max_attendees', value)}
              keyboardType="numeric"
            />
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  geocodeButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coordinatesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  coordinatesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});