import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import stationsData from './uk-stations.json' assert { type: 'json' }

// Set via: supabase secrets set RAIL_DATA_MARKETPLACE_API_KEY=<your_consumer_key>
// Get the key at raildata.org.uk — subscribe to "Live Departure Board Web Service (LDBWS) - Public"
// in the Data Product Catalogue, then find it under My Subscriptions > LDBWS - Public > Specification.
const RAIL_API_KEY = Deno.env.get('RAIL_DATA_MARKETPLACE_API_KEY') ?? ''

const LDBWS_BASE = 'https://api1.raildata.org.uk/1010-live-departure-board-dep/LDBWS/api/20220120/GetDepBoardWithDetails'

// Beyond this radius, we don't have a station close enough to the event to make rail
// disruption info meaningful — honest "not available" rather than showing something
// irrelevant. Rail coverage is UK-only regardless of radius.
const MAX_STATION_DISTANCE_KM = 20

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type StationRow = [crs: string, name: string, lat: number, lng: number]
const stations = stationsData as StationRow[]

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

function findNearestStation(lat: number, lng: number): { crs: string; name: string; distanceKm: number } | null {
  let best: { crs: string; name: string; distanceKm: number } | null = null
  for (const [crs, name, sLat, sLng] of stations) {
    const distanceKm = haversineKm(lat, lng, sLat, sLng)
    if (!best || distanceKm < best.distanceKm) {
      best = { crs, name, distanceKm }
    }
  }
  if (!best || best.distanceKm > MAX_STATION_DISTANCE_KM) return null
  return best
}

interface NrccMessage {
  Value?: string
  category?: string
}

async function fetchStationMessages(crs: string): Promise<string[]> {
  const res = await fetch(`${LDBWS_BASE}/${crs}`, {
    headers: { 'x-apikey': RAIL_API_KEY },
  })
  if (!res.ok) throw new Error(`LDBWS ${res.status}`)
  const json = await res.json()

  // nrccMessages carries disruption/service-alert text applying to this station board.
  // Shape varies slightly by response version — accept a couple of known forms.
  const raw = json?.nrccMessages ?? json?.NrccMessages ?? []
  const messages: string[] = [];
  (Array.isArray(raw) ? raw : [raw]).forEach((m: NrccMessage | string) => {
    const text = typeof m === 'string' ? m : m?.Value
    if (text) {
      // Strip embedded HTML-ish line-break tags National Rail sometimes includes
      messages.push(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    }
  })
  return messages
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { lat, lng, country } = await req.json()

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(JSON.stringify({ error: 'lat and lng are required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Rail disruption coverage is UK-only — be upfront rather than searching for a
    // "nearest" station thousands of km away and returning something misleading.
    const isLikelyUK = !country || /^(uk|united kingdom|gb|great britain|england|scotland|wales|northern ireland)$/i.test(country.trim())
    if (!isLikelyUK) {
      return new Response(JSON.stringify({ available: false, reason: 'outside_coverage' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!RAIL_API_KEY) {
      return new Response(JSON.stringify({ available: false, reason: 'not_configured' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const station = findNearestStation(lat, lng)
    if (!station) {
      return new Response(JSON.stringify({ available: false, reason: 'no_nearby_station' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const messages = await fetchStationMessages(station.crs)

    return new Response(
      JSON.stringify({
        available: true,
        stationName: station.name,
        stationCrs: station.crs,
        distanceKm: Math.round(station.distanceKm * 10) / 10,
        messages,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('event-disruptions error:', err)
    return new Response(JSON.stringify({ available: false, reason: 'error' }), {
      status: 200, // degrade gracefully — mobile shows the honest "not available" state, not an error
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
