# Backend Fix Required: Event Creation API Error

## Status: FIXED ON MOBILE SIDE
- [x] `address_data` column issue - FIXED
- [x] `price_eur` column issue - FIXED
- [x] `event_category` enum mismatch - **FIXED ON MOBILE** (Jan 17, 2026)

---

## Category Enum Issue - RESOLVED

### Previous Error
```
invalid input value for enum event_category: "Music Concert"
```

### Mobile Fix Applied
The mobile app now maps display categories to snake_case database enum values:

```javascript
// In CreateEventScreen.tsx
const CATEGORY_TO_DB_ENUM = {
  'Music Concert': 'music_concert',
  'Birthday Party': 'birthday_party',
  'Carnival': 'carnival',
  'Get Together': 'get_together',
  'Music Karaoke': 'music_karaoke',
  'Comedy Night': 'comedy_night',
  'Gospel Concert': 'gospel_concert',
  'Instrumental': 'instrumental',
  'Jazz Room': 'jazz_room',
  'Workshop': 'workshop',
  'Conference': 'conference',
  'Festival': 'festival',
  'Other': 'other',
};
```

The mobile app now sends `category: "music_concert"` instead of `category: "Music Concert"`.

---

## Remaining Backend Issues

See `BACKEND_POST_MIGRATION_ERRORS.md` for current blocking issues after the event discovery migration:

1. **Trigger function error** - `structure of query does not match function result type`
2. **Location API error** - `PUT /api/user/location` returns 500

---

## Previously Fixed Issues
- [x] `address_data` column - removed from API
- [x] `price_eur` column - API now only inserts price_gbp and price_ngn
- [x] Category enum mismatch - mobile now sends snake_case values

---

*Last updated: January 17, 2026*
