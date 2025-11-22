# 🚨 Supabase Realtime Issue - Live Chat Stuck "Connecting..."

**Date:** November 21, 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🟠 **MEDIUM** (Feature works, but not in real-time)  
**Status:** ❌ **REAL-TIME NOT WORKING**

---

## 🐛 **THE ISSUE**

**Live Chat Status Badge:** 🟡 **"Connecting..."** (stuck, never turns green)

**What's Happening:**
- User goes live as host
- Live chat debug badge shows **"Connecting..."** indefinitely
- Chat messages DO save to database (confirmed)
- But messages don't appear in real-time (user must leave/rejoin to see them)
- Badge never changes to 🟢 **"Live (0)"**

---

## 🔍 **ROOT CAUSE**

**Supabase Realtime is NOT enabled** for the `live_session_comments` table.

The mobile app is subscribing to real-time updates:

```typescript
supabase
  .channel(`session_comments:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'live_session_comments',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      // This callback NEVER fires because Realtime is disabled
      console.log('New comment:', payload);
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status); // Shows "TIMED_OUT" or "CLOSED"
  });
```

**Expected:** Subscription status = `"SUBSCRIBED"` (green badge)  
**Actual:** Subscription status = `"TIMED_OUT"` or `"CLOSED"` (orange/gray badge)

---

## ✅ **HOW TO FIX**

### **Step 1: Enable Realtime in Supabase Dashboard**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Database → Replication**
4. Find the table: **`live_session_comments`**
5. Toggle **"Enable Realtime"** to ON
6. (Optional but recommended) Also enable for:
   - `live_session_participants`
   - `live_session_tips`
   - `live_sessions`

### **Step 2: Verify RLS Policies Allow Realtime**

Realtime requires proper RLS policies. Ensure you have:

```sql
-- Allow authenticated users to subscribe to comments for sessions they're in
CREATE POLICY "Users can subscribe to session comments"
  ON live_session_comments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM live_session_participants
      WHERE session_id = live_session_comments.session_id
    )
  );
```

**Important:** RLS policies for `SELECT` are checked for Realtime subscriptions!

### **Step 3: Confirm Realtime is Working**

**Option A: Use Supabase Dashboard**
1. Go to **API → Realtime Inspector**
2. Subscribe to: `realtime:public:live_session_comments`
3. Insert a test comment via SQL Editor
4. Should see the event appear in Realtime Inspector

**Option B: Test in Mobile App**
1. Go live as host
2. Check badge: Should turn 🟢 **"Live (0)"** within 2-3 seconds
3. Send a chat message
4. Message should appear immediately
5. Badge counter should increase: **"Live (1)"**, **"Live (2)"**, etc.

---

## 📋 **TABLES THAT NEED REALTIME**

| Table | Priority | Reason |
|-------|----------|--------|
| `live_session_comments` | 🔴 **Critical** | Chat messages must appear instantly |
| `live_session_participants` | 🟠 **High** | Show who joins/leaves in real-time |
| `live_session_tips` | 🟠 **High** | Display tip notifications as they happen |
| `live_sessions` | 🟡 **Medium** | Detect when host ends session |

**Recommendation:** Enable Realtime for all 4 tables above.

---

## 🔍 **DEBUGGING INFO**

### **Mobile App Logs (What User Sees):**

```
📡 [REALTIME] Subscribing to updates for session: abc-123
✅ [REALTIME] Comments subscription created
🔌 [REALTIME] Subscription status: { status: "SUBSCRIBING" }
🔌 [REALTIME] Subscription status: { status: "TIMED_OUT" }
❌ [REALTIME] Subscription never becomes "SUBSCRIBED"
```

### **Expected Logs (When Working):**

```
📡 [REALTIME] Subscribing to updates for session: abc-123
✅ [REALTIME] Comments subscription created
🔌 [REALTIME] Subscription status: { status: "SUBSCRIBING" }
🔌 [REALTIME] Subscription status: { status: "SUBSCRIBED" } ✅
📨 [DB] New comment insert detected: { ... }
✅ [DB] Full comment fetched, calling callback
💬 [REALTIME] New comment received: { ... }
💬 [REALTIME] Adding comment to list
```

---

## 🎯 **EXPECTED BEHAVIOR AFTER FIX**

### **Before Fix (Current):**
```
User goes live
→ Badge shows: 🟡 "Connecting..."
→ User sends chat message
→ Message saves to database ✅
→ But doesn't appear in UI ❌
→ User must leave/rejoin to see messages ❌
```

### **After Fix:**
```
User goes live
→ Badge shows: 🟡 "Connecting..." (1-2 seconds)
→ Badge changes to: 🟢 "Live (0)" ✅
→ User sends chat message
→ Message appears instantly ✅
→ Badge updates: 🟢 "Live (1)" ✅
→ Real-time chat works! ✅
```

---

## 🧪 **TESTING AFTER FIX**

### **Test 1: Realtime Subscription**
1. Mobile app: Go live as host
2. Check badge next to "Live Chat"
3. **Expected:** 🟢 **"Live (0)"** within 3 seconds
4. **If still orange/gray:** Realtime not enabled

### **Test 2: Send Message**
1. Type a message in chat
2. Hit send
3. **Expected:** Message appears immediately
4. Badge counter increases: **"Live (1)"**

### **Test 3: Multiple Devices** (Bonus)
1. Open same session on 2 devices
2. Send message from Device A
3. **Expected:** Appears on Device B instantly

---

## 📸 **VISUAL REFERENCE**

**Current State (Broken):**
- Badge: 🟡 **"Connecting..."** or ⚪ **"Offline"**
- Messages don't appear until page refresh

**Target State (Working):**
- Badge: 🟢 **"Live (5)"** (showing real-time count)
- Messages appear instantly as they're sent

---

## ⚙️ **SUPABASE REALTIME CONFIGURATION**

### **Check Current Status:**
```sql
-- Run this in Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  pg_get_replication_slots.slot_name
FROM pg_tables
LEFT JOIN pg_replication_slots ON pg_replication_slots.slot_name LIKE '%' || tablename || '%'
WHERE schemaname = 'public'
  AND tablename LIKE 'live_session%';
```

### **If Realtime is Disabled:**
You'll see `NULL` in the `slot_name` column for `live_session_comments`.

### **After Enabling:**
You should see a slot name like `supabase_realtime_replication_slot`.

---

## 🔗 **USEFUL LINKS**

1. **Supabase Realtime Docs:**  
   https://supabase.com/docs/guides/realtime

2. **Realtime Broadcast (Alternative):**  
   https://supabase.com/docs/guides/realtime/broadcast

3. **RLS and Realtime:**  
   https://supabase.com/docs/guides/realtime/postgres-changes#authorization

---

## 🚀 **URGENCY**

**MEDIUM** - Chat messages save correctly, but lack of real-time updates significantly degrades UX for live audio sessions. Users expect instant chat like Clubhouse/Twitter Spaces.

**Timeline:**
- 🟢 **Low effort:** ~5 minutes to enable Realtime in dashboard
- 🟡 **Medium effort:** If RLS policies need updates (~30 min)
- 🔴 **High effort:** If fundamental architecture changes needed (rare)

---

## 📞 **NEXT STEPS**

### **For Web Team:**
1. ✅ Enable Realtime for `live_session_comments` table
2. ✅ Verify RLS policies allow `SELECT` for subscribed users
3. ✅ Test in Supabase Realtime Inspector
4. ✅ Confirm fix deployed
5. ✅ Notify mobile team to test

### **For Mobile Team:**
1. ⏰ Wait for web team confirmation
2. 🧪 Test in Build #110 (current)
3. ✅ Verify badge turns green
4. ✅ Confirm messages appear in real-time
5. 📢 Report results

---

## ❓ **QUESTIONS?**

If you need any clarification or have questions about the Realtime integration, please let us know!

**Mobile Team**  
November 21, 2025

