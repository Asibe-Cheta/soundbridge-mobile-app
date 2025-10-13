# 🎵 Lyrics Feature Implementation Plan

**Date**: January 2025  
**Status**: Planning Phase  
**Priority**: Medium  
**Estimated Timeline**: 2-3 weeks  

## 📋 Overview

We're planning to implement a **lyrics display feature** for the music player across both **mobile app** and **web app**. This feature will allow users to view song lyrics while listening to music, with an optional highlighting system that syncs with the current playback position.

## 🎯 Goals

- **Consistent Experience**: Lyrics feature works identically on mobile and web
- **Shared Database**: Both platforms use the same database schema
- **Optional Display**: Users can toggle lyrics on/off
- **Creator Control**: Content creators can add lyrics during upload
- **Future-Ready**: Schema supports timestamped lyrics for advanced features

## 🗄️ Database Schema Changes

### Option 1: Simple Text Lyrics (Recommended for Phase 1)

```sql
-- Add lyrics column to existing audio_tracks table
ALTER TABLE audio_tracks ADD COLUMN lyrics TEXT;

-- Add index for better performance
CREATE INDEX idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
```

### Option 2: Advanced Timestamped Lyrics (Future Phase)

```sql
-- New table for timestamped lyrics (for future implementation)
CREATE TABLE track_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  start_time DECIMAL(10,3) NOT NULL, -- seconds
  end_time DECIMAL(10,3) NOT NULL,   -- seconds
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_track_lyrics_track_id ON track_lyrics(track_id);
CREATE INDEX idx_track_lyrics_timing ON track_lyrics(track_id, start_time);
```

## 📱 Mobile App Implementation

### Frontend Changes

#### 1. Upload Screen Updates
```typescript
// Add lyrics input field to upload form
<TextInput
  placeholder="Enter song lyrics (optional)"
  multiline
  numberOfLines={8}
  value={lyrics}
  onChangeText={setLyrics}
  style={styles.lyricsInput}
/>
```

#### 2. Music Player Updates
```typescript
// Add lyrics toggle button
<TouchableOpacity onPress={toggleLyrics}>
  <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
</TouchableOpacity>

// Lyrics display overlay
{showLyrics && (
  <View style={styles.lyricsOverlay}>
    <ScrollView style={styles.lyricsContainer}>
      {lyrics.split('\n').map((line, index) => (
        <Text key={index} style={styles.lyricsLine}>
          {line}
        </Text>
      ))}
    </ScrollView>
  </View>
)}
```

### API Integration
```typescript
// Update track upload to include lyrics
const uploadTrack = async (trackData: {
  title: string;
  lyrics?: string;
  // ... other fields
}) => {
  const { data, error } = await supabase
    .from('audio_tracks')
    .insert([{
      ...trackData,
      lyrics: trackData.lyrics || null
    }]);
};
```

## 🌐 Web App Implementation

### Frontend Changes

#### 1. Upload Form Updates
```html
<!-- Add lyrics textarea to upload form -->
<div class="form-group">
  <label for="lyrics">Song Lyrics (Optional)</label>
  <textarea 
    id="lyrics" 
    name="lyrics" 
    rows="8" 
    placeholder="Enter song lyrics..."
    class="form-control"
  ></textarea>
</div>
```

#### 2. Music Player Updates
```html
<!-- Add lyrics toggle button -->
<button id="lyricsToggle" class="player-control-btn">
  <i class="fas fa-music"></i>
</button>

<!-- Lyrics display overlay -->
<div id="lyricsOverlay" class="lyrics-overlay hidden">
  <div class="lyrics-container">
    <div class="lyrics-content" id="lyricsContent"></div>
  </div>
</div>
```

#### 3. JavaScript Implementation
```javascript
// Toggle lyrics display
document.getElementById('lyricsToggle').addEventListener('click', () => {
  const overlay = document.getElementById('lyricsOverlay');
  overlay.classList.toggle('hidden');
});

// Display lyrics
function displayLyrics(lyrics) {
  const container = document.getElementById('lyricsContent');
  const lines = lyrics.split('\n');
  container.innerHTML = lines.map(line => 
    `<div class="lyrics-line">${line}</div>`
  ).join('');
}
```

## 🎨 UI/UX Specifications

### Design Requirements

#### Mobile App
- **Toggle Button**: Musical notes icon in music player controls
- **Display**: Full-screen overlay with blurred background
- **Typography**: Clean, readable font (16-18px)
- **Colors**: White text on semi-transparent dark background
- **Animation**: Smooth fade in/out transitions

#### Web App
- **Toggle Button**: Music icon in player controls
- **Display**: Side panel or overlay (responsive)
- **Typography**: Consistent with web app design system
- **Colors**: Match web app theme
- **Animation**: Smooth slide/fade transitions

### Accessibility
- **Screen Reader**: Proper ARIA labels for lyrics content
- **Keyboard Navigation**: Tab support for lyrics toggle
- **High Contrast**: Ensure text readability
- **Font Size**: Respect user's font size preferences

## 🔄 API Endpoints

### New Endpoints (if needed)

```typescript
// Get lyrics for a track
GET /api/tracks/:id/lyrics
Response: { lyrics: string | null }

// Update lyrics for a track (creator only)
PUT /api/tracks/:id/lyrics
Body: { lyrics: string }
Response: { success: boolean }
```

## 📊 Data Migration

### Existing Tracks
```sql
-- Set all existing tracks to have NULL lyrics initially
UPDATE audio_tracks SET lyrics = NULL WHERE lyrics IS NULL;
```

## 🧪 Testing Requirements

### Mobile App Testing
- [ ] Lyrics display/hide toggle works
- [ ] Lyrics persist after app restart
- [ ] Upload form accepts lyrics input
- [ ] Lyrics display correctly in music player
- [ ] Performance impact is minimal

### Web App Testing
- [ ] Lyrics toggle works on all screen sizes
- [ ] Upload form saves lyrics correctly
- [ ] Lyrics display matches mobile experience
- [ ] Cross-browser compatibility
- [ ] Responsive design works

### Database Testing
- [ ] Lyrics column added successfully
- [ ] Data integrity maintained
- [ ] Performance impact measured
- [ ] Backup/restore works with new schema

## 🚀 Implementation Phases

### Phase 1: Basic Lyrics (Week 1)
- [ ] Add `lyrics` column to database
- [ ] Update upload forms (mobile + web)
- [ ] Add lyrics toggle to music players
- [ ] Basic lyrics display
- [ ] Testing and bug fixes

### Phase 2: Enhanced UI (Week 2)
- [ ] Improve lyrics display design
- [ ] Add animations and transitions
- [ ] Optimize performance
- [ ] Cross-platform testing
- [ ] User feedback collection

### Phase 3: Advanced Features (Future)
- [ ] Timestamped lyrics support
- [ ] AI-generated lyrics
- [ ] Creator editing tools
- [ ] Lyrics search functionality

## 🔒 Security Considerations

- **Input Validation**: Sanitize lyrics input to prevent XSS
- **Content Moderation**: Consider lyrics content filtering
- **Rate Limiting**: Prevent abuse of lyrics upload
- **Data Privacy**: Ensure lyrics are properly secured

## 📈 Success Metrics

- **Adoption Rate**: % of users who enable lyrics
- **Creator Participation**: % of creators who add lyrics
- **User Engagement**: Time spent with lyrics enabled
- **Performance Impact**: App load times with lyrics

## 🤝 Coordination Required

### Mobile Team Tasks
- [ ] Implement mobile UI components
- [ ] Update upload screen
- [ ] Add lyrics toggle to music player
- [ ] Test mobile-specific functionality

### Web Team Tasks
- [ ] Implement web UI components
- [ ] Update web upload form
- [ ] Add lyrics display to web player
- [ ] Ensure responsive design

### Backend Team Tasks
- [ ] Database schema changes
- [ ] API endpoint updates
- [ ] Data migration scripts
- [ ] Performance optimization

## 📞 Contact & Questions

**Mobile Team Lead**: [Your Name]  
**Web Team Lead**: [Web Team Contact]  
**Backend Team Lead**: [Backend Team Contact]  

**Slack Channel**: #lyrics-feature-implementation  
**Project Board**: [Link to project management tool]  

## 📝 Next Steps

1. **Review this plan** with all teams
2. **Schedule kickoff meeting** to discuss timeline
3. **Create development branches** for lyrics feature
4. **Begin Phase 1 implementation**
5. **Regular sync meetings** to ensure consistency

---

**Note**: This feature should be implemented with careful consideration of performance impact and user experience. Both platforms must maintain feature parity to ensure a consistent user experience across mobile and web.

**Last Updated**: January 2025  
**Document Version**: 1.0
