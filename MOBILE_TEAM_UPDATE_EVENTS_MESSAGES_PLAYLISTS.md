# 🚨 Mobile Team Update - Events, Messages & Playlists

**Date:** October 5, 2025  
**Status:** ✅ **SOLUTIONS PROVIDED**  
**Priority:** 🔴 **HIGH**

---

## 📋 **Issues Addressed**

Based on your console logs, here are the solutions for:

1. ✅ **Events Error**: "No events found, using mock data"
2. ✅ **Conversations Error**: `db.getConversations is not a function`
3. ✅ **Playlists**: "Playlists feature not implemented yet"
4. ✅ **Search Results Validation**: How to verify search is working

---

## 1️⃣ **EVENTS ISSUE - SOLVED** ✅

### **Problem:**
"DiscoverScreen: No events found, using mock data"

### **Root Cause:**
The query filters for `event_date >= NOW()`, but there may be **no upcoming events** in the database.

### **Solution:**
Modify the events query to fall back to **recent past events** if no upcoming events exist:

```typescript
// Update your DiscoverScreen.tsx or wherever you load events

const loadEvents = async () => {
  try {
    setLoadingEvents(true);
    setEventsError(null);
    
    console.log('DiscoverScreen: Loading events...');
    
    // First try upcoming events
    let { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        location,
        venue,
        category,
        price_gbp,
        price_ngn,
        image_url,
        creator_id,
        created_at,
        organizer:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10);

    // If no upcoming events, get recent past events
    if (!error && (!data || data.length === 0)) {
      console.log('DiscoverScreen: No upcoming events, fetching recent past events...');
      
      const result = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          venue,
          category,
          price_gbp,
          price_ngn,
          image_url,
          creator_id,
          created_at,
          organizer:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('event_date', { ascending: false })
        .limit(10);
      
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    console.log('✅ DiscoverScreen: Events loaded:', data?.length || 0);
    setEvents(data || []);
  } catch (err) {
    console.error('❌ DiscoverScreen: Error loading events:', err);
    setEventsError('Failed to load events');
  } finally {
    setLoadingEvents(false);
  }
};
```

### **Why This Works:**
- First tries to get upcoming events (future dates)
- If none found, falls back to recent past events
- Shows real data instead of mock data
- Users see actual events from the database

---

## 2️⃣ **CONVERSATIONS/MESSAGES ISSUE - SOLVED** ✅

### **Problem:**
`_libSupabase.db.getConversations is not a function`

### **Root Cause:**
The `getConversations` function doesn't exist in your `src/lib/supabase.ts` yet.

### **Database Schema:**
The `messages` table **already exists** in the database:

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** There is **NO separate `conversations` table**. Conversations are **derived from messages**.

### **Solution:**
Add these functions to your `src/lib/supabase.ts`:

```typescript
export const dbHelpers = {
  // ... existing functions ...

  // ✅ NEW: Get conversations for MessagesScreen
  async getConversations(userId: string) {
    try {
      console.log('📬 Fetching conversations for user:', userId);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group messages into conversations
      const conversationsMap = new Map();
      
      messages?.forEach((message) => {
        const otherUserId = message.sender_id === userId 
          ? message.recipient_id 
          : message.sender_id;
        
        const otherUser = message.sender_id === userId 
          ? message.recipient 
          : message.sender;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            id: otherUserId,
            userId: otherUserId,
            user: otherUser,
            lastMessage: message.content,
            lastMessageTime: message.created_at,
            unreadCount: 0,
            messages: []
          });
        }

        const conversation = conversationsMap.get(otherUserId);
        conversation.messages.push(message);
        
        // Count unread messages (where current user is recipient)
        if (!message.is_read && message.recipient_id === userId) {
          conversation.unreadCount++;
        }
      });

      const conversations = Array.from(conversationsMap.values());
      console.log('✅ Conversations loaded:', conversations.length);
      
      return { data: conversations, error: null };
    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Get messages for a specific conversation
  async getMessages(userId: string, otherUserId: string) {
    try {
      console.log('💬 Fetching messages between:', userId, 'and', otherUserId);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Messages loaded:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Send a message
  async sendMessage(senderId: string, recipientId: string, content: string, messageType = 'text') {
    try {
      console.log('📤 Sending message from:', senderId, 'to:', recipientId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Message sent:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Mark message as read
  async markMessageAsRead(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return { data: null, error };
    }
  }
};
```

### **Update MessagesScreen:**

```typescript
// MessagesScreen.tsx
import { dbHelpers } from '../lib/supabase';

const MessagesScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Get current user

  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('MessagesScreen: Loading conversations...');
      
      const { data, error } = await dbHelpers.getConversations(user.id);
      
      if (error) throw error;
      
      setConversations(data || []);
      console.log('✅ MessagesScreen: Conversations loaded:', data?.length || 0);
    } catch (err) {
      console.error('❌ MessagesScreen: Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your MessagesScreen code
};
```

---

## 3️⃣ **PLAYLISTS FEATURE - FULLY IMPLEMENTED** ✅

### **Good News:**
The playlists feature is **fully implemented** on the backend! 🎉

- ✅ Database tables exist (`playlists`, `playlist_tracks`)
- ✅ RLS policies configured
- ✅ API endpoints created
- ✅ Ready for mobile integration

### **Implementation:**
See the complete guide in **`MOBILE_TEAM_PLAYLISTS_IMPLEMENTATION.md`** which includes:

- Database schema details
- API endpoints (`/api/playlists/public`, `/api/playlists/[id]`, `/api/playlists/user/[userId]`)
- Supabase helper functions
- Full React Native component examples
- Styling and UI implementation

**You can now replace the "Coming Soon" screen with real playlists!**

---

## 4️⃣ **SEARCH RESULTS VALIDATION** ✅

### **How to Test if Search is Working:**

Add this test function to verify tracks exist:

```typescript
// Add to your search screen or test file
const testSearchData = async () => {
  try {
    console.log('🔍 Testing search data availability...');
    
    // Test 1: Check if public tracks exist
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('id, title, is_public, creator_id')
      .eq('is_public', true)
      .limit(5);
    
    console.log('✅ Public tracks found:', tracks?.length || 0);
    if (tracks && tracks.length > 0) {
      console.log('Sample tracks:', tracks.map(t => t.title));
    }
    
    // Test 2: Check if creators exist
    const { data: creators, error: creatorsError } = await supabase
      .from('profiles')
      .select('id, username, display_name, role')
      .eq('role', 'creator')
      .limit(5);
    
    console.log('✅ Creators found:', creators?.length || 0);
    if (creators && creators.length > 0) {
      console.log('Sample creators:', creators.map(c => c.display_name));
    }
    
    // Test 3: Check if events exist
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date')
      .limit(5);
    
    console.log('✅ Events found:', events?.length || 0);
    if (events && events.length > 0) {
      console.log('Sample events:', events.map(e => e.title));
    }
    
    return {
      tracks: tracks?.length || 0,
      creators: creators?.length || 0,
      events: events?.length || 0
    };
  } catch (error) {
    console.error('❌ Error testing search data:', error);
    return null;
  }
};

// Call this on app startup or in search screen
testSearchData();
```

### **Expected Results:**
- If tracks exist: Search will return real results
- If no tracks exist: Search will return empty (which is correct behavior)
- Check console logs to see what data is available

---

## 📊 **SUMMARY OF CHANGES**

| Issue | Status | Action Required |
|-------|--------|-----------------|
| **Events not loading** | ✅ SOLVED | Update events query with fallback to past events |
| **Conversations error** | ✅ SOLVED | Add `getConversations`, `getMessages`, `sendMessage` functions |
| **Playlists not implemented** | ✅ READY | Implement using `MOBILE_TEAM_PLAYLISTS_IMPLEMENTATION.md` |
| **Search validation** | ✅ SOLVED | Use `testSearchData()` function to verify |

---

## 🚀 **IMPLEMENTATION ORDER**

1. **IMMEDIATE (High Priority):**
   - ✅ Fix events loading (5 minutes)
   - ✅ Add conversations functions (10 minutes)
   - ✅ Test search data availability (5 minutes)

2. **SOON (Medium Priority):**
   - ✅ Implement playlists feature (1-2 hours)
   - ✅ Add playlist details screen
   - ✅ Test end-to-end functionality

---

## ✅ **TESTING CHECKLIST**

After implementing these fixes, verify:

- [ ] Events load (either upcoming or past events)
- [ ] Conversations list displays in MessagesScreen
- [ ] Can send and receive messages
- [ ] Search returns results (if data exists)
- [ ] Playlists load in DiscoverScreen
- [ ] Can view playlist details
- [ ] All console logs show success (✅)
- [ ] No red error messages

---

## 🆘 **TROUBLESHOOTING**

### **Still seeing "No events found"?**
- Check if ANY events exist in database (run test query)
- Verify Supabase connection is working
- Check console logs for specific errors

### **Conversations still not working?**
- Verify you added ALL functions to `dbHelpers`
- Check that `user.id` is available in MessagesScreen
- Ensure Supabase client is properly initialized

### **Search returns empty?**
- Run `testSearchData()` to check if data exists
- Verify tracks have `is_public = true`
- Check RLS policies allow public access

---

## 📞 **SUPPORT**

If you encounter any issues after implementing these fixes:

1. **Check console logs** for specific error messages
2. **Run test functions** to verify data availability
3. **Verify Supabase credentials** are correct
4. **Report back** with specific error messages

---

**Status:** ✅ **ALL SOLUTIONS PROVIDED**  
**Action Required:** **IMPLEMENT FIXES**  
**ETA:** **30-60 minutes to working features**

All the backend infrastructure is ready and waiting for mobile app integration! 🚀
