# 🎵 Mobile Team: Lyrics Feature Implementation Guide

## 📋 Overview
The lyrics feature has been successfully implemented on the web platform. This guide provides all technical details needed for mobile implementation, including API endpoints, data schema, and implementation patterns.

## 🗄️ Database Schema

### Audio Tracks Table Updates
```sql
-- Essential columns for lyrics functionality
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS lyrics TEXT;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS has_lyrics BOOLEAN DEFAULT FALSE;
```

### Database Indexes
```sql
-- Performance optimization for lyrics queries
CREATE INDEX IF NOT EXISTS idx_audio_tracks_has_lyrics ON audio_tracks(has_lyrics);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics_language ON audio_tracks(lyrics_language);
```

## 🔌 API Endpoints

### 1. Upload API - Include Lyrics
**Endpoint:** `POST /api/upload`

**Request Body:**
```typescript
{
  // ... existing upload fields
  lyrics?: string;           // Plain text lyrics
  lyricsLanguage?: string;   // Language code (e.g., 'en', 'es', 'fr')
}
```

**Response:** Standard upload response with track ID

### 2. Track Data API - Fetch Full Track Info
**Endpoint:** `GET /api/debug/track-data?trackId={trackId}`

**Response:**
```typescript
{
  success: boolean;
  track: {
    id: string;
    title: string;
    lyrics: string | null;
    lyrics_language: string | null;
    has_lyrics: boolean;
    // ... other track fields
  }
}
```

### 3. Recent/Trending Tracks API - Include Lyrics
**Endpoint:** `GET /api/audio/recent` or `GET /api/audio/trending`

**Response:**
```typescript
{
  success: boolean;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    lyrics?: string;
    lyricsLanguage?: string;
    hasLyrics?: boolean;
    // ... other track fields
  }>
}
```

## 📱 Mobile Implementation Patterns

### 1. Audio Track Data Model
```typescript
interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artwork?: string;
  url: string;
  liked: boolean;
  
  // Lyrics fields
  lyrics?: string;
  lyricsLanguage?: string;
  hasLyrics?: boolean;
}
```

### 2. Lyrics Display Component Structure
```typescript
// Core lyrics display logic
interface LyricsDisplayProps {
  lyrics: string;
  currentTime?: number;
  language?: string;
  onClose?: () => void;
}

// Implementation pattern:
// 1. Split lyrics by newlines: lyrics.split('\n')
// 2. Display each line as separate text element
// 3. Add scroll functionality for long lyrics
// 4. Include language indicator
// 5. Add line count display
```

### 3. Audio Player Integration
```typescript
// Key integration points:
interface AudioPlayerState {
  currentTrack?: AudioTrack;
  showLyrics: boolean;
  isExpanded: boolean;
}

// Toggle lyrics display
const toggleLyrics = () => {
  setShowLyrics(!showLyrics);
  if (!showLyrics) {
    setIsExpanded(true); // Auto-expand when showing lyrics
  }
};
```

## 🔄 Lyrics Recovery Mechanism

### Problem Solved
The web implementation faced an issue where lyrics data wasn't consistently available due to:
- API response caching
- State synchronization issues
- Initial load timing problems

### Solution: Automatic Recovery
```typescript
// Implementation pattern for mobile
const recoverLyrics = async (trackId: string) => {
  if (!currentTrack?.lyrics) {
    try {
      const response = await fetch(`/api/debug/track-data?trackId=${trackId}`);
      const data = await response.json();
      
      if (data.success && data.track?.lyrics) {
        // Update current track with lyrics
        updateCurrentTrack({
          ...currentTrack,
          lyrics: data.track.lyrics,
          lyricsLanguage: data.track.lyrics_language
        });
      }
    } catch (error) {
      console.error('Lyrics recovery failed:', error);
    }
  }
};
```

## 🎨 UI/UX Implementation Guidelines

### 1. Mini Player
- **NO lyrics display** on mini player
- **Lyrics button** (T icon) should **auto-expand** to full player
- Button should be visible only when `hasLyrics: true`

### 2. Expanded Player
- **Two-screen layout** when lyrics are shown:
  - **Left side**: Album art, track info, controls
  - **Right side**: Lyrics panel with glass morphism effect
- **Smooth animations** for layout transitions
- **Scroll functionality** for long lyrics

### 3. Lyrics Panel Features
- **Language indicator**: "Language: en"
- **Line count**: "15 lines"
- **Close button** (X icon)
- **Auto-scroll** to current lyric line (optional)
- **Staggered animations** for lyric lines

## 🔧 Technical Implementation Details

### 1. State Management
```typescript
// Key state variables
const [showLyrics, setShowLyrics] = useState(false);
const [showInlineLyrics, setShowInlineLyrics] = useState(false);
const [isExpanded, setIsExpanded] = useState(false);

// Lyrics data storage
const lyricsRef = useRef<string | undefined>(undefined);
const isRecoveringLyrics = useRef(false);
```

### 2. Data Flow
```
1. Track loads → Check if lyrics exist
2. If no lyrics → Trigger recovery mechanism
3. Store lyrics in both state and ref
4. Display lyrics using fallback: currentTrack.lyrics || lyricsRef.current
```

### 3. Performance Optimizations
- **Lazy load** lyrics only when needed
- **Cache** lyrics data in local storage
- **Debounce** lyrics recovery calls
- **Use refs** to avoid unnecessary re-renders

## 🚨 Critical Implementation Notes

### 1. Prevent Infinite Loops
```typescript
// Use recovery flag to prevent recursive calls
const isRecoveringLyrics = useRef(false);

if (!currentTrack?.lyrics && !isRecoveringLyrics.current) {
  isRecoveringLyrics.current = true;
  // ... recover lyrics
  setTimeout(() => {
    isRecoveringLyrics.current = false;
  }, 1000);
}
```

### 2. Fallback Display Logic
```typescript
// Always use fallback for lyrics display
const displayLyrics = currentTrack?.lyrics || lyricsRef.current || '';

// Check for lyrics existence
const hasLyrics = !!(currentTrack?.lyrics || lyricsRef.current);
```

### 3. API Response Handling
```typescript
// Ensure lyrics are included in API responses
const fetchTracks = async () => {
  const response = await fetch('/api/audio/recent?cache=' + Date.now());
  const data = await response.json();
  
  // Verify lyrics data is present
  data.tracks.forEach(track => {
    if (track.lyrics) {
      console.log(`Track ${track.title} has lyrics: ${track.lyrics.length} characters`);
    }
  });
  
  return data;
};
```

## 📝 Testing Checklist

### ✅ Core Functionality
- [ ] Upload track with lyrics
- [ ] Display lyrics in expanded player
- [ ] Toggle lyrics on/off
- [ ] Auto-expand when lyrics button clicked on mini player
- [ ] Lyrics recovery when initially missing

### ✅ Edge Cases
- [ ] Track without lyrics (no lyrics button)
- [ ] Long lyrics (scroll functionality)
- [ ] Network issues during recovery
- [ ] Multiple language support
- [ ] Memory management for large lyrics

### ✅ Performance
- [ ] Smooth animations
- [ ] No memory leaks
- [ ] Fast lyrics loading
- [ ] Efficient re-renders

## 🔗 Related Files (Web Implementation)

### Key Components
- `GlobalAudioPlayer.tsx` - Main audio player with lyrics integration
- `SimpleLyricsPanel.tsx` - Lyrics display component
- `AudioPlayerContext.tsx` - State management for audio playback

### API Endpoints
- `apps/web/app/api/upload/route.ts` - Upload with lyrics support
- `apps/web/app/api/debug/track-data/route.ts` - Debug endpoint for lyrics recovery
- `apps/web/app/api/audio/recent/route.ts` - Recent tracks with lyrics

### Database Files
- `COMPLETE_UPLOAD_FIX.sql` - Complete schema with lyrics columns
- `SIMPLE_UPLOAD_FIX.sql` - Minimal lyrics schema

## 🎯 Success Metrics

### User Experience
- ✅ Lyrics display consistently after page refresh
- ✅ Smooth animations and transitions
- ✅ No performance impact on audio playback
- ✅ Intuitive lyrics toggle functionality

### Technical
- ✅ Zero infinite loops or recursive calls
- ✅ Proper state synchronization
- ✅ Efficient memory usage
- ✅ Robust error handling

## 📞 Support & Questions

For any implementation questions or clarifications, please refer to:
- Web implementation code in `apps/web/src/components/audio/`
- API documentation in `apps/web/app/api/`
- Database schema files in project root

The lyrics feature is now fully functional on web and ready for mobile implementation! 🎵✨
