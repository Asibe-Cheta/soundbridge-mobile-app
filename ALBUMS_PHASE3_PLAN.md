# 🎵 Albums Feature - Phase 3 Implementation Plan
## Upload Flow - Detailed Design

---

## 📋 Overview

Phase 3 adds album upload functionality to `UploadScreen.tsx`. This includes:
- Mode selector (Single Track | Album)
- Album metadata form
- Multi-track selection and management
- Track reordering UI
- Tier validation with upgrade prompts

---

## 🎯 Design Decisions

### 1. **Two Upload Modes**
```
┌─────────────┬─────────────┐
│ Single Track│    Album    │  ← Toggle selector at top
└─────────────┴─────────────┘
```

**Single Track Mode:** (Existing flow - unchanged)
- Upload one audio file
- Add metadata (title, description, genre, etc.)
- Upload cover image
- Publish immediately or schedule

**Album Mode:** (New flow)
- Step 1: Album metadata (title, description, cover, release date)
- Step 2: Add tracks (multiple selection)
- Step 3: Reorder tracks (drag to reorder)
- Step 4: Review and publish/save draft

### 2. **Album Form Fields**

```typescript
interface AlbumFormData {
  // Album metadata
  albumTitle: string;
  albumDescription: string;
  albumGenre: string;
  albumCover: { uri: string; name: string; type: string } | null;
  releaseDate: Date | null;
  status: 'draft' | 'scheduled' | 'published';
  
  // Tracks
  tracks: AlbumTrack[];
}

interface AlbumTrack {
  id: string; // temp ID for UI
  trackNumber: number;
  title: string;
  audioFile: { uri: string; name: string; type: string; size: number };
  duration?: number; // calculated from audio file
  // Individual track metadata optional
  trackDescription?: string;
  lyrics?: string;
}
```

### 3. **User Flow Diagram**

```
Single Track Mode:
┌──────────────┐
│ Pick Audio   │
│ Add Metadata │
│ Upload Cover │
│    Upload    │
└──────────────┘

Album Mode:
┌──────────────────┐
│ Album Metadata   │ ← Title, description, genre, cover
├──────────────────┤
│ Add Tracks       │ ← Multi-select audio files
│ (1, 2, 3, ...)   │
├──────────────────┤
│ Reorder Tracks   │ ← Drag to rearrange
│ [=] Track 1      │
│ [=] Track 2      │
│ [=] Track 3      │
├──────────────────┤
│ Review & Publish │ ← Draft / Schedule / Publish
└──────────────────┘
```

---

## 🔧 Implementation Steps

### Step 1: Add State Management (Lines 58-78)

**Current state:**
```typescript
const [formData, setFormData] = useState<UploadFormData>({ ... });
```

**Add these states:**
```typescript
const [uploadMode, setUploadMode] = useState<'single' | 'album'>('single');
const [albumFormData, setAlbumFormData] = useState<AlbumFormData>({
  albumTitle: '',
  albumDescription: '',
  albumGenre: '',
  albumCover: null,
  releaseDate: null,
  status: 'draft',
  tracks: [],
});
const [albumStep, setAlbumStep] = useState<1 | 2 | 3 | 4>(1); // Multi-step form
const [isDraggingTracks, setIsDraggingTracks] = useState(false);
```

### Step 2: Add Album Validation

**Add after `validateUploadForm()` (around line 290):**
```typescript
const validateAlbumForm = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Step 1: Album metadata
  if (!albumFormData.albumTitle.trim()) {
    errors.push('Album title is required');
  }
  
  if (!albumFormData.albumCover) {
    errors.push('Album cover image is required');
  }
  
  // Step 2: Tracks
  if (albumFormData.tracks.length === 0) {
    errors.push('Please add at least one track to the album');
  }
  
  // Check tier limits
  if (uploadQuota) {
    const tier = uploadQuota.tier?.toLowerCase() || 'free';
    
    if (tier === 'free') {
      errors.push('Albums are only available for Premium and Unlimited users. Please upgrade!');
    } else if (tier === 'premium' && albumFormData.tracks.length > 7) {
      errors.push('Premium users can add up to 7 tracks per album. You have ' + albumFormData.tracks.length + ' tracks.');
    }
  }
  
  // Validate each track
  albumFormData.tracks.forEach((track, index) => {
    if (!track.title.trim()) {
      errors.push(`Track ${index + 1}: Title is required`);
    }
    if (!track.audioFile) {
      errors.push(`Track ${index + 1}: Audio file is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### Step 3: Add Album Upload Handler

**Add after `handleUpload()` (around line 520):**
```typescript
const handleAlbumUpload = async () => {
  // Validate
  const validation = validateAlbumForm();
  if (!validation.isValid) {
    Alert.alert('Validation Error', validation.errors.join('\n'));
    return;
  }
  
  if (!user || !session) {
    Alert.alert('Error', 'You must be logged in to upload albums.');
    return;
  }
  
  try {
    setIsUploading(true);
    setUploadProgress(0);
    
    console.log('🎵 Starting album upload...');
    
    // Check album limit
    const { data: limitCheck } = await dbHelpers.checkAlbumLimit(user.id);
    if (limitCheck && !limitCheck.canCreate) {
      const tier = limitCheck.tier || 'free';
      let message = '';
      if (tier === 'free') {
        message = 'Albums are only available for Premium and Unlimited users. Upgrade now to create albums!';
      } else if (tier === 'premium') {
        message = `You've reached your album limit (${limitCheck.limit} albums). Upgrade to Unlimited for unlimited albums!`;
      }
      
      Alert.alert(
        'Album Limit Reached',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: handleUpgradePress },
        ],
      );
      setIsUploading(false);
      return;
    }
    
    // Step 1: Upload album cover (10% progress)
    setUploadProgress(10);
    let albumCoverUrl = null;
    if (albumFormData.albumCover) {
      const imageUploadResult = await uploadImage(
        user.id, 
        albumFormData.albumCover, 
        'album-covers'
      );
      
      if (imageUploadResult.success) {
        albumCoverUrl = imageUploadResult.data?.url;
        console.log('✅ Album cover uploaded');
      } else {
        console.warn('Failed to upload album cover:', imageUploadResult.error);
      }
    }
    
    setUploadProgress(20);
    
    // Step 2: Create album in database
    const { data: album, error: albumError } = await dbHelpers.createAlbum({
      creator_id: user.id,
      title: albumFormData.albumTitle,
      description: albumFormData.albumDescription,
      genre: albumFormData.albumGenre,
      cover_image_url: albumCoverUrl,
      release_date: albumFormData.releaseDate?.toISOString().split('T')[0],
      status: albumFormData.status,
      is_public: true,
    });
    
    if (albumError || !album) {
      throw new Error('Failed to create album: ' + albumError?.message);
    }
    
    console.log('✅ Album created:', album.id);
    setUploadProgress(30);
    
    // Step 3: Upload tracks (60% progress split among tracks)
    const totalTracks = albumFormData.tracks.length;
    const progressPerTrack = 60 / totalTracks;
    
    for (let i = 0; i < albumFormData.tracks.length; i++) {
      const track = albumFormData.tracks[i];
      console.log(`🎵 Uploading track ${i + 1}/${totalTracks}...`);
      
      // Upload audio file
      const audioUploadResult = await uploadAudioFile(user.id, track.audioFile);
      if (!audioUploadResult.success) {
        throw new Error(`Failed to upload track ${i + 1}: ${audioUploadResult.error?.message}`);
      }
      
      // Create track record
      const trackData = {
        creator_id: user.id,
        title: track.title,
        description: track.trackDescription || '',
        genre: albumFormData.albumGenre, // Inherit from album
        audio_file_url: audioUploadResult.data?.url,
        duration: track.duration || 0,
        lyrics: track.lyrics || null,
        is_public: albumFormData.status === 'published',
        content_type: 'music' as const,
      };
      
      const trackResult = await createAudioTrack(trackData);
      if (!trackResult.success) {
        throw new Error(`Failed to create track ${i + 1}: ${trackResult.error?.message}`);
      }
      
      // Add track to album
      const { error: addTrackError } = await dbHelpers.addTrackToAlbum(
        album.id,
        trackResult.data!.id,
        track.trackNumber
      );
      
      if (addTrackError) {
        throw new Error(`Failed to add track ${i + 1} to album: ${addTrackError.message}`);
      }
      
      console.log(`✅ Track ${i + 1} uploaded and added to album`);
      setUploadProgress(30 + (i + 1) * progressPerTrack);
    }
    
    setUploadProgress(100);
    
    Alert.alert(
      'Success!',
      `Album "${albumFormData.albumTitle}" ${albumFormData.status === 'published' ? 'published' : 'saved as draft'} successfully!`,
      [
        {
          text: 'View Album',
          onPress: () => navigation.navigate('AlbumDetails', { albumId: album.id }),
        },
        { text: 'OK' },
      ]
    );
    
    // Reset form
    setAlbumFormData({
      albumTitle: '',
      albumDescription: '',
      albumGenre: '',
      albumCover: null,
      releaseDate: null,
      status: 'draft',
      tracks: [],
    });
    setAlbumStep(1);
    
    // Refresh quota
    loadUploadQuota();
    
  } catch (error) {
    console.error('Album upload failed:', error);
    Alert.alert('Upload Failed', error instanceof Error ? error.message : 'An unexpected error occurred.');
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};
```

### Step 4: Add Upload Mode Selector UI

**Add before `ContentTypeSelector()` (around line 521):**
```typescript
const UploadModeSelector = () => (
  <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upload Mode</Text>
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[
          styles.modeOption,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          uploadMode === 'single' && { 
            borderColor: theme.colors.primary, 
            borderWidth: 2,
            backgroundColor: theme.colors.primary + '10',
          }
        ]}
        onPress={() => setUploadMode('single')}
      >
        <Ionicons 
          name="musical-note" 
          size={32} 
          color={uploadMode === 'single' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.modeLabel, 
          { color: uploadMode === 'single' ? theme.colors.primary : theme.colors.text }
        ]}>
          Single Track
        </Text>
        <Text style={[styles.modeDescription, { color: theme.colors.textSecondary }]}>
          Upload one track
        </Text>
        {uploadMode === 'single' && (
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={theme.colors.primary} 
            style={styles.modeCheckmark} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.modeOption,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          uploadMode === 'album' && { 
            borderColor: theme.colors.primary, 
            borderWidth: 2,
            backgroundColor: theme.colors.primary + '10',
          }
        ]}
        onPress={() => {
          // Check if user can create albums
          if (uploadQuota && (uploadQuota.tier === 'free' || !uploadQuota.tier)) {
            Alert.alert(
              'Upgrade Required',
              'Albums are only available for Premium and Unlimited users. Upgrade now to create albums!',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'View Plans', onPress: handleUpgradePress },
              ]
            );
            return;
          }
          setUploadMode('album');
        }}
      >
        <Ionicons 
          name="albums" 
          size={32} 
          color={uploadMode === 'album' ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.modeLabel, 
          { color: uploadMode === 'album' ? theme.colors.primary : theme.colors.text }
        ]}>
          Album
        </Text>
        <Text style={[styles.modeDescription, { color: theme.colors.textSecondary }]}>
          Multiple tracks
        </Text>
        {uploadMode === 'album' && (
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={theme.colors.primary} 
            style={styles.modeCheckmark} 
          />
        )}
        {(uploadQuota?.tier === 'free' || !uploadQuota?.tier) && (
          <View style={[styles.upgradeBadge, { backgroundColor: theme.colors.warning }]}>
            <Text style={styles.upgradeBadgeText}>PRO</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  </View>
);
```

### Step 5: Add Album Form Components

This is quite extensive. I'll provide the key components:

**Album Metadata Form:**
**Track Manager:**
**Track Reorder UI:**
**(See full implementation in actual code)**

---

## 🎨 UI Components Structure

```
UploadScreen
├── UploadModeSelector (NEW)
│   ├── Single Track (existing)
│   └── Album (new, requires Premium+)
│
├── [Single Mode] (existing)
│   ├── ContentTypeSelector
│   ├── BasicInfoSection
│   ├── FileUploads
│   └── SubmitButton
│
└── [Album Mode] (NEW)
    ├── AlbumStep1: Metadata
    │   ├── Album Title
    │   ├── Description
    │   ├── Genre
    │   ├── Cover Image
    │   └── Release Date
    │
    ├── AlbumStep2: Add Tracks
    │   ├── Track List
    │   ├── Add Track Button
    │   └── Remove Track Buttons
    │
    ├── AlbumStep3: Reorder
    │   └── Draggable Track List
    │
    └── AlbumStep4: Review & Publish
        ├── Summary
        ├── Status Selector (Draft/Scheduled/Publish)
        └── Submit Button
```

---

## 📦 Required Packages (Already Installed)

- ✅ `expo-image-picker` - For album covers
- ✅ `expo-document-picker` - For audio files
- ✅ `@react-native-community/datetimepicker` - For release date
- ⚠️ `react-native-draggable-flatlist` - **NEW** (for track reordering)

**Install command:**
```bash
npx expo install react-native-draggable-flatlist react-native-gesture-handler react-native-reanimated
```

---

## 🚦 Validation Rules

### Album Creation:
- **Free users:** Cannot create albums (show upgrade prompt)
- **Premium users:** Max 2 published albums (drafts don't count)
- **Unlimited users:** Unlimited albums

### Tracks per Album:
- **Premium:** Max 7 tracks per album
- **Unlimited:** Unlimited tracks

### Upload Quotas:
- Tracks added to albums count toward monthly upload quota
- Example: Premium has 7 uploads/month
  - Upload album with 5 tracks = 5 uploads used
  - 2 uploads remaining this month

---

## 🎯 User Experience Improvements

### Upgrade Prompts:
- Show tier comparison when Free user tries to create album
- Show "Upgrade to Unlimited" when Premium user hits limit
- Clear messaging about what each tier includes

### Progress Indicators:
- Step indicators (1/4, 2/4, 3/4, 4/4) for album mode
- Upload progress bar shows:
  - Album cover upload: 10%
  - Album creation: 20%
  - Track uploads: 30-90% (split among tracks)
  - Finalization: 100%

### Error Handling:
- If one track fails, show which track and allow retry
- Option to save as draft if upload fails
- Don't lose user's work on errors

---

## 📝 Next Steps

This plan provides the structure. The actual implementation will:
1. Add all necessary states
2. Implement validation functions
3. Create UI components
4. Add upload handlers
5. Style everything to match existing design
6. Test with all tier types

**Ready to implement? This will be a large file update (~500-800 lines added).**

