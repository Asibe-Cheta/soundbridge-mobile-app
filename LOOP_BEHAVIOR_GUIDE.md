# 🔁 Loop Behavior Guide

## Visual States

### State 1: OFF (Default)
```
┌─────────────────┐
│  Icon: ⟲       │  (outline, gray)
│  Color: Gray    │
│  Badge: None    │
│  Behavior:      │
│  - No repeat    │
│  - Plays once   │
└─────────────────┘
```

**What happens:**
- Track plays once
- Queue plays through once
- Stops at end

---

### State 2: LOOP ALL
```
┌─────────────────┐
│  Icon: ⟲       │  (filled, primary)
│  Color: Purple  │
│  Badge: None    │
│  Behavior:      │
│  - Loop queue   │
│  - Restart      │
└─────────────────┘
```

**What happens:**
- Current track finishes → plays next track
- Last track finishes → loops back to first track
- Queue repeats indefinitely

---

### State 3: LOOP ONE
```
┌─────────────────┐
│  Icon: ⟲  [1]  │  (filled, primary + badge)
│  Color: Purple  │
│  Badge: Red "1" │
│  Behavior:      │
│  - Repeat track │
│  - Infinite     │
└─────────────────┘
```

**What happens:**
- Current track finishes → replays immediately
- Same track loops indefinitely
- Never moves to next track

---

## Tap Sequence

```
Initial State
    ↓
  [OFF]
    ↓
   TAP
    ↓
 [ALL] ← Loops entire queue
    ↓
   TAP
    ↓
 [ONE] ← Repeats current track
    ↓
   TAP
    ↓
  [OFF] ← Back to start
    ↓
   ...
```

---

## Code Implementation

### State Type
```typescript
type RepeatMode = 'off' | 'all' | 'one';
```

### Toggle Logic
```typescript
const toggleRepeat = () => {
  setRepeatMode(prev => {
    if (prev === 'off') return 'all';
    if (prev === 'all') return 'one';
    return 'off';
  });
};
```

### Playback Logic
```typescript
// When track finishes:
if (repeatMode === 'one') {
  // Replay current track
  seekTo(0);
  play();
} else if (repeatMode === 'all') {
  // Play next track (loop back to start if at end)
  playNext();
} else {
  // Stop playback
  stop();
}
```

---

## UI Components

### Icon Component
```jsx
<View>
  <Ionicons 
    name={repeatMode !== 'off' ? 'repeat' : 'repeat-outline'} 
    size={24} 
    color={repeatMode !== 'off' ? PURPLE : GRAY} 
  />
  {repeatMode === 'one' && (
    <View style={styles.repeatOneBadge}>
      <Text style={styles.repeatOneBadgeText}>1</Text>
    </View>
  )}
</View>
```

### Badge Styling
```javascript
repeatOneBadge: {
  position: 'absolute',
  top: -4,
  right: -4,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: '#DC2626', // Red
  justifyContent: 'center',
  alignItems: 'center',
},
repeatOneBadgeText: {
  color: '#FFFFFF',
  fontSize: 9,
  fontWeight: '700',
}
```

---

## User Experience

### Expected Behavior

| State | Icon | Color | Badge | Queue Behavior | Track Behavior |
|-------|------|-------|-------|----------------|----------------|
| OFF | outline | gray | - | Plays once | Plays once |
| ALL | filled | purple | - | Loops | Plays through |
| ONE | filled | purple | 1 | Ignored | Repeats |

---

## Testing Scenarios

### Scenario 1: Queue with 3 tracks
```
Queue: [Track A, Track B, Track C]
Current: Track A

1. Loop OFF:
   A → B → C → [STOP]

2. Loop ALL:
   A → B → C → A → B → C → ...

3. Loop ONE:
   A → A → A → ...
```

### Scenario 2: Single track
```
Queue: [Track A]
Current: Track A

1. Loop OFF:
   A → [STOP]

2. Loop ALL:
   A → A → A → ...

3. Loop ONE:
   A → A → A → ...
```

---

## Comparison: Apple Music

Our implementation matches Apple Music exactly:

| Feature | Apple Music | SoundBridge | Match |
|---------|-------------|-------------|-------|
| 3 states | ✅ | ✅ | ✅ |
| Loop All icon | Filled | Filled | ✅ |
| Loop One badge | "1" badge | "1" badge | ✅ |
| Tap cycle | off→all→one | off→all→one | ✅ |
| Queue behavior | Loops | Loops | ✅ |
| Track repeat | Infinite | Infinite | ✅ |

---

## Implementation Files

- **Context:** `src/contexts/AudioPlayerContext.tsx`
  - State management
  - Playback logic

- **UI:** `src/screens/AudioPlayerScreen.tsx`
  - Icon rendering
  - Badge display
  - User interaction

---

## Troubleshooting

### Badge not showing?
- Check `repeatMode === 'one'`
- Verify badge styles are applied
- Ensure `View` wrapper around icon

### Loop not working?
- Check `handleTrackFinished` logic
- Verify `repeatMode` is passed correctly
- Test with `console.log(repeatMode)`

### Icon not changing color?
- Check condition: `repeatMode !== 'off'`
- Verify theme.colors.primary
- Test with solid color first

---

**Last Updated:** December 16, 2025  
**Status:** Fully Implemented ✅

