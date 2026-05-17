import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Set via: supabase secrets set GOOGLE_PLACES_API_KEY=<your_key>
const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlacesResult {
  place_id: string
  name: string
  vicinity?: string
  formatted_address?: string
  geometry: { location: { lat: number; lng: number } }
  rating?: number
  user_ratings_total?: number
  types?: string[]
  photos?: Array<{ photo_reference: string }>
  opening_hours?: { open_now?: boolean }
  website?: string
}

interface VenueDisplayItem {
  id: string
  source: 'google_places'
  name: string
  address: string
  city?: string
  photo_url?: string
  rating?: number
  rating_count?: number
  venue_type?: string
  distance_km?: number
  google_place_id: string
  latitude: number
  longitude: number
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

function mapVenueType(types: string[]): string | undefined {
  const typeMap: Record<string, string> = {
    night_club: 'Club',
    bar: 'Bar',
    stadium: 'Stadium',
    performing_arts_theater: 'Theatre',
    church: 'Church',
    community_center: 'Community Centre',
    event_venue: 'Event Space',
    concert_hall: 'Concert Hall',
    movie_theater: 'Theatre',
    music_venue: 'Music Venue',
  }
  for (const t of types) {
    if (typeMap[t]) return typeMap[t]
  }
  return undefined
}

function buildPhotoUrl(photoReference: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`
}

async function searchNearbyVenues(
  lat: number,
  lng: number,
  radius: number,
  keyword: string
): Promise<PlacesResult[]> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    keyword,
    key: GOOGLE_PLACES_API_KEY,
  })
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  return json.results ?? []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { lat, lng, radius = 20000 } = await req.json()

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Two keyword searches to get broad coverage without exhausting quota
    const [musicResults, nightlifeResults] = await Promise.all([
      searchNearbyVenues(lat, lng, radius, 'music venue concert hall theatre event space'),
      searchNearbyVenues(lat, lng, radius, 'bar nightclub club church community centre studio'),
    ])

    // Deduplicate by place_id
    const seen = new Set<string>()
    const allResults: PlacesResult[] = []
    for (const r of [...musicResults, ...nightlifeResults]) {
      if (!seen.has(r.place_id)) {
        seen.add(r.place_id)
        allResults.push(r)
      }
    }

    // Map to VenueDisplayItem, sorted by distance
    const venues: VenueDisplayItem[] = allResults
      .map((place): VenueDisplayItem => {
        const placeLat = place.geometry.location.lat
        const placeLng = place.geometry.location.lng
        return {
          id: `gp_${place.place_id}`,
          source: 'google_places',
          name: place.name,
          address: place.vicinity ?? place.formatted_address ?? '',
          photo_url: place.photos?.[0]
            ? buildPhotoUrl(place.photos[0].photo_reference)
            : undefined,
          rating: place.rating,
          rating_count: place.user_ratings_total,
          venue_type: mapVenueType(place.types ?? []),
          google_place_id: place.place_id,
          latitude: placeLat,
          longitude: placeLng,
          distance_km: haversineKm(lat, lng, placeLat, placeLng),
        }
      })
      .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))

    return new Response(JSON.stringify({ venues }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('nearby-venues error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', venues: [] }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
