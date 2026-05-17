## Mobile Team: Location Updates for Event Notifications

Status: ✅ IMPLEMENTED (January 18, 2026)

### Goal
Ensure every user who grants location permission sends location updates to the backend so event notifications can match by distance/city.

### Endpoint
`POST /api/user/location`

**Auth**
`Authorization: Bearer <supabase_jwt>`

### Payload
```json
{
  "latitude": 0.0,
  "longitude": 0.0,
  "locationState": "State",
  "locationCountry": "Country",
  "source": "foreground"
}
```

### When to send
- On onboarding completion (after location permission grant)
- On app foreground (if permission granted)
- On significant location change
- On manual city selection (if permission denied or user prefers manual)

### Throttling rules (recommended)
Send only if any of the following are true:
- Last update > 15 minutes
- Moved > 500 meters
- `source` is `onboarding` or `manual`

### Suggested source values
- `onboarding`
- `foreground`
- `background`
- `manual`
- `significant_change`

### Failure handling
If the request fails, retry once on next foreground. Do not spam retries.

### Privacy notes
- Only store coarse location if the user opts for approximate location.
- Respect OS permissions and allow users to disable updates.

### Backend verification
```sql
SELECT id, latitude, longitude, location_updated_at
FROM profiles
WHERE id = 'USER_ID';
```

---

## Implementation Details

### Files Created/Modified

| File | Description |
|------|-------------|
| `src/services/LocationUpdateService.ts` | New service handling all location updates |
| `src/services/NotificationService.ts` | Added integration with LocationUpdateService |
| `App.tsx` | Added LocationUpdateService initialization |

### LocationUpdateService Features

1. **Throttling**
   - Time-based: Updates only sent if >15 minutes since last update
   - Distance-based: Updates sent if moved >500 meters
   - Bypassed for `onboarding` and `manual` sources

2. **App Lifecycle Integration**
   - Listens for app state changes (foreground/background)
   - Automatically checks if location update needed on foreground

3. **Retry Logic**
   - Failed updates stored in AsyncStorage
   - Retried on next app foreground

4. **Multiple Sources Supported**
   - `onboarding` - Initial permission grant
   - `foreground` - App comes to foreground
   - `background` - Background location update
   - `manual` - User manually selects city
   - `significant_change` - OS detected significant movement

### Usage Examples

```typescript
import { locationUpdateService } from './src/services/LocationUpdateService';

// Initialize (called in App.tsx)
await locationUpdateService.initialize();

// On permission grant (called by NotificationService)
await locationUpdateService.onLocationPermissionGranted();

// Check if update needed (automatic on foreground)
await locationUpdateService.updateLocationIfNeeded('foreground');

// Force update (bypasses throttling)
await locationUpdateService.forceLocationUpdate('manual');

// Manual city selection
await locationUpdateService.sendManualLocation('London', 'England', 'UK', 51.5074, -0.1278);

// Verify on backend
const health = await locationUpdateService.verifyLocationOnBackend();
console.log(health); // { latitude: 51.5074, longitude: -0.1278, locationUpdatedAt: '...' }
```

---

*Implementation completed: January 18, 2026*
