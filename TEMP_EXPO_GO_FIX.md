# 🔧 Temporary Expo Go Compatibility Fix

**Purpose:** Disable drag-and-drop feature temporarily to allow testing in Expo Go while production build is being processed.

---

## What Will Be Disabled

The drag-to-reorder tracks feature in `UploadScreen.tsx` will be temporarily replaced with a static list + up/down arrow buttons for reordering.

---

## Changes to Make (After Build Succeeds)

### 1. **Comment out drag imports**
```typescript
// Temporarily disabled for Expo Go
// import DraggableFlatList from 'react-native-draggable-flatlist';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

### 2. **Replace DraggableFlatList with regular FlatList**
Instead of long-press drag, use up/down arrow buttons.

### 3. **Add reorder buttons**
Simple up/down arrows to move tracks in the list.

---

## Re-enabling Later

After TestFlight build is confirmed working:
1. Uncomment the imports
2. Restore `DraggableFlatList` component
3. Remove arrow buttons
4. Commit to git

---

## Why This Approach?

- **Production builds** (TestFlight, App Store) = Full drag-and-drop ✅
- **Expo Go** (development testing) = Arrow buttons for reordering ✅

Best of both worlds!

---

**Status:** Waiting for EAS build to complete before making changes.

