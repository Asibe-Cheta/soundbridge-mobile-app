# Mobile Events Tab Filtering - Code Details

## Response to Web Team Request (January 17, 2026)

---

## 1. Events Tab Screen Details

**Screen/Component Name:** `AllEventsScreen`
**File Path:** `src/screens/AllEventsScreen.tsx`

This is the main Events tab that displays personalized events to users.

---

## 2. Exact Query/API Call Used

### Primary: PostgreSQL RPC Function

```typescript
// src/lib/supabase.ts:958-972
async getPersonalizedEvents(userId: string, limit = 20) {
  try {
    console.log('🎯 Getting personalized events for user:', userId);

    // First try the new PostgreSQL function
    const { data, error } = await supabase
      .rpc('get_personalized_events', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: 0
      });

    if (!error && data && data.length > 0) {
      console.log('✅ Found personalized events via RPC:', data.length);
      return { data, error: null };
    }
    // ... fallback logic below
  }
}
```

### Fallback Logic (When RPC Not Available)

```typescript
// src/lib/supabase.ts:975-1005
// Fallback to manual query if RPC function doesn't exist yet
console.log('⚠️ RPC function not available, using manual query. Error:', error?.message);

// Get user's profile for location
// ... profile fetch ...

// Use same schema as getUpcomingEvents (which works)
const { data: manualData, error: manualError } = await supabase
  .from('events')
  .select(`
    id, title, description, event_date, location, venue, city,
    category, price_gbp, price_ngn, max_attendees, current_attendees,
    image_url, created_at
  `)
  .gte('event_date', new Date().toISOString())
  .order('event_date', { ascending: true })
  .limit(limit);
```

### For Non-Logged-In Users

```typescript
// src/screens/AllEventsScreen.tsx:91-96
// Fallback to regular events for non-logged-in users
const result = await dbHelpers.getUpcomingEvents(50);
data = result.data;
error = result.error;
```

**`getUpcomingEvents`** does a simple query with NO personalization:

```typescript
// src/lib/supabase.ts:212-232
async getUpcomingEvents(limit = 10) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, description, event_date, location, venue, category,
      price_gbp, price_ngn, max_attendees, current_attendees, image_url, created_at
    `)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(limit);
}
```

---

## 3. Client-Side Filters Applied

### Only TWO client-side filters exist:

**A. Text Search Filter (user-initiated):**
```typescript
// src/screens/AllEventsScreen.tsx:120-126
if (searchQuery.trim()) {
  filtered = filtered.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
}
```

**B. Sort Options (user-initiated):**
```typescript
// src/screens/AllEventsScreen.tsx:129-138
filtered.sort((a, b) => {
  switch (sortBy) {
    case 'date':
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    case 'alphabetical':
      return a.title.localeCompare(b.title);
    default:
      return 0;
  }
});
```

### NO automatic client-side filters for:
- ❌ Distance filtering
- ❌ Category filtering
- ❌ User preference filtering

**All personalization filtering is expected to happen server-side in `get_personalized_events` RPC.**

---

## 4. Creator's Own Events Injection

### Answer: **NO** - Creator events are NOT injected into Events tab

```typescript
// src/screens/AllEventsScreen.tsx:77-114
const loadEvents = async (refresh = false) => {
  // Use personalized events function if user is logged in
  let data, error;
  if (user?.id) {
    const result = await dbHelpers.getPersonalizedEvents(user.id, 50);
    data = result.data;
    error = result.error;
  } else {
    // Fallback to regular events for non-logged-in users
    const result = await dbHelpers.getUpcomingEvents(50);
    data = result.data;
    error = result.error;
  }
  // ... error handling ...
  setEvents(data || []);
};
```

**No code injects or adds creator's own events.** The Events tab displays ONLY what `get_personalized_events` returns.

Creators see their events in the **"My Events"** section on their Profile screen (separate from Events tab).

---

## 5. Error Handling Function

### Error Handling in `loadEvents`:
```typescript
// src/screens/AllEventsScreen.tsx:98-113
if (error) {
  console.error('❌ Error loading events:', error);
  throw error;
}

console.log('✅ Events loaded:', data?.length || 0);
setEvents(data || []);

} catch (error: any) {
  console.error('❌ Error loading events:', error);
  setError(error.message || 'Failed to load events');
  Alert.alert('Error', 'Failed to load events. Please check your connection and try again.');
} finally {
  setLoading(false);
  setRefreshing(false);
}
```

### Error Handling in `getPersonalizedEvents`:
```typescript
// src/lib/supabase.ts:970-976
if (!error && data && data.length > 0) {
  console.log('✅ Found personalized events via RPC:', data.length);
  return { data, error: null };
}

// Fallback to manual query if RPC function doesn't exist yet
console.log('⚠️ RPC function not available, using manual query. Error:', error?.message);
// ... proceeds to manual query without personalization filters
```

### Fallback Behavior (UPDATED - Strict Personalization):
1. **If RPC `get_personalized_events` fails** → Returns empty array (NO fallback to unfiltered events)
2. **If RPC returns empty** → Returns empty array (shows "No events match your preferences")
3. **If user not logged in** → Uses `getUpcomingEvents` (simple chronological list - this is acceptable for guests)

---

## Summary for Web Team Verification

| Aspect | Mobile Implementation |
|--------|----------------------|
| Primary API | `rpc('get_personalized_events', { p_user_id, p_limit, p_offset })` |
| Fallback API | Direct `events` table query (no personalization) |
| Client-side distance filter | ❌ None |
| Client-side category filter | ❌ None |
| Client-side user prefs filter | ❌ None |
| Creator events injection | ❌ None |
| Client-side filters | Only search text + sort (date/alphabetical) |

**Conclusion:** The mobile app enforces strict personalization - it ONLY shows what `get_personalized_events` RPC returns, even if empty. No fallback to unfiltered events.

---

## UPDATE: Strict Personalization Fix (January 17, 2026)

### Issue Identified
The previous fallback logic was showing unfiltered events when RPC failed or returned empty, causing:
- Nigeria creator seeing UK events in Events tab
- Breaking the core personalization promise from business plan

### Fix Applied
**File:** `src/lib/supabase.ts` - `getPersonalizedEvents` function

**Before (WRONG):**
```typescript
if (!error && data && data.length > 0) {
  return { data, error: null };
}
// Fallback to manual query if RPC function doesn't exist yet
// ... unfiltered events query ...
```

**After (CORRECT):**
```typescript
if (error) {
  // Log error but return empty array - DO NOT fallback to unfiltered events
  console.warn('⚠️ get_personalized_events RPC error:', error.message);
  return { data: [], error: null };
}
// Return whatever the RPC returns, even if empty
return { data: data || [], error: null };
```

### Result
- Events tab now shows ONLY personalized events for logged-in users
- If no events match preferences/location, user sees "No events found" message
- Strict adherence to business plan requirement

---

*Document created: January 17, 2026*
*Updated: January 17, 2026 - Strict personalization fix*
