# 📱 Mobile Team Response: Upload Schema & Lyrics Feature Coordination

**Date:** January 8, 2025  
**From:** Mobile App Development Team  
**To:** Web App Development Team  
**Subject:** Upload Database Schema Alignment & Lyrics Implementation  
**Priority:** 🟢 **HIGH** - Immediate Upload Fix + Feature Coordination  
**Status:** ✅ **MOBILE SCHEMA PROVIDED** | 🔄 **LYRICS IMPLEMENTATION READY**

---

## 🚨 **IMMEDIATE RESPONSE: Upload Schema**

### **Current Mobile App Upload Structure**

**✅ CONFIRMED: Our mobile app upload payload structure:**

```typescript
// Mobile app upload fields (working implementation)
{
  title: string,
  artist_name: string,
  description: string,
  creator_id: string,
  file_url: string,
  cover_art_url: string,
  duration: number,
  genre: string,
  tags: string,
  is_public: boolean,
  
  // Audio metadata (basic)
  file_size: number,
  mime_type: string,
  
  // NO audio quality fields currently implemented
  // NO processing status fields currently implemented
}
```

### **Current Database Schema (audio_tracks table)**

```sql
-- Mobile app's current audio_tracks table structure
CREATE TABLE audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  artist_name VARCHAR,
  description TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  cover_art_url TEXT,
  duration DECIMAL(10,2),
  genre VARCHAR,
  tags TEXT,
  file_size BIGINT,
  mime_type VARCHAR,
  is_public BOOLEAN DEFAULT FALSE,
  plays_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 **RECOMMENDED SOLUTION: Option 1 - Minimal Fix**

### **Immediate Database Schema Addition (24-hour fix)**

```sql
-- Add missing columns that web app needs (minimal approach)
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS lyrics TEXT,
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS audio_quality VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS bitrate INTEGER DEFAULT 128,
ADD COLUMN IF NOT EXISTS sample_rate INTEGER DEFAULT 44100,
ADD COLUMN IF NOT EXISTS channels INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS codec VARCHAR(20) DEFAULT 'mp3',
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_quality ON audio_tracks(audio_quality);
```

### **Updated Mobile Upload Payload (with defaults)**

```typescript
// Mobile app upload fields (updated for compatibility)
{
  title: string,
  artist_name: string,
  description: string,
  creator_id: string,
  file_url: string,
  cover_art_url: string,
  duration: number,
  genre: string,
  tags: string,
  file_size: number,
  mime_type: string,
  is_public: boolean,
  
  // New fields with sensible defaults
  lyrics: string | null,
  lyrics_language: string, // default: 'en'
  audio_quality: string,   // default: 'standard'
  bitrate: number,         // default: 128
  sample_rate: number,     // default: 44100
  channels: number,        // default: 2
  codec: string,           // default: 'mp3'
  processing_status: string, // default: 'completed'
  processing_completed_at: string // default: now()
}
```

---

## 🎵 **LYRICS FEATURE: Full Implementation Plan**

### **✅ APPROVED: We want to implement lyrics on mobile**

**Timeline:** 2-3 weeks  
**Approach:** Phased implementation (simple first, then advanced)  
**Coordination:** Yes, we want full alignment with web app  

### **Phase 1: Simple Lyrics (Week 1) - MOBILE READY TO IMPLEMENT**

**Features:**
- ✅ Upload form with lyrics textarea
- ✅ Basic lyrics display in music player
- ✅ Toggle button in player controls
- ✅ Modal overlay with scrollable lyrics
- ✅ Language selector (en, yo, ig, pcm)

**Mobile Implementation Plan:**

#### **1. Upload Form Updates**
```typescript
// Add to existing upload screen
const [lyrics, setLyrics] = useState('');
const [lyricsLanguage, setLyricsLanguage] = useState('en');

// In upload form
<TextInput
  style={styles.lyricsInput}
  placeholder="Enter song lyrics (optional)..."
  multiline
  numberOfLines={8}
  value={lyrics}
  onChangeText={setLyrics}
  textAlignVertical="top"
/>

<Picker
  selectedValue={lyricsLanguage}
  onValueChange={setLyricsLanguage}
>
  <Picker.Item label="English" value="en" />
  <Picker.Item label="Yoruba" value="yo" />
  <Picker.Item label="Igbo" value="ig" />
  <Picker.Item label="Pidgin" value="pcm" />
</Picker>
```

#### **2. Music Player Updates**
```typescript
// Add lyrics toggle button to existing AudioPlayerScreen
<TouchableOpacity
  onPress={() => setShowLyrics(true)}
  style={styles.lyricsButton}
>
  <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
</TouchableOpacity>

// Add lyrics modal (similar to web app implementation)
<Modal
  visible={showLyrics}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowLyrics(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.lyricsContainer}>
      {/* Lyrics content */}
    </View>
  </View>
</Modal>
```

### **Phase 2: Advanced Lyrics (Week 2-3) - FUTURE**

**Features:**
- 🔄 Timestamped lyrics with real-time sync
- 🔄 Current line highlighting
- 🔄 Auto-scroll to current line
- 🔄 Translation support
- 🔄 LRC format import

---

## 📊 **AUDIO QUALITY SYSTEM: Mobile Team Position**

### **Current Status: Not Implemented**
- ❌ No audio quality features on mobile
- ❌ No Pro/Enterprise tier system
- ❌ No audio enhancement processing

### **Future Plans: Phase 2 (3-6 months)**
- 🔄 Basic audio quality detection
- 🔄 File format optimization
- 🔄 Simple quality indicators
- 🔄 No advanced processing initially

### **Recommended Approach:**
- **Phase 1:** Add basic columns with defaults (immediate)
- **Phase 2:** Implement quality detection when needed
- **Phase 3:** Advanced processing features later

---

## 🔧 **IMMEDIATE ACTIONS REQUIRED**

### **Web App Team (Today):**
1. ✅ **Apply minimal schema fix** (add missing columns with defaults)
2. ✅ **Update upload API** to handle missing fields gracefully
3. ✅ **Test upload functionality** with new schema
4. ✅ **Deploy lyrics API endpoints** (provided in your response)

### **Mobile Team (This Week):**
1. ✅ **Update upload form** to include lyrics fields
2. ✅ **Add lyrics toggle** to music player
3. ✅ **Implement basic lyrics modal**
4. ✅ **Test end-to-end lyrics flow**

### **Coordination (Ongoing):**
1. ✅ **Share API endpoints** for lyrics fetching
2. ✅ **Coordinate UI/UX** consistency
3. ✅ **Test cross-platform** compatibility
4. ✅ **Monitor performance** impact

---

## 🎨 **UI/UX ALIGNMENT: Mobile Specifications**

### **Lyrics Toggle Button**
```typescript
// Match web app design
<TouchableOpacity style={styles.lyricsButton}>
  <Ionicons 
    name="musical-notes" 
    size={24} 
    color="#FFFFFF" 
  />
</TouchableOpacity>

const styles = StyleSheet.create({
  lyricsButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  }
});
```

### **Lyrics Modal Design**
```typescript
// Consistent with web app styling
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  lyricsContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden'
  },
  lyricsText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#FFFFFF'
  }
});
```

---

## 📋 **TESTING REQUIREMENTS**

### **Mobile Team Testing Checklist**
- [ ] Upload form accepts lyrics input
- [ ] Lyrics save to database correctly
- [ ] Lyrics toggle appears in music player
- [ ] Lyrics modal opens/closes smoothly
- [ ] Lyrics display correctly formatted
- [ ] Language selector works
- [ ] No lyrics state handled gracefully
- [ ] Performance impact minimal
- [ ] Cross-platform consistency with web

### **Integration Testing**
- [ ] Mobile upload works with web schema
- [ ] Web upload works with mobile schema
- [ ] Lyrics display consistently on both platforms
- [ ] API endpoints work from mobile
- [ ] Database queries perform well

---

## 🚀 **IMPLEMENTATION TIMELINE**

| Week | Mobile Team | Web Team | Status |
|------|-------------|----------|---------|
| **1** | Upload fix + Simple lyrics | Schema deployment | 🟢 Ready |
| **1** | Lyrics modal + Toggle | API endpoints | 🟢 Ready |
| **2** | Testing + Polish | Cross-platform testing | 🔄 Planned |
| **3** | Advanced lyrics (optional) | Performance optimization | 🔄 Future |

---

## 📞 **COORDINATION DETAILS**

### **Communication Channels**
- **Slack:** #lyrics-feature-implementation
- **Meetings:** Weekly sync (Mondays 10am)
- **Code Review:** GitHub PR reviews
- **Testing:** Shared test database

### **Success Metrics**
- **Upload Success Rate:** 99%+ (immediate goal)
- **Lyrics Adoption:** 60%+ of new uploads
- **User Engagement:** 70%+ enable lyrics
- **Performance:** <500ms lyrics load time

---

## ✅ **MOBILE TEAM COMMITMENTS**

**We WILL:**
1. ✅ **Implement lyrics feature** following web app design
2. ✅ **Update upload schema** for compatibility
3. ✅ **Test thoroughly** before deployment
4. ✅ **Maintain consistency** with web app UX
5. ✅ **Provide feedback** on API endpoints
6. ✅ **Coordinate releases** for feature parity

**We NEED from web team:**
1. 📋 **Immediate schema fix** for upload issues
2. 📋 **API endpoints** for lyrics (provided ✅)
3. 📋 **Code examples** for reference
4. 📋 **Testing support** for integration
5. 📋 **Performance monitoring** setup

---

## 🎉 **CONCLUSION**

**✅ APPROVED APPROACH:**
- **Immediate:** Minimal schema fix (Option 1)
- **Short-term:** Simple lyrics implementation
- **Long-term:** Advanced features coordination

**✅ TIMELINE CONFIRMED:**
- **Today:** Web app upload fix
- **This week:** Mobile lyrics implementation
- **Next week:** Testing and polish

**✅ COORDINATION READY:**
- Shared database schema
- Consistent UI/UX
- Coordinated development
- Regular sync meetings

---

**🚀 Let's fix the upload issue today and build an amazing lyrics feature together!**

**Status:** ✅ Ready to proceed  
**Next Action:** Web team applies schema fix  
**Timeline:** 24 hours for upload fix, 1 week for lyrics  
**Contact:** Mobile Team Lead available for immediate coordination

---

**Document Version:** 1.0  
**Status:** Awaiting Web Team Schema Fix  
**Next Review:** After upload fix deployment  
**Last Updated:** January 8, 2025
