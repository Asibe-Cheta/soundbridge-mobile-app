import * as Location from 'expo-location'
import * as ExpoLinking from 'expo-linking'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../lib/supabase'
import { config } from '../config/environment'

export interface VenueDisplayItem {
  id: string
  source: 'soundbridge' | 'google_places'
  name: string
  address: string
  city?: string
  photo_url?: string
  photos?: string[]
  rating?: number
  rating_count?: number
  venue_type?: string
  capacity?: number
  daily_rate?: number
  hourly_rate?: number
  currency?: string
  distance_km?: number
  external_booking_link?: string
  website?: string
  contact_email?: string
  contact_phone?: string
  google_place_id?: string
  latitude?: number
  longitude?: number
  description?: string
  available_dates?: string[]
  owner_id?: string
}

export interface VenueNotificationPreferences {
  notifications_enabled: boolean
  min_budget?: number | null
  max_budget?: number | null
  preferred_venue_types?: string[]
  preferred_location_lat?: number | null
  preferred_location_lng?: number | null
  preferred_location_name?: string | null
  notification_radius_km: number
}

export const VENUE_TYPES = [
  'Concert Hall',
  'Music Venue',
  'Bar',
  'Club',
  'Theatre',
  'Church',
  'Community Centre',
  'Event Space',
  'Recording Studio',
  'Outdoor Venue',
]

export type LocationPermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied'

class VenueService {
  async requestLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return null
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch {
      return null
    }
  }

  async getSoundbridgeVenues(
    lat: number,
    lng: number,
    radiusKm = 20
  ): Promise<VenueDisplayItem[]> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error || !data) return []

      return data
        .map((v: any) => ({
          ...this.mapRow(v),
          distance_km: this.haversineKm(lat, lng, v.latitude, v.longitude),
        }))
        .filter((v) => (v.distance_km ?? Infinity) <= radiusKm)
        .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
    } catch {
      return []
    }
  }

  async getSoundbridgeVenueById(id: string): Promise<VenueDisplayItem | null> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) return null
      return this.mapRow(data as any)
    } catch {
      return null
    }
  }

  async getNearbyPlacesVenues(
    lat: number,
    lng: number,
    radiusKm = 20
  ): Promise<VenueDisplayItem[]> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const { data, error } = await supabase.functions.invoke('nearby-venues', {
        body: { lat, lng, radius: radiusKm * 1000 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (error || !data?.venues) return []
      // Normalise — Edge Function may return place_id instead of id
      return (data.venues as any[]).map((v, i) => ({
        ...v,
        id: v.id || (v.place_id ? `gp_${v.place_id}` : `gp_${i}`),
        google_place_id: v.google_place_id || v.place_id,
        address: v.address || v.vicinity || '',
        rating_count: v.rating_count ?? v.user_ratings_total,
      })) as VenueDisplayItem[]
    } catch {
      return []
    }
  }

  async getMyVenues(userId: string): Promise<VenueDisplayItem[]> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, description, address, city, country, venue_type, capacity, latitude, longitude, hourly_rate, daily_rate, currency, photo_url, photos, rating, website, contact_email, contact_phone, external_booking_link, owner_id, status')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data.map((v) => this.mapRow(v))
    } catch {
      return []
    }
  }

  async postVenueAvailability(
    venueId: string,
    availability: {
      available_from: string
      available_to: string | null
      hourly_rate: number | null
      daily_rate: number | null
      note: string | null
    }
  ): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('venue_availability')
        .insert({
          venue_id: venueId,
          available_from: availability.available_from,
          available_to: availability.available_to,
          hourly_rate: availability.hourly_rate,
          daily_rate: availability.daily_rate,
          note: availability.note,
        })
        .select('id')
        .single()

      if (error || !data) return null

      // Trigger notification matcher so matched users are notified
      supabase.functions.invoke('venue-notification-matcher', {
        body: { venue_id: venueId },
      }).catch(() => {})

      return { id: data.id }
    } catch {
      return null
    }
  }

  private async uploadVenuePhoto(localUri: string, venueId: string, index: number, userId: string): Promise<string | null> {
    try {
      const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg'
      // Path: {user_id}/{venue_id}/filename — satisfies RLS policies keyed on either uid or venue ownership
      const storagePath = `${userId}/${venueId}/photo_${index}_${Date.now()}.${ext}`

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        console.warn('Venue photo upload: no auth session')
        return null
      }

      const mimeType = `image/${ext}`
      const uploadUrl = `${config.supabaseUrl}/storage/v1/object/venue-photos/${storagePath}`

      const uploadResponse = await FileSystem.uploadAsync(uploadUrl, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        mimeType,
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: config.supabaseAnonKey,
          'Content-Type': mimeType,
          'x-upsert': 'true',
          'cache-control': '3600',
        },
      })

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        console.warn('Venue photo upload failed:', uploadResponse.status, uploadResponse.body)
        return null
      }

      const { data: urlData } = supabase.storage.from('venue-photos').getPublicUrl(storagePath)
      return urlData.publicUrl
    } catch (e) {
      console.warn('Venue photo upload error:', e)
      return null
    }
  }

  async createVenueListing(
    ownerId: string,
    listing: Omit<VenueDisplayItem, 'id' | 'source' | 'distance_km' | 'google_place_id' | 'rating' | 'rating_count'>
  ): Promise<{ id: string } | null> {
    // Step 1: Insert venue without photos to get the ID first
    // (bucket path requires {venue_id}/... so we need the ID before uploading)
    // address column is jsonb on production; flat scalar city/country are separate columns
    const addressJsonb = listing.address
      ? { line1: listing.address, city: listing.city ?? null, country: null }
      : null
    const { data, error } = await supabase
      .from('venues')
      .insert({
        owner_id: ownerId,
        name: listing.name,
        description: listing.description ?? null,
        address: addressJsonb,
        city: listing.city ?? null,
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        status: 'active',
        venue_type: listing.venue_type ?? null,
        capacity: listing.capacity ?? null,
        daily_rate: listing.daily_rate ?? null,
        hourly_rate: listing.hourly_rate ?? null,
        currency: listing.currency ?? 'GBP',
        external_booking_link: listing.external_booking_link ?? null,
        contact_email: listing.contact_email ?? null,
        contact_phone: listing.contact_phone ?? null,
        website: listing.website ?? null,
      } as any)
      .select('id')
      .single()

    if (error) {
      console.error('createVenueListing error:', error.message, error.details, error.hint)
      throw new Error(error.message)
    }
    if (!data) throw new Error('No data returned from insert')

    const venueId = data.id

    // Step 2: Upload photos using {venue_id}/... path required by bucket RLS
    const localPhotos = (listing.photos ?? (listing.photo_url ? [listing.photo_url] : [])).filter(Boolean) as string[]
    if (localPhotos.length > 0) {
      const uploadedUrls: string[] = []
      for (let i = 0; i < localPhotos.length; i++) {
        const uri = localPhotos[i]
        const isLocal = !uri.startsWith('http')
        const url = isLocal ? await this.uploadVenuePhoto(uri, venueId, i, ownerId) : uri
        if (url) uploadedUrls.push(url)
      }

      if (uploadedUrls.length > 0) {
        await supabase
          .from('venues')
          .update({ photo_url: uploadedUrls[0], photos: uploadedUrls })
          .eq('id', venueId)
      }
    }

    // Step 3: Trigger notification matcher (fire and forget)
    supabase.functions.invoke('venue-notification-matcher', {
      body: { venue_id: venueId },
    }).catch(() => {})

    return { id: venueId }
  }

  async deleteVenue(venueId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)
        .eq('owner_id', userId)
      return !error
    } catch {
      return false
    }
  }

  async getVenuePreferences(userId: string): Promise<VenueNotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('venue_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error || !data) return null
      return {
        notifications_enabled: data.notifications_enabled ?? true,
        min_budget: data.min_budget ?? null,
        max_budget: data.max_budget ?? null,
        preferred_venue_types: data.preferred_venue_types ?? [],
        preferred_location_lat: data.preferred_location_lat ?? null,
        preferred_location_lng: data.preferred_location_lng ?? null,
        preferred_location_name: data.preferred_location_name ?? null,
        notification_radius_km: data.notification_radius_km ?? 10,
      }
    } catch {
      return null
    }
  }

  async saveVenuePreferences(
    userId: string,
    prefs: VenueNotificationPreferences
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('venue_notification_preferences')
        .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() } as any)
      return !error
    } catch {
      return false
    }
  }

  openVenueExternally(venue: VenueDisplayItem): void {
    if (venue.website) {
      ExpoLinking.openURL(venue.website)
    } else if (venue.external_booking_link) {
      ExpoLinking.openURL(venue.external_booking_link)
    } else if (venue.google_place_id) {
      ExpoLinking.openURL(
        `https://www.google.com/maps/place/?q=place_id:${venue.google_place_id}`
      )
    } else if (venue.latitude && venue.longitude) {
      ExpoLinking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
      )
    } else {
      ExpoLinking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
      )
    }
  }

  formatRate(
    dailyRate?: number | null,
    hourlyRate?: number | null,
    currency = 'GBP'
  ): string | null {
    const symbol = currency === 'NGN' ? '₦' : '£'
    if (hourlyRate && dailyRate) return `${symbol}${hourlyRate.toLocaleString()}/hr · ${symbol}${dailyRate.toLocaleString()}/day`
    if (hourlyRate) return `${symbol}${hourlyRate.toLocaleString()}/hr`
    if (dailyRate) return `${symbol}${dailyRate.toLocaleString()}/day`
    return null
  }

  private mapRow(v: any): VenueDisplayItem {
    // address column is jsonb { line1, city, country }; flat scalar city/country are authoritative
    const addrParts = [
      typeof v.address === 'object' && v.address !== null ? v.address.line1 : (typeof v.address === 'string' ? v.address : null),
      v.city,
      v.country,
    ].filter(Boolean)
    return {
      id: v.id,
      source: 'soundbridge',
      name: v.name,
      address: addrParts.join(', '),
      city: v.city ?? undefined,
      photo_url: v.photo_url ?? undefined,
      photos: v.photos ?? undefined,
      rating: v.rating ?? undefined,
      venue_type: v.venue_type ?? undefined,
      capacity: v.capacity ?? undefined,
      daily_rate: v.daily_rate ?? undefined,
      hourly_rate: v.hourly_rate ?? undefined,
      currency: v.currency ?? 'GBP',
      external_booking_link: v.external_booking_link ?? undefined,
      website: v.website ?? undefined,
      contact_email: v.contact_email ?? undefined,
      contact_phone: v.contact_phone ?? undefined,
      latitude: v.latitude ?? undefined,
      longitude: v.longitude ?? undefined,
      description: v.description ?? undefined,
      owner_id: v.owner_id,
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}

export const venueService = new VenueService()
