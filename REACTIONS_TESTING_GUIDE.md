# LinkedIn-Style Reactions - Testing Guide

## Quick Start

```bash
# Start the app
npx expo start

# Or run on specific platform
npx expo start --ios
npx expo start --android
```

---

## What to Look For

### 1. Default Post State (Not Reacted)
```
┌─────────────────────────────────────────┐
│ 👤 John Smith                           │
│    Music Producer                       │
│    2h ago                               │
│                                         │
│ Just dropped my new track! 🎵          │
│                                         │
│ [Audio Player]                          │
│                                         │
├─────────────────────────────────────────┤
│ 👍        💬         🔁        ↗       │  ← NEW: LinkedIn-style buttons
│ Support   Comment    Repost    Share    │
└─────────────────────────────────────────┘
```

**Expected Behavior:**
- All 4 buttons visible (Support, Comment, Repost, Share)
- All buttons gray/neutral color
- No summary line (no reactions yet)
- Clean, professional appearance

---

### 2. After You React with Fire
```
┌─────────────────────────────────────────┐
│ 👤 John Smith                           │
│    Music Producer                       │
│    2h ago                               │
│                                         │
│ Just dropped my new track! 🎵          │
│                                         │
│ [Audio Player]                          │
│                                         │
├─────────────────────────────────────────┤
│ 🔥        💬         🔁        ↗       │  ← Fire emoji + red tint
│ Fire      Comment    Repost    Share    │
│                                         │
│ You and 14 others reacted  •  8 comments│  ← NEW: Summary line
└─────────────────────────────────────────┘
```

**Expected Behavior:**
- First button shows 🔥 Fire (red color)
- Button has red tint background
- Summary shows "You and X others reacted • Y comments"
- Other buttons remain gray

---

### 3. Long-Press Shows Reaction Picker
```
┌─────────────────────────────────────────┐
│                                         │
│        [Blur Background]                │
│                                         │
│    ┌───────────────────────────────┐   │
│    │  👍    ❤️    🔥    👏       │   │  ← Reaction Picker Modal
│    │ Support Love Fire Congrats   │   │
│    └───────────────────────────────┘   │
│                                         │
│ 👤 John Smith                           │
│    Just dropped my new track!           │
│                                         │
│ 👍        💬         🔁        ↗       │
│ Support   Comment    Repost    Share    │
└─────────────────────────────────────────┘
```

**Expected Behavior:**
- Long-press Support button for 500ms
- Modal appears with 4 reaction options
- Blur background (dark or light based on theme)
- Haptic feedback when modal opens (on device)
- Tap any reaction to select
- Tap outside to dismiss

---

## Step-by-Step Testing

### Test 1: Quick Support Reaction
1. Find a post in your feed
2. **Tap** the "👍 Support" button (single tap)
3. ✅ Button should turn red with 🔥 or ❤️ based on selection
4. ✅ Summary line appears: "You reacted • X comments"

### Test 2: Long-Press Reaction Picker
1. On same post, **press and hold** Support button (500ms)
2. ✅ Modal should appear with 4 reactions
3. ✅ Haptic feedback (if on device)
4. **Tap** 🔥 Fire
5. ✅ Button changes to "🔥 Fire" (red)
6. ✅ Modal dismisses

### Test 3: Change Reaction
1. **Long-press** the Fire button again
2. ✅ Modal appears
3. **Tap** ❤️ Love
4. ✅ Button changes to "❤️ Love" (pink)
5. ✅ Summary updates

### Test 4: Remove Reaction
1. **Single tap** the Love button
2. ✅ Reaction removed
3. ✅ Button returns to "👍 Support" (gray)
4. ✅ Summary updates or disappears if no reactions

### Test 5: Other Buttons
1. **Tap** Comment button
   - ✅ Opens comments (existing functionality)
2. **Tap** Share button
   - ✅ Opens share sheet (existing functionality)
3. **Tap** Repost button
   - ✅ Currently disabled (placeholder for future)

### Test 6: Dismiss Reaction Picker
1. **Long-press** Support button
2. ✅ Modal appears
3. **Tap outside** modal (on blurred area)
4. ✅ Modal dismisses
5. ✅ No reaction applied

---

## What Changed from Old UI

### Before (OLD - 4 Separate Reaction Buttons)
```
👏 0  ❤️ 0  🔥 0  🎉 0  ← OLD: Always visible, cluttered
💬 2 comments
```

### After (NEW - LinkedIn Style)
```
👍        💬         🔁        ↗     ← NEW: Clean buttons
Support   Comment    Repost    Share

15 reactions  •  8 comments  ← NEW: Summary line (only if counts > 0)
```

**Key Improvements:**
- ✅ No emoji clutter
- ✅ Professional LinkedIn-style
- ✅ Long-press for more reactions
- ✅ Summary line only when needed
- ✅ Button shows your reaction

---

## Correct Reaction Types (IMPORTANT!)

### ✅ Support (NOT "Like")
- Emoji: 👍
- Label: "Support"
- API value: `"support"`
- **FIXED:** Was 👏, now correctly 👍

### ✅ Love
- Emoji: ❤️
- Label: "Love"
- API value: `"love"`

### ✅ Fire
- Emoji: 🔥
- Label: "Fire"
- API value: `"fire"`

### ✅ Congrats
- Emoji: 👏
- Label: "Congrats"
- API value: `"congrats"`
- **Note:** 👏 moved from Support to Congrats

---

## Dark Mode Testing

Test in both light and dark modes:

1. Open iOS/Android system settings
2. Toggle Dark Mode on/off
3. Check reactions UI:
   - ✅ Buttons visible in both modes
   - ✅ Modal background adapts (light/dark blur)
   - ✅ Text colors have good contrast
   - ✅ Active state colors work in both modes

---

## Performance Checklist

- [ ] Feed scrolling smooth (no lag)
- [ ] Long-press responsive (500ms feels natural)
- [ ] Modal animation smooth (no jank)
- [ ] Haptic feedback works (on device)
- [ ] No memory leaks (can scroll feed indefinitely)
- [ ] Optimistic updates work (instant UI change)

---

## Error Testing

### Test Network Error
1. Enable Airplane Mode
2. Try to react
3. ✅ Should show error
4. ✅ Reaction should not apply
5. Disable Airplane Mode
6. Try again
7. ✅ Should work

### Test Rapid Tapping
1. Tap Support button 10 times rapidly
2. ✅ Should not send 10 API calls (debounced)
3. ✅ UI should update correctly
4. ✅ Final state matches server

---

## Success Criteria

### Visual ✅
- [ ] Buttons look professional (LinkedIn-style)
- [ ] No emoji clutter by default
- [ ] Active state has red tint background
- [ ] Summary line only shows if counts > 0
- [ ] Modal centered with blur background

### Functional ✅
- [ ] Single tap = Quick Support reaction
- [ ] Long-press (500ms) = Shows picker
- [ ] Select from picker = Applies reaction
- [ ] Tap active reaction = Removes it
- [ ] Long-press active = Change reaction
- [ ] Comment button works
- [ ] Share button works

### Mobile ✅
- [ ] Haptic feedback on long-press (device)
- [ ] Haptic feedback on selection (device)
- [ ] Touch targets ≥ 44px (easy to tap)
- [ ] Works in portrait and landscape
- [ ] No overlap with notches/safe areas

---

## Common Issues & Solutions

### Issue: Long-press not working
**Solution:** Make sure you're holding for full 500ms

### Issue: No haptic feedback
**Solution:** Test on physical device (simulators don't have haptics)

### Issue: Modal doesn't appear
**Solution:** Check console for errors, ensure ReactionPicker imported correctly

### Issue: Reaction counts not updating
**Solution:** Check network connection, verify API endpoints working

---

## Screenshots to Take (For Documentation)

1. **Default State:** Post with no reactions
2. **After Reaction:** Post with user's reaction (red tint)
3. **Long-Press Modal:** Reaction picker visible
4. **Summary Line:** "You and X others reacted" text
5. **Dark Mode:** Same views in dark mode

---

## Next Steps After Testing

1. **If everything works:** ✅ Ready for production!
2. **If issues found:** Report in this format:
   - What you did
   - What you expected
   - What actually happened
   - Screenshots/video
   - Device/OS version

3. **Future enhancements:**
   - Enable Repost button (when backend ready)
   - Add reaction breakdown modal (optional)
   - Real-time reaction updates (optional)

---

## Files to Review

- `src/components/PostCard.tsx` - Main post component
- `src/components/ReactionPicker.tsx` - Reaction picker modal
- `src/hooks/useFeed.ts` - Feed data management
- `src/services/api/feedService.ts` - API calls

---

**Happy Testing! 🎉**

If you encounter any issues or have questions, refer to:
- `POST_REACTIONS_IMPLEMENTATION_COMPLETE.md` - Full technical docs
- `CURSOR_POST.md` - Original specification

