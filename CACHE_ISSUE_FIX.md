# 🔧 Missing Import Fix - dbHelpers Error

## Problem
```
ReferenceError: Property 'dbHelpers' doesn't exist
```

## Root Cause
**ProfileScreen was missing the `dbHelpers` import!** 

The file imported `supabase` but not `dbHelpers`, so when it tried to call `dbHelpers.getAlbumsByCreator()` inside the parallel query loader, the function didn't exist in that scope.

## Why This Happened
1. We added 17 new album-related functions to `dbHelpers` in `supabase.ts`
2. We added album loading to ProfileScreen using `dbHelpers.getAlbumsByCreator()`
3. **BUT** ProfileScreen only imported `supabase`, not `dbHelpers`
4. When the query function tried to execute, `dbHelpers` didn't exist in that scope
5. Result: "Property 'dbHelpers' doesn't exist" error

## Solution
**Fixed the import statement in ProfileScreen:**

```typescript
// Before (BROKEN):
import { supabase } from '../lib/supabase';

// After (FIXED):
import { supabase, dbHelpers } from '../lib/supabase';
```

This was a simple missing import - not a cache issue after all!

## What Was Added
These album functions are now properly available in `dbHelpers`:

```typescript
dbHelpers.getPublicAlbums(limit)          // Get published public albums
dbHelpers.getAlbumsWithStats(limit)       // Get albums with full stats
dbHelpers.getAlbumById(albumId)           // Get single album details
dbHelpers.getAlbumsByCreator(creatorId)   // Get creator's albums
dbHelpers.getAlbumTracks(albumId)         // Get album's tracks
dbHelpers.createAlbum(albumData)          // Create new album
dbHelpers.updateAlbum(albumId, updates)   // Update album
dbHelpers.deleteAlbum(albumId)            // Delete album
dbHelpers.addTrackToAlbum(...)            // Add track to album
dbHelpers.removeTrackFromAlbum(...)       // Remove track
dbHelpers.reorderAlbumTracks(...)         // Reorder tracks
dbHelpers.publishAlbum(albumId)           // Publish album
dbHelpers.updateAlbumStats(albumId)       // Update stats
dbHelpers.getAlbumStats(albumId)          // Get stats
```

## How to Avoid This in the Future

**Always check imports when adding new API calls!**

1. If you add a new function to a helper module (like `dbHelpers`)
2. And you use it in a screen/component
3. **Make sure to import it!**

Common mistake:
```typescript
// ❌ WRONG - Using dbHelpers without importing
import { supabase } from '../lib/supabase';

// Later in code:
dbHelpers.someFunction() // ERROR!
```

Correct approach:
```typescript
// ✅ CORRECT - Import what you use
import { supabase, dbHelpers } from '../lib/supabase';

// Now this works:
dbHelpers.someFunction() // SUCCESS!
```

## Verification
After clearing cache, check:
1. ✅ No more `dbHelpers` errors
2. ✅ Albums tab loads in Discover screen
3. ✅ Album functions work correctly
4. ✅ Profile "My Albums" section loads

## Related Files
- `src/lib/supabase.ts` (lines 2580-2967) - Album functions
- `src/screens/DiscoverScreen.tsx` (lines 703-723) - Uses album queries
- `src/screens/ProfileScreen.tsx` - Loads user albums
- `src/utils/dataLoading.ts` - Parallel query loader

---

**Fixed:** December 16, 2025  
**Method:** Added missing `dbHelpers` import to ProfileScreen  
**Status:** ✅ Resolved  
**File Changed:** `src/screens/ProfileScreen.tsx` (Line 24)

