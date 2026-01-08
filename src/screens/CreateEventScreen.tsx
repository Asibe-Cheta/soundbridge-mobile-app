import React, { useState, useEffect } from 'react';
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
  Switch,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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

// Country-specific address field configurations
interface AddressFieldConfig {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}

interface CountryAddressConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  fields: AddressFieldConfig[];
}

// Comprehensive address configurations for all major countries
const COUNTRY_ADDRESS_CONFIGS: CountryAddressConfig[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'New York', required: true },
      { name: 'state', label: 'State', placeholder: 'NY', required: true },
      { name: 'zipCode', label: 'ZIP Code', placeholder: '10001', required: true, keyboardType: 'numeric' },
    ]
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '10 Downing Street', required: true },
      { name: 'city', label: 'City/Town', placeholder: 'London', required: true },
      { name: 'county', label: 'County', placeholder: 'Greater London', required: false },
      { name: 'postCode', label: 'Postcode', placeholder: 'SW1A 2AA', required: true },
    ]
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'Toronto', required: true },
      { name: 'province', label: 'Province', placeholder: 'ON', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: 'M5H 2N2', required: true },
    ]
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'suburb', label: 'Suburb', placeholder: 'Sydney', required: true },
      { name: 'state', label: 'State', placeholder: 'NSW', required: true },
      { name: 'postcode', label: 'Postcode', placeholder: '2000', required: true, keyboardType: 'numeric' },
    ]
  },
  {
    countryCode: 'NG',
    countryName: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Lagos Road', required: true },
      { name: 'city', label: 'City', placeholder: 'Lagos', required: true },
      { name: 'state', label: 'State', placeholder: 'Lagos State', required: true },
      { name: 'lga', label: 'LGA', placeholder: 'Ikeja', required: false },
    ]
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Straße (Street)', placeholder: 'Hauptstraße 1', required: true },
      { name: 'city', label: 'Stadt (City)', placeholder: 'Berlin', required: true },
      { name: 'state', label: 'Bundesland (State)', placeholder: 'Berlin', required: false },
      { name: 'postleitzahl', label: 'Postleitzahl (ZIP)', placeholder: '10115', required: true, keyboardType: 'numeric' },
    ]
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Rue (Street)', placeholder: '1 Rue de Rivoli', required: true },
      { name: 'city', label: 'Ville (City)', placeholder: 'Paris', required: true },
      { name: 'department', label: 'Département', placeholder: 'Paris', required: false },
      { name: 'codePostal', label: 'Code Postal', placeholder: '75001', required: true, keyboardType: 'numeric' },
    ]
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    fields: [
      { name: 'street', label: 'Street/House No', placeholder: '123 MG Road', required: true },
      { name: 'city', label: 'City', placeholder: 'Mumbai', required: true },
      { name: 'state', label: 'State', placeholder: 'Maharashtra', required: true },
      { name: 'pinCode', label: 'PIN Code', placeholder: '400001', required: true, keyboardType: 'numeric' },
    ]
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    fields: [
      { name: 'prefecture', label: 'Prefecture (都道府県)', placeholder: 'Tokyo', required: true },
      { name: 'city', label: 'City/Ward (市区町村)', placeholder: 'Shibuya', required: true },
      { name: 'street', label: 'Street Address (番地)', placeholder: '1-1-1', required: true },
      { name: 'postalCode', label: 'Postal Code (〒)', placeholder: '150-0001', required: true },
    ]
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    fields: [
      { name: 'street', label: 'Logradouro (Street)', placeholder: 'Av Paulista, 1000', required: true },
      { name: 'neighborhood', label: 'Bairro (Neighborhood)', placeholder: 'Bela Vista', required: true },
      { name: 'city', label: 'Cidade (City)', placeholder: 'São Paulo', required: true },
      { name: 'state', label: 'Estado (State)', placeholder: 'SP', required: true },
      { name: 'cep', label: 'CEP', placeholder: '01310-100', required: true },
    ]
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Calle (Street)', placeholder: 'Av Reforma 123', required: true },
      { name: 'colonia', label: 'Colonia', placeholder: 'Centro', required: true },
      { name: 'city', label: 'Ciudad (City)', placeholder: 'Ciudad de México', required: true },
      { name: 'state', label: 'Estado (State)', placeholder: 'CDMX', required: true },
      { name: 'codigoPostal', label: 'Código Postal', placeholder: '06000', required: true, keyboardType: 'numeric' },
    ]
  },
];

// Fallback for countries not in the list
const DEFAULT_ADDRESS_CONFIG: CountryAddressConfig = {
  countryCode: 'XX',
  countryName: 'Other',
  currency: 'USD',
  currencySymbol: '$',
  fields: [
    { name: 'street', label: 'Street Address', placeholder: 'Enter street address', required: true },
    { name: 'city', label: 'City', placeholder: 'Enter city', required: true },
    { name: 'stateProvince', label: 'State/Province', placeholder: 'Enter state/province', required: false },
    { name: 'postalCode', label: 'Postal/ZIP Code', placeholder: 'Enter postal code', required: false },
  ]
};

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  venue: string;
  category: string;
  max_attendees: string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;

  // Location fields
  country: string;
  addressFields: Record<string, string>;

  // Pricing fields
  isFree: boolean;
  prices: Record<string, string>; // currency -> price mapping
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
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    venue: '',
    category: '',
    max_attendees: '',
    image_url: '',
    latitude: null,
    longitude: null,
    country: 'GB', // Default to UK
    addressFields: {},
    isFree: true,
    prices: {},
  });

  const [selectedCountryConfig, setSelectedCountryConfig] = useState<CountryAddressConfig>(
    COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === 'GB') || DEFAULT_ADDRESS_CONFIG
  );

  // Update country config when country changes
  useEffect(() => {
    const config = COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === formData.country);
    setSelectedCountryConfig(config || DEFAULT_ADDRESS_CONFIG);
    // Reset address fields when country changes
    setFormData(prev => ({ ...prev, addressFields: {} }));
  }, [formData.country]);

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      addressFields: {
        ...prev.addressFields,
        [fieldName]: value,
      }
    }));
  };

  const handlePriceChange = (currency: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [currency]: value,
      }
    }));
  };

  const geocodeLocation = async () => {
    // Build full address from fields
    const addressParts = Object.entries(formData.addressFields)
      .filter(([_, value]) => value.trim())
      .map(([_, value]) => value);

    const fullAddress = addressParts.join(', ') + ', ' + selectedCountryConfig.countryName;

    if (addressParts.length === 0) {
      Alert.alert('Error', 'Please enter address details first');
      return;
    }

    try {
      setGeocoding(true);
      console.log('🌍 Geocoding location:', fullAddress);

      const results = await Location.geocodeAsync(fullAddress);

      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        console.log('✅ Geocoded coordinates:', { latitude, longitude });

        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
        }));

        Alert.alert(
          'Location Found',
          `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Location Not Found',
          'Could not find coordinates. You can still create the event without precise coordinates.',
          [
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error geocoding:', error);
      Alert.alert(
        'Geocoding Error',
        'Failed to get coordinates. You can still create the event.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeocoding(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any, // Fixed deprecation
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;

        console.log('📸 Uploading event image:', imageUri);

        // React Native: Read file as ArrayBuffer (blob() doesn't exist in RN)
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        const fileName = `event-${user?.id || 'unknown'}-${Date.now()}.jpg`;

        // Upload image to Supabase Storage
        const { data, error } = await supabase.storage
          .from('event-images')
          .upload(fileName, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) {
          console.error('❌ Upload error:', error);
          throw error;
        }

        console.log('✅ Image uploaded:', data.path);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(data.path);

        const publicUrl = urlData.publicUrl;
        console.log('✅ Public URL:', publicUrl);

        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        setUploadingImage(false);
      }
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      setUploadingImage(false);
      Alert.alert('Upload Error', error.message || 'Failed to upload image. Please try again.');
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
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }

    // Validate required address fields
    const requiredFields = selectedCountryConfig.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!formData.addressFields[field.name]?.trim()) {
        Alert.alert('Error', `Please enter ${field.label}`);
        return false;
      }
    }

    // Validate pricing if not free
    if (!formData.isFree) {
      const hasAnyPrice = Object.values(formData.prices).some(price => {
        const numPrice = parseFloat(price);
        return !isNaN(numPrice) && numPrice > 0;
      });

      if (!hasAnyPrice) {
        Alert.alert('Error', 'Please set at least one price, or mark the event as free');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Combine date and time
      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);

      // Build location string from address fields
      const locationParts = Object.entries(formData.addressFields)
        .filter(([_, value]) => value.trim())
        .map(([_, value]) => value);
      const location = locationParts.join(', ');

      // Extract city from address fields (needed for notifications)
      // Different countries use different field names for city
      const cityField = formData.addressFields['city'] ||
                       formData.addressFields['suburb'] ||
                       formData.addressFields['town'] || '';

      // Prepare event data
      const eventData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_date: eventDateTime.toISOString(),
        location: location,
        city: cityField.trim(), // Add city field for proximity notifications
        category: formData.category,
        country: formData.country,
      };

      // Add optional fields
      if (formData.venue.trim()) {
        eventData.venue = formData.venue.trim();
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

      // Add coordinates
      if (formData.latitude !== null && formData.longitude !== null) {
        eventData.latitude = formData.latitude;
        eventData.longitude = formData.longitude;
        console.log('📍 Including coordinates:', { lat: formData.latitude, lng: formData.longitude });
      }

      // Add pricing - convert to multiple currency fields
      eventData.is_free = formData.isFree;

      if (!formData.isFree) {
        // Add all prices that were set
        Object.entries(formData.prices).forEach(([currency, price]) => {
          const numPrice = parseFloat(price);
          if (!isNaN(numPrice) && numPrice > 0) {
            // Backend expects price_gbp, price_ngn, price_usd, etc.
            const fieldName = `price_${currency.toLowerCase()}`;
            eventData[fieldName] = numPrice;
          }
        });
      }

      // Store structured address data
      eventData.address_data = {
        country: formData.country,
        fields: formData.addressFields,
      };

      console.log('📤 Sending event data:', eventData);

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
      console.error('❌ Error creating event:', error);
      const errorMessage = error?.message || 'Failed to create event. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = COUNTRY_ADDRESS_CONFIGS.filter(country =>
    country.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
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
          <BackButton onPress={() => navigation.goBack()} style={styles.headerButton} />
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
                        borderColor: theme.colors.border,
                      }
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

            {/* Country Selection */}
            <View style={styles.inputSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Country *</Text>
              <TouchableOpacity
                style={[styles.countrySelector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.countrySelectorText, { color: theme.colors.text}]}>
                  {selectedCountryConfig.countryName}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Dynamic Address Fields */}
            <View style={styles.inputSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Address *</Text>
                <TouchableOpacity
                  style={[styles.geocodeButton, { backgroundColor: theme.colors.primary}]}
                  onPress={geocodeLocation}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={16} color="#FFFFFF" />
                      <Text style={styles.geocodeButtonText}>Get Coordinates</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {selectedCountryConfig.fields.map((field) => (
                <View key={field.name} style={styles.addressFieldContainer}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text}]}>
                    {field.label} {field.required && '*'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.addressFields[field.name] || ''}
                    onChangeText={(value) => handleAddressFieldChange(field.name, value)}
                    keyboardType={field.keyboardType || 'default'}
                  />
                </View>
              ))}

              {formData.latitude !== null && formData.longitude !== null && (
                <View style={[styles.coordinatesDisplay, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.coordinatesText, { color: theme.colors.textSecondary}]}>
                    Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
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

            {/* Pricing Section */}
            <View style={styles.inputSection}>
              <View style={styles.pricingHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Pricing</Text>
                <View style={styles.freeToggleContainer}>
                  <Text style={[styles.freeToggleLabel, { color: theme.colors.text}]}>Free Event</Text>
                  <Switch
                    value={formData.isFree}
                    onValueChange={(value) => handleInputChange('isFree', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {!formData.isFree && (
                <View style={styles.pricingSection}>
                  <Text style={[styles.helperText, { color: theme.colors.textSecondary, marginBottom: 12}]}>
                    Set prices in different currencies. Leave empty if not applicable.
                  </Text>

                  {/* Primary Currency (based on selected country) */}
                  <View style={styles.priceRow}>
                    <Text style={[styles.currencyLabel, { color: theme.colors.text}]}>
                      {selectedCountryConfig.currency} ({selectedCountryConfig.currencySymbol})
                    </Text>
                    <TextInput
                      style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={formData.prices[selectedCountryConfig.currency] || ''}
                      onChangeText={(value) => handlePriceChange(selectedCountryConfig.currency, value)}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {/* Additional Common Currencies */}
                  {selectedCountryConfig.currency !== 'USD' && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.currencyLabel, { color: theme.colors.text}]}>USD ($)</Text>
                      <TextInput
                        style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.prices['USD'] || ''}
                        onChangeText={(value) => handlePriceChange('USD', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}

                  {selectedCountryConfig.currency !== 'GBP' && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.currencyLabel, { color: theme.colors.text}]}>GBP (£)</Text>
                      <TextInput
                        style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.prices['GBP'] || ''}
                        onChangeText={(value) => handlePriceChange('GBP', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}

                  {selectedCountryConfig.currency !== 'EUR' && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.currencyLabel, { color: theme.colors.text}]}>EUR (€)</Text>
                      <TextInput
                        style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.prices['EUR'] || ''}
                        onChangeText={(value) => handlePriceChange('EUR', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}

                  {selectedCountryConfig.currency !== 'NGN' && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.currencyLabel, { color: theme.colors.text}]}>NGN (₦)</Text>
                      <TextInput
                        style={[styles.priceInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border}]}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.prices['NGN'] || ''}
                        onChangeText={(value) => handlePriceChange('NGN', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
              )}
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

        {/* Country Picker Modal */}
        <Modal
          visible={showCountryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCountryPicker(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.modalContent, { backgroundColor: theme.colors.surface}]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border}]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text}]}>Select Country</Text>
                  <TouchableOpacity onPress={() => {
                    setShowCountryPicker(false);
                    setSearchQuery('');
                  }}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.searchInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border}]}
                  placeholder="Search countries..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />

                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.countryCode}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        { borderBottomColor: theme.colors.border},
                        formData.country === item.countryCode && { backgroundColor: theme.colors.primary + '20' }
                      ]}
                      onPress={() => {
                        handleInputChange('country', item.countryCode);
                        setShowCountryPicker(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={[styles.countryItemText, { color: theme.colors.text}]}>
                        {item.countryName}
                      </Text>
                      <Text style={[styles.countryItemCurrency, { color: theme.colors.textSecondary}]}>
                        {item.currency}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minHeight: 100,
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
  countrySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countrySelectorText: {
    fontSize: 16,
  },
  addressFieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  geocodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  geocodeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  coordinatesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  coordinatesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  pricingSection: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    maxHeight: '70%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  countryItemText: {
    fontSize: 16,
  },
  countryItemCurrency: {
    fontSize: 14,
  },
});
