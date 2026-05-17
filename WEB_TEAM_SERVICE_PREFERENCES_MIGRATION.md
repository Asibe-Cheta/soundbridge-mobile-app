# Web Team — Service Preferences & Gig Alerts DB Migration

## Two new tables required

---

### 1. service_discovery_preferences
Stores what service types and budget range each user wants to see
in the Services tab. Mirrors the `venue_notification_preferences` pattern.

```sql
CREATE TABLE IF NOT EXISTS service_discovery_preferences (
  user_id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  max_distance_km       INTEGER NOT NULL DEFAULT 30,
  min_budget            DECIMAL(10, 2),
  max_budget            DECIMAL(10, 2),
  service_categories    TEXT[],
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_discovery_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own service discovery preferences"
  ON service_discovery_preferences
  FOR ALL USING (auth.uid() = user_id);
```

---

### 2. service_provider_gig_preferences
Stores each service provider's gig alert settings and availability.

```sql
CREATE TABLE IF NOT EXISTS service_provider_gig_preferences (
  user_id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  gig_alerts_enabled    BOOLEAN NOT NULL DEFAULT false,
  alert_categories      TEXT[],
  availability_status   TEXT NOT NULL DEFAULT 'available'
                        CHECK (availability_status IN ('available', 'available_from', 'not_available')),
  available_from_date   TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_provider_gig_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gig alert preferences"
  ON service_provider_gig_preferences
  FOR ALL USING (auth.uid() = user_id);
```

---

### 3. service_provider_profiles — add lat/lng (future enhancement)
Not required for the current release but needed for true km-radius
filtering in the Services tab. Without these columns, the radius
filter is dormant (all providers are shown). When added, the existing
haversine logic in ServiceDiscoveryService.ts activates automatically.

```sql
ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

Mobile will populate these when the provider saves their location on
the dashboard. No urgency — the UI still works without it.

---

## Summary

| Table | Type | Priority |
|---|---|---|
| service_discovery_preferences | New | Required now |
| service_provider_gig_preferences | New | Required now |
| service_provider_profiles lat/lng | Alter | Future |
