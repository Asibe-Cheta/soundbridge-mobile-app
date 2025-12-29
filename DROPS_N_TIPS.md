# Cursor Prompt: Implement "Drops" Terminology + Add Tip Icon to Feed Posts

## 🎯 OBJECTIVE

Update SoundBridge terminology and add tipping functionality to feed posts:

1. **Rename "posts" to "drops"** throughout the app (EXCEPT feed screen name stays "Feed")
2. **Add tip icon** to post cards (next to Like, Comment, Repost, Share)
3. **Preserve all existing functionality** - this is primarily a terminology and UI update

---

## 📋 PHASE 1: DISCOVERY (DO THIS FIRST)

Before making any changes, please:

1. **Find all files that reference "post" or "posts":**
   - Search codebase for: "post", "posts", "Post", "Posts"
   - List all files that need terminology updates
   - **OUTPUT:** Complete list of files found

2. **Locate Feed/Post Card components:**
   - Find the component that renders individual posts in the feed
   - Identify the action buttons (Like, Comment, Repost, Share)
   - Find the styling for these buttons
   - **OUTPUT:** File paths and component names

3. **Check existing tipping infrastructure:**
   - Search for tip/tipping related code
   - Check if tipping function already exists
   - Identify payment integration (RevenueCat, Stripe, etc.)
   - **OUTPUT:** What tipping infrastructure exists (if any)

4. **Verify data models:**
   - Check database schema for posts table
   - Look for any "post_count" or similar fields
   - **OUTPUT:** Database table names and fields

**STOP HERE AND REPORT FINDINGS BEFORE PROCEEDING**

---

## 📝 PHASE 2: TERMINOLOGY UPDATES

### **What to Change:**

**Change FROM → TO:**
- "post" → "drop"
- "posts" → "drops"
- "Post" → "Drop"
- "Posts" → "Drops"
- "posted" → "dropped"
- "posting" → "dropping"
- "Create post" → "Drop something" (or "New drop")
- "Share post" → "Share drop"
- "Delete post" → "Delete drop"

### **What NOT to Change:**

**❌ DO NOT change these:**
- Screen/route name "Feed" (stays as "Feed")
- API endpoint names (can break backend)
- Database table names (migration required separately)
- Database field names (migration required separately)
- Component file names (optional, can stay as PostCard.tsx)

**✅ ONLY change:**
- User-facing text/labels
- UI button text
- Placeholder text
- Notification messages
- Error messages
- Success messages
- Comments in code (optional)

---

## 🎨 PHASE 3: ADD TIP ICON TO POST CARDS

### **Requirements:**

**1. Add Tip Button to Post Card Actions**

**Current layout (typically):**
```
👍 Like    💬 Comment    🔁 Repost    📤 Share
```

**New layout:**
```
👍 Like    💬 Comment    🔁 Repost    💰 Tip    📤 Share
```

**Location:** Find the component that renders post action buttons (usually in PostCard, FeedItem, or similar)

---

### **2. Icon Selection**

**Use ONE of these icons (in priority order):**

**Option 1: 💰 Money Bag Emoji** (Recommended)
```typescript
<Text style={styles.tipIcon}>💰</Text>
// OR
<Ionicons name="cash-outline" size={20} color="#EC4899" />
```

**Option 2: Material/Ionicons**
```typescript
// If using Ionicons:
<Ionicons name="cash-outline" size={20} color="#EC4899" />
// OR
<Ionicons name="diamond-outline" size={20} color="#EC4899" />
// OR
<Ionicons name="gift-outline" size={20} color="#EC4899" />
```

**Option 3: FontAwesome** (if available)
```typescript
<FontAwesome name="dollar" size={20} color="#EC4899" />
```

**Pick the FIRST option that's available in the project's icon library.**

---

### **3. Tip Display Logic**

**Show tip amount (if any) instead of count:**

```typescript
// Pseudo-code example:
{tipAmount > 0 ? (
  <TouchableOpacity onPress={handleTip} style={styles.actionButton}>
    <Ionicons name="cash-outline" size={20} color="#EC4899" />
    <Text style={styles.tipAmount}>£{tipAmount.toFixed(2)}</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity onPress={handleTip} style={styles.actionButton}>
    <Ionicons name="cash-outline" size={20} color="rgba(255,255,255,0.6)" />
  </TouchableOpacity>
)}
```

**Logic:**
- If post has received tips → Show icon in pink/accent color + amount (e.g., "£3.50")
- If post has NO tips → Show icon in gray/muted color + no text
- Icon should be same size as Like, Comment, Share icons
- Tappable area should match other action buttons

---

### **4. Tip Button Behavior**

**When user taps tip icon:**

**Option A: Navigate to Tip Screen** (if exists)
```typescript
const handleTip = () => {
  navigation.navigate('TipScreen', { 
    postId: post.id,
    creatorId: post.user_id,
    creatorName: post.user.name
  });
};
```

**Option B: Open Tip Modal** (if exists)
```typescript
const handleTip = () => {
  setTipModalVisible(true);
  setSelectedPost(post);
};
```

**Option C: Placeholder (if tipping not implemented yet)**
```typescript
const handleTip = () => {
  Alert.alert(
    'Tipping Coming Soon',
    'Support creators directly - launching Q1 2026!',
    [{ text: 'OK' }]
  );
};
```

**Implementation:** Use whichever option matches existing codebase structure. If tipping already exists, integrate with that. If not, use Option C placeholder.

---

### **5. Styling Guidelines**

**Match existing action button styles:**

```typescript
// Example structure (adapt to existing styles):
const styles = StyleSheet.create({
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tipIcon: {
    fontSize: 20, // Match other icons
  },
  tipAmount: {
    fontSize: 14,
    color: '#EC4899', // SoundBridge pink/accent color
    fontWeight: '600',
  },
});
```

**Color scheme:**
- Active tip (has amount): `#EC4899` (SoundBridge pink)
- Inactive tip (no amount): `rgba(255,255,255,0.6)` (muted)

---

## 📂 EXAMPLE IMPLEMENTATION

### **Before (Current Post Card):**

```typescript
// FeedPostCard.tsx or similar
<View style={styles.actions}>
  <TouchableOpacity onPress={handleLike}>
    <Ionicons name="heart-outline" size={20} />
    <Text>{likeCount}</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleComment}>
    <Ionicons name="chatbubble-outline" size={20} />
    <Text>{commentCount}</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleRepost}>
    <Ionicons name="repeat-outline" size={20} />
    <Text>{repostCount}</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleShare}>
    <Ionicons name="share-outline" size={20} />
  </TouchableOpacity>
</View>
```

---

### **After (With Tip Button Added):**

```typescript
// FeedPostCard.tsx or similar
<View style={styles.actions}>
  <TouchableOpacity onPress={handleLike}>
    <Ionicons name="heart-outline" size={20} />
    <Text>{likeCount}</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleComment}>
    <Ionicons name="chatbubble-outline" size={20} />
    <Text>{commentCount}</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleRepost}>
    <Ionicons name="repeat-outline" size={20} />
    <Text>{repostCount}</Text>
  </TouchableOpacity>

  {/* NEW: Tip Button */}
  <TouchableOpacity onPress={handleTip} style={styles.actionButton}>
    <Ionicons 
      name="cash-outline" 
      size={20} 
      color={tipAmount > 0 ? '#EC4899' : 'rgba(255,255,255,0.6)'} 
    />
    {tipAmount > 0 && (
      <Text style={styles.tipAmount}>£{tipAmount.toFixed(2)}</Text>
    )}
  </TouchableOpacity>

  <TouchableOpacity onPress={handleShare}>
    <Ionicons name="share-outline" size={20} />
  </TouchableOpacity>
</View>
```

---

## 🗂️ FILES TO UPDATE (Typically)

### **Terminology Changes (Posts → Drops):**

**Common locations (search these patterns):**
- `/src/screens/*Screen.tsx` - Screen titles, headers
- `/src/components/Post*.tsx` - Post-related components
- `/src/components/Feed*.tsx` - Feed components
- `/src/navigation/*` - Navigation labels (EXCEPT "Feed" screen name)
- `/src/localization/*` or `/src/i18n/*` - Translation files
- `/src/constants/*` - String constants
- UI text in JSX: `<Text>Create Post</Text>` → `<Text>Drop Something</Text>`
- Placeholders: `placeholder="What's on your mind?"` → `placeholder="What's your drop?"`
- Button labels: `"Post"` → `"Drop"`
- Success messages: `"Post created!"` → `"Dropped!"`
- Error messages: `"Failed to create post"` → `"Failed to drop"`

### **Tip Button Addition:**

**Common locations:**
- `/src/components/PostCard.tsx` (or FeedItem, FeedCard, etc.)
- `/src/components/Post/PostActions.tsx` (if actions are separate)
- `/src/screens/FeedScreen.tsx` (if post cards are inline)
- Related style files

---

## 🚨 CRITICAL PRESERVATION RULES

### **DO NOT CHANGE:**

**1. Backend/API:**
- ❌ Database table names (`posts` table stays `posts`)
- ❌ Database column names (`post_id` stays `post_id`)
- ❌ API endpoint URLs (`/api/posts` stays `/api/posts`)
- ❌ GraphQL queries/mutations (field names)
- ❌ Supabase table references

**2. Code Structure:**
- ❌ Component file names (optional to keep as `PostCard.tsx`)
- ❌ Function names in services/API calls
- ❌ Type/interface names (unless purely frontend)
- ❌ Navigation route names (EXCEPT labels)

**3. Screen Names:**
- ❌ "Feed" screen name (stays as "Feed")
- ❌ Route path `/feed` (stays `/feed`)

### **ONLY CHANGE:**

**✅ User-Facing Text:**
- UI labels and buttons
- Screen headers (except "Feed")
- Placeholder text
- Success/error messages
- Notification text
- Tooltips
- Help text

**✅ New Feature:**
- Add tip icon/button
- Add tip handler
- Add tip styling

---

## ✅ TESTING CHECKLIST

After implementation, verify:

### **Terminology Updates:**
- [ ] Composer button says "Drop Something" or "New Drop" (not "Create Post")
- [ ] Success message says "Dropped!" (not "Posted!")
- [ ] Profile shows "X drops" (not "X posts")
- [ ] Notifications say "dropped" (not "posted")
- [ ] Share action says "Share drop" (not "Share post")
- [ ] Feed screen name STILL says "Feed" ✅
- [ ] No broken functionality from terminology change

### **Tip Button:**
- [ ] Tip icon appears on all post cards
- [ ] Tip icon is same size as other action icons
- [ ] Tip icon shows in muted color when no tips received
- [ ] Tip icon shows in pink/accent when tips received
- [ ] Tip amount displays correctly (£X.XX format)
- [ ] Tapping tip icon triggers correct action (modal/screen/alert)
- [ ] Tip button doesn't break layout on small screens
- [ ] Tip button is accessible (proper touch target size)

### **No Breaking Changes:**
- [ ] Liking still works
- [ ] Commenting still works
- [ ] Reposting still works
- [ ] Sharing still works
- [ ] Creating new drops works
- [ ] Deleting drops works
- [ ] API calls still function
- [ ] No console errors

---

## 📊 DELIVERABLES

Please provide:

### **1. Discovery Report:**
- Files containing "post" terminology: `[list]`
- Post card component location: `[path]`
- Existing tipping infrastructure: `[yes/no + details]`
- Icon library available: `[Ionicons/FontAwesome/etc]`

### **2. Implementation Summary:**
- Files modified for terminology: `[count + list]`
- Files modified for tip button: `[list]`
- Icon used for tip: `[name]`
- Tip handler implementation: `[modal/screen/placeholder]`

### **3. Testing Confirmation:**
- [ ] All "post" → "drop" changes verified
- [ ] "Feed" screen name unchanged ✅
- [ ] Tip button appears correctly
- [ ] Tip button functional
- [ ] No breaking changes
- [ ] No console errors

---

## 🔄 ROLLBACK PLAN

If something breaks:

**Terminology Changes:**
1. Use git to revert text changes: `git diff` to see what changed
2. Replace "drop" back to "post" in affected files
3. Test functionality restored

**Tip Button:**
1. Comment out tip button code in post card
2. Test that other actions still work
3. Debug tip button separately

---

## 💡 IMPLEMENTATION TIPS

1. **Search carefully:** Use case-sensitive search for "post", "Post", "posts", "Posts"
2. **Preserve context:** "Re-post" → "Re-drop", "Repost" → "Redrop" (or "Re-drop")
3. **Be consistent:** If you use "Drop" capitalized somewhere, use it everywhere
4. **Test incrementally:** Test terminology changes before adding tip button
5. **Match existing patterns:** Tip button should look native, not bolted-on

---

## 🎯 SUCCESS CRITERIA

**Implementation is complete when:**

1. ✅ All user-facing "post" text changed to "drop"
2. ✅ "Feed" screen name unchanged
3. ✅ Tip icon added to all post cards
4. ✅ Tip icon shows amount when tips exist
5. ✅ Tip icon is tappable and triggers action
6. ✅ No functionality broken
7. ✅ UI looks clean and professional
8. ✅ All tests pass

---

## 🆘 IF YOU GET STUCK

**Common issues:**

**Issue:** Too many "post" references to change
**Solution:** Focus on user-facing text only, skip code/API names

**Issue:** Don't know which icon to use
**Solution:** Search codebase for existing icon usage, match that pattern

**Issue:** Tip functionality doesn't exist yet
**Solution:** Use placeholder Alert (Option C above)

**Issue:** Layout breaks with tip button added
**Solution:** Check if other action buttons use flexbox, match that pattern

---

## 📞 FINAL REMINDERS

- **Start with discovery** - understand structure before changing
- **Change text only** - don't rename code unless necessary
- **Keep "Feed" as "Feed"** - this is explicit requirement
- **Match existing patterns** - tip button should feel native
- **Test thoroughly** - verify nothing breaks
- **Ask before major changes** - if unsure, report findings first

**Begin with Phase 1 Discovery and report what you find!**

Good luck! 🚀