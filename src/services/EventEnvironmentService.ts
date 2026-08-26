/**
 * Weather forecast + transport/road disruption info for an event's date and location.
 * Shown on the Events Insights screen (EventsAnalyticsOverviewScreen) as a suggestion/
 * consideration layer, never a directive — see WEATHER_AND_TRANSPORT.MD.
 *
 * Rail disruptions go through the `event-disruptions` Supabase edge function (UK National
 * Rail data requires a server-side SOAP/REST bridge + station lookup, not something a
 * mobile client can call directly). Weather and road/traffic are simple enough REST APIs
 * to call directly from the client, same pattern as this app's other third-party API keys
 * (Gemini, Google Places).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';

export interface WeatherForecast {
  available: boolean;
  reason?: 'too_far_out' | 'not_configured' | 'error';
  tempC?: number;
  condition?: string;
  icon?: string;
  daysOut?: number;
}

export interface RoadDisruptions {
  available: boolean;
  reason?: 'not_configured' | 'error';
  incidents: string[];
}

export interface RailDisruptions {
  available: boolean;
  reason?: 'outside_coverage' | 'no_nearby_station' | 'not_configured' | 'error';
  stationName?: string;
  messages: string[];
}

export interface EventEnvironmentData {
  weather: WeatherForecast;
  road: RoadDisruptions;
  rail: RailDisruptions;
  fetchedAt: string;
}

const CACHE_PREFIX = '@sb:event_env:';

/** Refresh cadence tightens as the event approaches — no need to poll a forecast that
 * won't meaningfully change for an event three weeks out. */
function cacheTtlMs(daysUntilEvent: number): number {
  if (daysUntilEvent <= 2) return 6 * 60 * 60 * 1000;
  if (daysUntilEvent <= 7) return 12 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

class EventEnvironmentService {
  async getForEvent(
    eventId: string,
    lat: number,
    lng: number,
    country: string | null,
    eventDateISO: string,
    session: Session | null
  ): Promise<EventEnvironmentData> {
    const daysUntilEvent = Math.ceil((new Date(eventDateISO).getTime() - Date.now()) / 86400000);

    const cacheKey = `${CACHE_PREFIX}${eventId}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: EventEnvironmentData = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.fetchedAt).getTime();
        if (age < cacheTtlMs(daysUntilEvent)) return parsed;
      }
    } catch {
      // Cache read failure just means we re-fetch — not fatal.
    }

    const [weather, road, rail] = await Promise.all([
      this.fetchWeather(lat, lng, eventDateISO).catch(
        (): WeatherForecast => ({ available: false, reason: 'error' })
      ),
      this.fetchRoad(lat, lng).catch(
        (): RoadDisruptions => ({ available: false, reason: 'error', incidents: [] })
      ),
      this.fetchRail(lat, lng, country, session).catch(
        (): RailDisruptions => ({ available: false, reason: 'error', messages: [] })
      ),
    ]);

    const result: EventEnvironmentData = { weather, road, rail, fetchedAt: new Date().toISOString() };
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Non-fatal — just means next view re-fetches.
    }
    return result;
  }

  /** OpenWeatherMap One Call 3.0 — free tier covers ~8 days of daily forecast, which is
   * also roughly the point past which any provider's forecast stops being meaningful. */
  private async fetchWeather(lat: number, lng: number, eventDateISO: string): Promise<WeatherForecast> {
    if (!config.openWeatherApiKey) return { available: false, reason: 'not_configured' };

    const eventDate = new Date(eventDateISO);
    const daysOut = Math.ceil((eventDate.getTime() - Date.now()) / 86400000);
    if (daysOut < 0 || daysOut > 8) return { available: false, reason: 'too_far_out', daysOut };

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      exclude: 'current,minutely,hourly,alerts',
      units: 'metric',
      appid: config.openWeatherApiKey,
    });
    const res = await fetch(`https://api.openweathermap.org/data/3.0/onecall?${params}`);
    if (!res.ok) return { available: false, reason: 'error' };
    const json = await res.json();
    const daily: any[] = json?.daily ?? [];
    if (daily.length === 0) return { available: false, reason: 'error' };

    const targetDaySeconds = Math.floor(
      new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime() / 1000
    );
    let closest = daily[0];
    let closestDiff = Math.abs(closest.dt - targetDaySeconds);
    for (const d of daily) {
      const diff = Math.abs(d.dt - targetDaySeconds);
      if (diff < closestDiff) {
        closest = d;
        closestDiff = diff;
      }
    }
    // Forecast day found is more than ~1.5 days off the actual event date — the API simply
    // doesn't have that day yet, be honest rather than showing a mismatched day's weather.
    if (closestDiff > 1.5 * 86400) return { available: false, reason: 'too_far_out', daysOut };

    return {
      available: true,
      tempC: Math.round(closest.temp?.day ?? closest.temp),
      condition: closest.weather?.[0]?.description ?? undefined,
      icon: closest.weather?.[0]?.icon,
      daysOut,
    };
  }

  /** TomTom Traffic Incidents API — bounding box (~5km) around the venue. */
  private async fetchRoad(lat: number, lng: number): Promise<RoadDisruptions> {
    if (!config.tomtomApiKey) return { available: false, reason: 'not_configured', incidents: [] };

    const delta = 0.05; // roughly 5km at UK/Nigeria latitudes
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const params = new URLSearchParams({
      key: config.tomtomApiKey,
      bbox,
      language: 'en-GB',
      fields: '{incidents{type,properties{iconCategory,events{description}}}}',
    });
    const res = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`);
    if (!res.ok) return { available: false, reason: 'error', incidents: [] };
    const json = await res.json();
    const incidents: string[] = (json?.incidents ?? [])
      .map((i: any) => i?.properties?.events?.[0]?.description)
      .filter(Boolean)
      .slice(0, 5);
    return { available: true, incidents };
  }

  /** Rail disruptions — routed through the event-disruptions edge function (station
   * lookup + National Rail's REST API live there, not suited to a direct mobile call). */
  private async fetchRail(
    lat: number,
    lng: number,
    country: string | null,
    session: Session | null
  ): Promise<RailDisruptions> {
    const { data, error } = await supabase.functions.invoke('event-disruptions', {
      body: { lat, lng, country },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error || !data) return { available: false, reason: 'error', messages: [] };
    if (!data.available) return { available: false, reason: data.reason, messages: [] };
    return { available: true, stationName: data.stationName, messages: data.messages ?? [] };
  }
}

export const eventEnvironmentService = new EventEnvironmentService();
