import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import { config } from '../config/environment';
import RevenueCatService from '../services/RevenueCatService';
import { subscriptionService } from '../services/SubscriptionService';
import { SystemTypography as Typography } from '../constants/Typography';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import BecomeCreatorModal from '../components/BecomeCreatorModal';
import UpgradeForPaidEventsModal from '../components/UpgradeForPaidEventsModal';
import { useCreatorAgreement } from '../hooks/useCreatorAgreement';
import CreatorAgreementModal from '../components/CreatorAgreementModal';
import { SubscriptionStatusService } from '../services/SubscriptionStatusService';

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
  const { user, userProfile, updateUserProfile, refreshUser, session } = useAuth();
  const { requestAgreement, agreementVisible, agreementSubmitting, onAgreed, onDismiss } = useCreatorAgreement();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for paid event gating
  const [showBecomeCreatorModal, setShowBecomeCreatorModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Event responsibility disclaimer — must be ticked before publishing
  const [eventDisclaimerAccepted, setEventDisclaimerAccepted] = useState(false);
  const [becomeCreatorLoading, setBecomeCreatorLoading] = useState(false);

  // User role and subscription state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium' | 'unlimited'>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'cancelled' | 'expired' | 'past_due' | null>(null);

  // Fetch user role and subscription tier on mount
  const fetchUserDetails = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserRole(data.role || 'listener');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  }, [user?.id]);

  const fetchSubscriptionTier = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Development bypass
      if (config.bypassRevenueCat && config.developmentTier) {
        setSubscriptionTier(config.developmentTier);
        setSubscriptionStatus('active');
        return;
      }

      // Prefer RevenueCat if ready (TestFlight)
      let attempts = 0;
      while (!RevenueCatService.isReady() && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (RevenueCatService.isReady()) {
        const customerInfo = await RevenueCatService.getCustomerInfo();
        if (customerInfo) {
          const tier = RevenueCatService.getUserTier(customerInfo);
          setSubscriptionTier(tier);
          setSubscriptionStatus(tier === 'free' ? null : 'active');
          return;
        }
      }

      // Fallback to backend subscription status if we have a session
      if (session) {
        const subscription = await subscriptionService.getSubscriptionStatus(session);
        setSubscriptionTier(subscription.tier);
        setSubscriptionStatus(subscription.status);
        return;
      }

      // Final fallback to profile-based status
      const profileStatus = await SubscriptionStatusService.getSubscriptionStatus(user.id);
      if (profileStatus) {
        setSubscriptionTier(profileStatus.tier);
        setSubscriptionStatus(profileStatus.status);
      }
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    }
  }, [user?.id, session]);

  useEffect(() => {
    fetchUserDetails();
    fetchSubscriptionTier();
  }, [fetchUserDetails, fetchSubscriptionTier]);

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptionTier();
    }, [fetchSubscriptionTier])
  );

  // All tiers can create paid events — no subscription required
  const canCreatePaidEvents = true;

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

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

  // Handle toggling paid event - all tiers can create paid events
  const handleToggleFreeEvent = (isFree: boolean) => {
    setFormData(prev => ({ ...prev, isFree }));
  };

  // Handle becoming a creator
  const handleBecomeCreator = async (): Promise<boolean> => {
    setBecomeCreatorLoading(true);
    try {
      // Role upgrade handled by POST /api/user/become-creator in BecomeCreatorModal.
      await refreshUser();
      setUserRole('creator');

      Alert.alert(
        'Welcome, Creator!',
        'Your account has been upgraded to a creator account. To host paid events, you\'ll need a subscription.',
        [
          {
            text: 'View Plans',
            onPress: () => {
              setShowBecomeCreatorModal(false);
              navigation.navigate('Upgrade' as never);
            },
          },
          {
            text: 'Later',
            style: 'cancel',
          },
        ]
      );
      return true;
    } catch (error) {
      console.error('Error becoming creator:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBecomeCreatorLoading(false);
    }
  };

  // Date picker handler
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      // Format as YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];
      handleInputChange('event_date', formattedDate);
    }
  };

  // Time picker handler
  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && time) {
      setSelectedTime(time);
      // Format as HH:MM
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      handleInputChange('event_time', `${hours}:${minutes}`);
    }
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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
    // If we have coordinates from Google Places, street field is auto-filled via the search
    // so we only strictly require city for submission
    const requiredFields = selectedCountryConfig.fields.filter(f => f.required);
    for (const field of requiredFields) {
      // Skip street validation if we have valid coordinates (Google Places was used)
      if (field.name === 'street' && formData.latitude !== null && formData.longitude !== null) {
        continue;
      }
      // Skip state validation if we have coordinates - Google Places provides location accuracy
      if (field.name === 'state' && formData.latitude !== null && formData.longitude !== null) {
        continue;
      }
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

      // Ticket purchases currently support GBP/NGN only
      const hasSupportedPrice = ['GBP', 'NGN'].some((currency) => {
        const value = formData.prices[currency];
        const numPrice = parseFloat(value);
        return !isNaN(numPrice) && numPrice > 0;
      });

      if (!hasSupportedPrice) {
        Alert.alert(
          'Unsupported Currency',
          'Ticket purchases currently support GBP or NGN. Please set at least one of those prices.'
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Creator agreement gate — first creative action only
    const agreed = await requestAgreement();
    if (!agreed) return;

    if (!eventDisclaimerAccepted) {
      Alert.alert('Confirmation Required', 'Please confirm that you accept responsibility for this event before publishing.');
      return;
    }

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
      // Note: Backend API handles category mapping internally - send display format
      const eventData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_date: eventDateTime.toISOString(),
        location: location,
        city: cityField.trim(), // Add city field for proximity notifications
        category: formData.category, // Send display format - backend maps to enum
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

      // Note: address_data column doesn't exist in database yet
      // The address is already captured in the 'location' field as a string
      // Country is stored separately in 'country' field

      console.log('📤 Sending event data:', JSON.stringify(eventData, null, 2));

      // Call API endpoint using apiFetch for proper authentication
      const result = await apiFetch<{ success: boolean; event?: any; error?: string; message?: string }>('/api/events', {
        method: 'POST',
        session,
        body: JSON.stringify(eventData),
      });

      console.log('📥 API result:', result);

      if (!result.success) {
        const errorMessage = result.error || result.message || 'Failed to create event';
        console.error('❌ API error response:', result);
        throw new Error(errorMessage);
      }

      // Store disclaimer acceptance per event (best-effort — columns added by web app migration)
      if (result.event?.id) {
        supabase.from('events').update({
          creator_event_disclaimer_accepted: true,
          creator_event_disclaimer_accepted_at: new Date().toISOString(),
        }).eq('id', result.event.id).then(() => {}).catch(() => {});
      }

      // Queue push notifications to nearby genre-matched users (fire-and-forget)
      if (result.event?.id) {
        apiFetch(`/api/events/${result.event.id}/queue-notifications`, {
          method: 'POST',
          session,
        }).catch((err) => console.warn('⚠️ Failed to queue event notifications:', err));
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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
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
                {/* Date Picker Button */}
                <TouchableOpacity
                  style={[styles.datePickerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerText, { color: formData.event_date ? theme.colors.text : theme.colors.textSecondary }]}>
                    {formatDisplayDate(formData.event_date)}
                  </Text>
                </TouchableOpacity>

                {/* Time Picker Button */}
                <TouchableOpacity
                  style={[styles.timePickerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerText, { color: formData.event_time ? theme.colors.text : theme.colors.textSecondary }]}>
                    {formatDisplayTime(formData.event_time)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Picker Modal/Component */}
              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent animationType="slide" visible={showDatePicker}>
                    <View style={styles.pickerModalOverlay}>
                      <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={[styles.pickerModalCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>Select Date</Text>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={[styles.pickerModalDone, { color: theme.colors.primary }]}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                          textColor={theme.colors.text}
                          style={styles.dateTimePicker}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )
              )}

              {/* Time Picker Modal/Component */}
              {showTimePicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent animationType="slide" visible={showTimePicker}>
                    <View style={styles.pickerModalOverlay}>
                      <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={[styles.pickerModalCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>Select Time</Text>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={[styles.pickerModalDone, { color: theme.colors.primary }]}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedTime}
                          mode="time"
                          display="spinner"
                          onChange={handleTimeChange}
                          textColor={theme.colors.text}
                          style={styles.dateTimePicker}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )
              )}
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

            {/* Location Search with Google Places */}
            <View style={[styles.inputSection, { zIndex: 1000 }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text}]}>Location *</Text>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                Search for an address or venue
              </Text>

              {config.googlePlacesApiKey ? (
                <GooglePlacesAutocomplete
                  placeholder="Search address or venue..."
                  onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
                    console.log('📍 Place selected:', data.description);
                    console.log('📍 Place details received:', details ? 'YES' : 'NO');
                    console.log('📍 place_id:', data.place_id);

                    // Always set the street address from the selection
                    const updateData: any = {
                      street: data.description,
                    };

                    if (details) {
                      console.log('📍 Details:', JSON.stringify(details, null, 2));

                      // Extract address components
                      if (details.address_components) {
                        const addressComponents = details.address_components;
                        let city = '';
                        let country = '';
                        let countryCode = '';
                        let postalCode = '';
                        let state = '';

                        addressComponents.forEach((component: any) => {
                          if (component.types.includes('locality')) {
                            city = component.long_name;
                          }
                          if (component.types.includes('postal_town') && !city) {
                            city = component.long_name;
                          }
                          if (component.types.includes('country')) {
                            country = component.long_name;
                            countryCode = component.short_name;
                          }
                          if (component.types.includes('postal_code')) {
                            postalCode = component.long_name;
                          }
                          if (component.types.includes('administrative_area_level_1')) {
                            state = component.long_name;
                          }
                          if (component.types.includes('administrative_area_level_2') && !state) {
                            state = component.long_name;
                          }
                        });

                        if (city) updateData.city = city;
                        if (postalCode) {
                          updateData.postCode = postalCode;
                          updateData.postalCode = postalCode;
                          updateData.zipCode = postalCode;
                        }
                        if (state) {
                          updateData.state = state;
                          updateData.county = state;
                        }

                        // Update form data with all extracted fields
                        setFormData(prev => ({
                          ...prev,
                          addressFields: {
                            ...prev.addressFields,
                            ...updateData,
                          },
                          country: countryCode || prev.country,
                          latitude: details.geometry?.location?.lat || null,
                          longitude: details.geometry?.location?.lng || null,
                        }));

                        console.log('✅ Location set:', { city, postalCode, state, country: countryCode });
                      }
                    } else {
                      // No details - fetch them manually using place_id
                      console.log('⚠️ No details from library, fetching manually...');

                      if (data.place_id) {
                        // Fetch place details manually
                        fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${data.place_id}&fields=address_component,geometry,formatted_address&key=${config.googlePlacesApiKey}`)
                          .then(res => res.json())
                          .then(result => {
                            console.log('📍 Manual fetch result:', JSON.stringify(result, null, 2));

                            if (result.result) {
                              const placeDetails = result.result;
                              let city = '';
                              let countryCode = '';
                              let postalCode = '';
                              let state = '';

                              if (placeDetails.address_components) {
                                placeDetails.address_components.forEach((component: any) => {
                                  if (component.types.includes('locality')) {
                                    city = component.long_name;
                                  }
                                  if (component.types.includes('postal_town') && !city) {
                                    city = component.long_name;
                                  }
                                  if (component.types.includes('country')) {
                                    countryCode = component.short_name;
                                  }
                                  if (component.types.includes('postal_code')) {
                                    postalCode = component.long_name;
                                  }
                                  if (component.types.includes('administrative_area_level_1')) {
                                    state = component.long_name;
                                  }
                                });
                              }

                              setFormData(prev => ({
                                ...prev,
                                addressFields: {
                                  ...prev.addressFields,
                                  street: data.description,
                                  city: city || prev.addressFields.city,
                                  postCode: postalCode || prev.addressFields.postCode,
                                  postalCode: postalCode || prev.addressFields.postalCode,
                                  zipCode: postalCode || prev.addressFields.zipCode,
                                  state: state || prev.addressFields.state,
                                  county: state || prev.addressFields.county,
                                },
                                country: countryCode || prev.country,
                                latitude: placeDetails.geometry?.location?.lat || prev.latitude,
                                longitude: placeDetails.geometry?.location?.lng || prev.longitude,
                              }));

                              console.log('✅ Manual fetch - Location set:', { city, postalCode, state, country: countryCode });
                            }
                          })
                          .catch(err => {
                            console.error('❌ Manual fetch error:', err);
                            // Still update the street address
                            setFormData(prev => ({
                              ...prev,
                              addressFields: {
                                ...prev.addressFields,
                                street: data.description,
                              },
                            }));
                          });
                      } else {
                        // No place_id, just set the address
                        setFormData(prev => ({
                          ...prev,
                          addressFields: {
                            ...prev.addressFields,
                            street: data.description,
                          },
                        }));
                      }
                    }
                  }}
                  query={{
                    key: config.googlePlacesApiKey,
                    language: 'en',
                  }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  onFail={(error) => {
                    console.error('❌ Google Places error:', error);
                    console.error('❌ Error details:', JSON.stringify(error, null, 2));
                  }}
                  onNotFound={() => console.log('⚠️ No results found')}
                  onTimeout={() => console.log('⏱️ Google Places timeout')}
                  debounce={300}
                  minLength={2}
                  GooglePlacesDetailsQuery={{
                    fields: 'address_component,geometry,formatted_address',
                  }}
                  styles={{
                    container: {
                      flex: 0,
                      zIndex: 1000,
                    },
                    textInputContainer: {
                      backgroundColor: 'transparent',
                    },
                    textInput: {
                      height: 50,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      fontFamily: Typography.body.fontFamily,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    listView: {
                      backgroundColor: theme.colors.card,
                      borderRadius: 12,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      zIndex: 1001,
                      elevation: 5,
                    },
                    row: {
                      backgroundColor: theme.colors.card,
                      padding: 14,
                      minHeight: 44,
                    },
                    separator: {
                      height: 1,
                      backgroundColor: theme.colors.border,
                    },
                    description: {
                      color: theme.colors.text,
                      fontSize: 14,
                      fontFamily: Typography.label.fontFamily,
                    },
                    poweredContainer: {
                      display: 'none',
                    },
                  }}
                  textInputProps={{
                    placeholderTextColor: theme.colors.textSecondary,
                  }}
                  listViewDisplayed="auto"
                  disableScroll={true}
                />
              ) : (
                // Fallback to manual input if no API key - log only in dev
                <View>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="Enter full address"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.addressFields['street'] || ''}
                    onChangeText={(value) => handleAddressFieldChange('street', value)}
                  />
                </View>
              )}

              {/* Street Address field - auto-filled from Google Places or manual entry */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Street Address</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="Street address (auto-filled from search)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.addressFields['street'] || ''}
                    onChangeText={(value) => handleAddressFieldChange('street', value)}
                  />
                  {formData.addressFields['street'] && formData.latitude && (
                    <View style={styles.autoFilledBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                  )}
                </View>
              </View>

              {/* City field - auto-filled from Google Places or manual entry */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>City *</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="City"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.addressFields['city'] || ''}
                    onChangeText={(value) => handleAddressFieldChange('city', value)}
                  />
                  {formData.addressFields['city'] && formData.latitude && (
                    <View style={styles.autoFilledBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                  )}
                </View>
              </View>

              {/* Postcode/ZIP field - auto-filled from Google Places or manual entry */}
              {selectedCountryConfig.fields.some(f =>
                ['postCode', 'postalCode', 'zipCode', 'postleitzahl', 'codePostal', 'pinCode', 'cep', 'codigoPostal', 'postcode'].includes(f.name)
              ) && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                    {selectedCountryConfig.countryCode === 'GB' ? 'Postcode' :
                     selectedCountryConfig.countryCode === 'US' ? 'ZIP Code' :
                     'Postal Code'} *
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                      placeholder={selectedCountryConfig.countryCode === 'GB' ? 'SW1A 2AA' :
                                   selectedCountryConfig.countryCode === 'US' ? '10001' :
                                   'Enter postal code'}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={formData.addressFields['postCode'] || formData.addressFields['postalCode'] || formData.addressFields['zipCode'] || ''}
                      onChangeText={(value) => {
                        // Update all postal code field variants
                        handleAddressFieldChange('postCode', value);
                        handleAddressFieldChange('postalCode', value);
                        handleAddressFieldChange('zipCode', value);
                      }}
                      autoCapitalize="characters"
                    />
                    {(formData.addressFields['postCode'] || formData.addressFields['postalCode']) && formData.latitude && (
                      <View style={styles.autoFilledBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Country selector */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Country *</Text>
                <TouchableOpacity
                  style={[styles.countrySelector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={[styles.countrySelectorText, { color: theme.colors.text }]}>
                    {selectedCountryConfig.countryName}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Show coordinates if available */}
              {formData.latitude !== null && formData.longitude !== null && (
                <View style={[styles.coordinatesDisplay, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 12 }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.coordinatesText, { color: theme.colors.textSecondary }]}>
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
                    onValueChange={handleToggleFreeEvent}
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
          {/* ── Event Responsibility Disclaimer ── */}
          <TouchableOpacity
            style={styles.disclaimerRow}
            onPress={() => setEventDisclaimerAccepted(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.disclaimerCheckbox,
              { borderColor: eventDisclaimerAccepted ? theme.colors.primary : theme.colors.border },
              eventDisclaimerAccepted && { backgroundColor: theme.colors.primary },
            ]}>
              {eventDisclaimerAccepted && (
                <Ionicons name="checkmark" size={13} color="#fff" />
              )}
            </View>
            <Text style={[styles.disclaimerText, { color: theme.colors.textSecondary }]}>
              By publishing this event I confirm I am solely responsible for its organisation, safety and delivery. SoundBridge promotes events on my behalf but bears no liability for any aspect of the event itself.
            </Text>
          </TouchableOpacity>

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

        {/* Become Creator Modal */}
        <BecomeCreatorModal
          visible={showBecomeCreatorModal}
          onClose={() => setShowBecomeCreatorModal(false)}
          onBecomeCreator={handleBecomeCreator}
          loading={becomeCreatorLoading}
        />

        {/* Creator Agreement — shown once before first creative action */}
        <CreatorAgreementModal
          visible={agreementVisible}
          onAgreed={onAgreed}
          onDismiss={onDismiss}
          submitting={agreementSubmitting}
        />

        {/* Upgrade Modal */}
        <UpgradeForPaidEventsModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  disclaimerCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
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
    ...Typography.headerLarge,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '300',
    letterSpacing: -0.4,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerButtonText: {
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
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
    ...Typography.headerMedium,
    fontSize: 16,
    lineHeight: 22,
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
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  timePickerButton: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  datePickerText: {
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerModalTitle: {
    ...Typography.button,
    fontSize: 17,
    lineHeight: 22,
  },
  pickerModalCancel: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  pickerModalDone: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
  },
  dateTimePicker: {
    height: 200,
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
    ...Typography.button,
    fontSize: 14,
    lineHeight: 18,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  addressFieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
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
    ...Typography.button,
    fontSize: 14,
    lineHeight: 18,
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
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
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
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  paidEventRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  paidEventRequirementText: {
    flex: 1,
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
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
    ...Typography.button,
    fontSize: 14,
    lineHeight: 18,
    width: 80,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  helperText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  countryItemCurrency: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  autoFilledBadge: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
});
