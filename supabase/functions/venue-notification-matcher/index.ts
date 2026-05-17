import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

function formatRate(dailyRate: number | null, hourlyRate: number | null, currency: string): string {
  const symbol = currency === 'NGN' ? '₦' : '£'
  if (hourlyRate) return `${symbol}${hourlyRate.toLocaleString()}/hr`
  if (dailyRate) return `${symbol}${dailyRate.toLocaleString()}/day`
  return 'Contact for pricing'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { venue_id } = await req.json()
    if (!venue_id) {
      return new Response(JSON.stringify({ error: 'venue_id required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the newly listed venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, city, country, latitude, longitude, venue_type, daily_rate, hourly_rate, currency, owner_id')
      .eq('id', venue_id)
      .single()

    if (venueError || !venue) {
      console.error('Venue not found:', venueError)
      return new Response(JSON.stringify({ error: 'Venue not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!venue.latitude || !venue.longitude) {
      return new Response(JSON.stringify({ matched: 0, reason: 'No coordinates' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all enabled preferences (excluding the venue owner)
    const { data: preferences, error: prefError } = await supabase
      .from('venue_notification_preferences')
      .select(`
        user_id,
        min_budget,
        max_budget,
        preferred_venue_types,
        preferred_location_lat,
        preferred_location_lng,
        notification_radius_km,
        notifications_enabled
      `)
      .eq('notifications_enabled', true)
      .neq('user_id', venue.owner_id)

    if (prefError || !preferences?.length) {
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Filter preferences that match this venue
    const matchingUserIds: string[] = []

    for (const pref of preferences) {
      const checkLat = pref.preferred_location_lat ?? venue.latitude
      const checkLng = pref.preferred_location_lng ?? venue.longitude
      const dist = haversineKm(checkLat, checkLng, venue.latitude, venue.longitude)

      if (dist > pref.notification_radius_km) continue

      // Check venue type match (skip if no preferred types specified — match everything)
      if (pref.preferred_venue_types?.length > 0 && venue.venue_type) {
        const normalised = venue.venue_type.toLowerCase().replace(/\s+/g, '_')
        const prefNormalised = pref.preferred_venue_types.map((t: string) =>
          t.toLowerCase().replace(/\s+/g, '_')
        )
        if (!prefNormalised.includes(normalised)) continue
      }

      // Check budget against hourly rate (primary), fall back to daily rate
      const rate = venue.hourly_rate ?? venue.daily_rate
      if (rate !== null) {
        if (pref.min_budget !== null && rate < pref.min_budget) continue
        if (pref.max_budget !== null && rate > pref.max_budget) continue
      }

      matchingUserIds.push(pref.user_id)
    }

    if (matchingUserIds.length === 0) {
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Fetch push tokens for matching users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', matchingUserIds)
      .not('expo_push_token', 'is', null)

    if (!profiles?.length) {
      return new Response(JSON.stringify({ matched: 0, reason: 'No push tokens' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const location = [venue.city, venue.country].filter(Boolean).join(', ') || 'your area'
    const rateString = formatRate(venue.daily_rate, venue.hourly_rate, venue.currency ?? 'GBP')

    const messages = profiles
      .filter((p) => p.expo_push_token)
      .map((p) => ({
        to: p.expo_push_token as string,
        sound: 'default',
        title: 'A venue near you matches your budget',
        body: `${venue.name} in ${location} is available from ${rateString}. Tap to view.`,
        data: {
          type: 'venue_match',
          venueId: venue.id,
          deepLink: `soundbridge://venue/${venue.id}`,
        },
        channelId: 'default',
      }))

    const receipts = await sendPushNotifications(messages)
    const sent = receipts.filter((r) => r.status === 'ok').length

    console.log(`venue-notification-matcher: matched ${matchingUserIds.length} users, sent ${sent} notifications`)

    return new Response(JSON.stringify({ matched: matchingUserIds.length, sent }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('venue-notification-matcher error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
