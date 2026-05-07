import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { venueService, VENUE_TYPES, VenueDisplayItem } from '../services/VenueService';
import { config } from '../config/environment';
import { SystemTypography as Typography } from '../constants/Typography';

const CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR'];

export default function ListVenueScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [venueType, setVenueType] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [capacity, setCapacity] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [externalLink, setExternalLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to use your current location.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      // Reverse geocode for a readable address hint
      const geocode = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geocode[0]) {
        const g = geocode[0];
        if (!address) setAddress([g.streetNumber, g.street].filter(Boolean).join(' '));
        if (!city) setCity(g.city ?? g.subregion ?? '');
      }
      Alert.alert('Location set', 'Your current location has been pinned to this listing.');
    } catch {
      Alert.alert('Error', 'Could not get your location. Please enter the address manually.');
    } finally {
      setLocating(false);
    }
  }, [address, city]);

  const handlePickPhotos = useCallback(async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit reached', 'You can upload up to 5 photos.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  }, [photos]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to list a venue.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a venue name.');
      return;
    }
    if (!address.trim() && !latitude) {
      Alert.alert('Required', 'Please enter an address or pin your location.');
      return;
    }

    setSubmitting(true);
    try {
      const listing: Omit<VenueDisplayItem, 'id' | 'source' | 'distance_km' | 'google_place_id' | 'rating' | 'rating_count'> = {
        name: name.trim(),
        venue_type: venueType || undefined,
        description: description.trim() || undefined,
        address: address.trim(),
        city: city.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        daily_rate: dailyRate ? parseFloat(dailyRate) : undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        currency,
        photo_url: photos[0] || undefined,
        photos: photos.length > 0 ? photos : undefined,
        external_booking_link: externalLink.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        owner_id: user.id,
      };

      const result = await venueService.createVenueListing(user.id, listing);

      Alert.alert(
        'Venue Listed!',
        `${name} has been listed on SoundBridge. Artists matching your venue will be notified automatically.`,
        [{
          text: 'View Listing',
          onPress: () => {
            navigation.replace('VenueDetail', {
              venue: { ...listing, id: result.id, source: 'soundbridge' },
            });
          },
        }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    user, name, venueType, description, address, city, latitude, longitude,
    capacity, dailyRate, hourlyRate, currency, photos, externalLink,
    contactEmail, contactPhone, website, navigation,
  ]);

  const inputStyle = [styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }];
  const labelStyle = [styles.label, { color: theme.colors.text }];
  const hintStyle = [styles.hint, { color: theme.colors.textSecondary }];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>List Your Venue</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Basic Info */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Info</Text>

            <Text style={labelStyle}>Venue Name *</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. The Arches Studio"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={labelStyle}>Venue Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {VENUE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                    venueType === t && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setVenueType(venueType === t ? '' : t)}
                >
                  <Text style={[styles.typeChipText, { color: venueType === t ? '#FFFFFF' : theme.colors.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={labelStyle}>Description</Text>
            <TextInput
              style={[inputStyle, styles.multiline]}
              placeholder="Describe your space, atmosphere, equipment available…"
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Location */}
            <View style={{ zIndex: 1000 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Location</Text>

            {config.googlePlacesApiKey ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={labelStyle}>Search Address</Text>
                <GooglePlacesAutocomplete
                  placeholder="Search address or venue name..."
                  onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
                    const updateAddress = data.description;

                    if (details) {
                      let extractedCity = '';
                      let extractedLat: number | null = null;
                      let extractedLng: number | null = null;

                      if (details.address_components) {
                        details.address_components.forEach((component: any) => {
                          if (component.types.includes('locality')) extractedCity = component.long_name;
                          if (component.types.includes('postal_town') && !extractedCity) extractedCity = component.long_name;
                        });
                      }
                      extractedLat = details.geometry?.location?.lat ?? null;
                      extractedLng = details.geometry?.location?.lng ?? null;

                      setAddress(updateAddress);
                      if (extractedCity) setCity(extractedCity);
                      if (extractedLat !== null) setLatitude(extractedLat);
                      if (extractedLng !== null) setLongitude(extractedLng);
                    } else if (data.place_id) {
                      fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${data.place_id}&fields=address_component,geometry&key=${config.googlePlacesApiKey}`)
                        .then(res => res.json())
                        .then(result => {
                          if (result.result) {
                            const p = result.result;
                            let extractedCity = '';
                            p.address_components?.forEach((component: any) => {
                              if (component.types.includes('locality')) extractedCity = component.long_name;
                              if (component.types.includes('postal_town') && !extractedCity) extractedCity = component.long_name;
                            });
                            setAddress(updateAddress);
                            if (extractedCity) setCity(extractedCity);
                            if (p.geometry?.location?.lat) setLatitude(p.geometry.location.lat);
                            if (p.geometry?.location?.lng) setLongitude(p.geometry.location.lng);
                          }
                        })
                        .catch(() => setAddress(updateAddress));
                    } else {
                      setAddress(updateAddress);
                    }
                  }}
                  query={{ key: config.googlePlacesApiKey, language: 'en' }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  GooglePlacesDetailsQuery={{ fields: 'address_component,geometry' }}
                  debounce={300}
                  minLength={2}
                  onFail={() => {}}
                  styles={{
                    container: { flex: 0, zIndex: 1000 },
                    textInputContainer: { backgroundColor: 'transparent' },
                    textInput: {
                      height: 48,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      fontFamily: Typography.body.fontFamily,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    listView: {
                      backgroundColor: theme.colors.card,
                      borderRadius: 10,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      zIndex: 1001,
                      elevation: 5,
                    },
                    row: { backgroundColor: theme.colors.card, padding: 14, minHeight: 44 },
                    separator: { height: 1, backgroundColor: theme.colors.border },
                    description: { color: theme.colors.text, fontSize: 14, fontFamily: Typography.label.fontFamily },
                  }}
                  textInputProps={{ placeholderTextColor: theme.colors.textSecondary }}
                  listViewDisplayed="auto"
                  disableScroll={true}
                />
                {latitude !== null && longitude !== null && (
                  <View style={[styles.coordsBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[styles.coordsText, { color: theme.colors.textSecondary }]}>
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.locateBtn, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary }]}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="locate-outline" size={18} color={theme.colors.primary} />
              )}
              <Text style={[styles.locateBtnText, { color: theme.colors.primary }]}>
                {latitude ? 'Location Pinned ✓' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>

            <Text style={labelStyle}>Street Address *</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. 123 Camden High Street"
              placeholderTextColor={theme.colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={labelStyle}>City</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. London"
              placeholderTextColor={theme.colors.textSecondary}
              value={city}
              onChangeText={setCity}
            />
            </View>

            {/* Pricing */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing</Text>

            <Text style={labelStyle}>Currency</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.currencyChip,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                    currency === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.typeChipText, { color: currency === c ? '#FFFFFF' : theme.colors.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Hourly Rate (£/hr)</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 40"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Daily Package (£/day)</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 250"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={dailyRate}
                  onChangeText={setDailyRate}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Capacity */}
            <Text style={labelStyle}>Capacity</Text>
            <TextInput
              style={inputStyle}
              placeholder="Maximum number of people"
              placeholderTextColor={theme.colors.textSecondary}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
            />


            {/* Photos */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Photos</Text>
            <Text style={hintStyle}>Up to 5 photos. First photo is the cover image.</Text>
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoThumbImg} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity
                  style={[styles.addPhotoBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  onPress={handlePickPhotos}
                >
                  <Ionicons name="camera-outline" size={24} color={theme.colors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: theme.colors.textSecondary }]}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact & Links */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact & Links</Text>

            <Text style={labelStyle}>Booking Link (optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="https://your-booking-page.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={externalLink}
              onChangeText={setExternalLink}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={labelStyle}>Website (optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="https://your-venue-website.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={labelStyle}>Contact Email (optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="bookings@venue.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={labelStyle}>Contact Phone (optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="+44 20 1234 5678"
              placeholderTextColor={theme.colors.textSecondary}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>List My Venue</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { ...Typography.button, flex: 1, fontSize: 18, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { ...Typography.headerMedium, fontSize: 18, marginTop: 24, marginBottom: 12 },
  label: { ...Typography.button, fontSize: 14, marginBottom: 6, marginTop: 12 },
  hint: { ...Typography.label, fontSize: 12, marginBottom: 6 },
  input: { ...Typography.body, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 96, paddingTop: 12 },
  typeScroll: { marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  typeChipText: { ...Typography.label, fontSize: 13 },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  locateBtnText: { ...Typography.button, fontSize: 14 },
  currencyRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rateRow: { flexDirection: 'row', marginTop: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, position: 'relative' },
  photoThumbImg: { width: 80, height: 80, borderRadius: 8 },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: { ...Typography.label, fontSize: 11 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  submitBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 16 },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  coordsText: { ...Typography.label, fontSize: 12 },
});
