# Upload Verification Implementation Plan - Mobile App

**Date:** January 1, 2026
**Priority:** High
**Estimated Time:** 1-2 days

---

## Executive Summary

Based on the web team's documentation, we will implement:
1. ✅ **Mandatory copyright checkbox** (Phase 1 - matches web)
2. ✅ **Database storage for attestations** (Phase 2 - improves upon web)
3. ✅ **Audit trail** (Phase 2 - legal protection)

**Key Decision:** We will implement **both phases together** to provide proper legal protection from day one, rather than matching the web app's current limitation of not storing attestation data.

---

## Phase 1: UI Implementation (Mobile App)

### 1. Update Upload Screen

**File to modify:** `src/screens/UploadScreen.tsx` (or wherever upload form is)

**Add checkbox state:**
```typescript
const [agreedToCopyright, setAgreedToCopyright] = useState(false);
```

**Add checkbox UI:**
```tsx
{/* Copyright Agreement Section */}
<View style={styles.copyrightSection}>
  <View style={styles.copyrightHeader}>
    <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
    <Text style={styles.copyrightHeaderText}>Copyright Agreement</Text>
  </View>

  <View style={styles.copyrightBox}>
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => setAgreedToCopyright(!agreedToCopyright)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox,
        agreedToCopyright && styles.checkboxChecked
      ]}>
        {agreedToCopyright && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </View>
      <Text style={styles.copyrightText}>
        I confirm that I own all rights to this music and it does not infringe any
        third-party copyrights. I understand that uploading copyrighted content may
        result in account suspension or termination.{' '}
        <Text
          style={styles.copyrightLink}
          onPress={() => navigation.navigate('CopyrightPolicy')}
        >
          Read our Copyright Policy
        </Text>
      </Text>
    </TouchableOpacity>
  </View>

  {!agreedToCopyright && showError && (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={16} color="#EF4444" />
      <Text style={styles.errorText}>
        You must agree to the copyright terms to upload content.
      </Text>
    </View>
  )}
</View>
```

**Update upload button:**
```tsx
<TouchableOpacity
  style={[
    styles.uploadButton,
    (!agreedToCopyright || isUploading) && styles.uploadButtonDisabled
  ]}
  onPress={handleUpload}
  disabled={!agreedToCopyright || isUploading}
>
  <Text style={styles.uploadButtonText}>
    {isUploading ? 'Uploading...' : 'Publish Track'}
  </Text>
</TouchableOpacity>
```

**Add validation:**
```typescript
const validateForm = () => {
  if (!title.trim()) {
    Alert.alert('Error', 'Track title is required');
    return false;
  }
  if (!audioFile) {
    Alert.alert('Error', 'Audio file is required');
    return false;
  }
  if (!agreedToCopyright) {
    setShowError(true);
    Alert.alert('Error', 'You must agree to the copyright terms to upload content');
    return false;
  }
  return true;
};
```

---

## Phase 2: Database Implementation

### SQL Migration File

Create: `UPLOAD_ATTESTATION_MIGRATION.sql`

```sql
-- ============================================================================
-- Upload Verification & Copyright Attestation Migration
-- ============================================================================
-- Purpose: Add database storage for copyright attestations and audit trail
-- Created: January 1, 2026
-- Author: Mobile Development Team
-- ============================================================================

-- 1. Add columns to audio_tracks table for attestation
-- ============================================================================

ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS copyright_attested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attestation_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attestation_ip INET,
ADD COLUMN IF NOT EXISTS attestation_user_agent TEXT,
ADD COLUMN IF NOT EXISTS attestation_device_info JSONB,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50) DEFAULT 'v1.0.0';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_copyright_attested
ON audio_tracks(copyright_attested);

CREATE INDEX IF NOT EXISTS idx_audio_tracks_attestation_timestamp
ON audio_tracks(attestation_timestamp);

COMMENT ON COLUMN audio_tracks.copyright_attested IS 'Whether the user attested to owning copyright';
COMMENT ON COLUMN audio_tracks.attestation_timestamp IS 'When the user agreed to copyright terms';
COMMENT ON COLUMN audio_tracks.attestation_ip IS 'IP address when attestation was made';
COMMENT ON COLUMN audio_tracks.attestation_user_agent IS 'User agent string when attestation was made';
COMMENT ON COLUMN audio_tracks.attestation_device_info IS 'Device information (platform, OS, app version)';
COMMENT ON COLUMN audio_tracks.terms_version IS 'Version of copyright terms user agreed to';

-- ============================================================================
-- 2. Create upload_attestations table for detailed audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_attestations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Attestation details
    copyright_attested BOOLEAN NOT NULL DEFAULT true,
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- IP and device information
    ip_address INET,
    user_agent TEXT,
    device_platform VARCHAR(50), -- 'ios', 'android', 'web'
    device_os VARCHAR(100),      -- 'iOS 17.0', 'Android 14'
    app_version VARCHAR(50),     -- '1.0.0'
    device_model VARCHAR(100),   -- 'iPhone 15 Pro', 'Pixel 8'

    -- Terms information
    terms_version VARCHAR(50) DEFAULT 'v1.0.0',
    terms_url TEXT,

    -- Optional: Rights verification details (from web's optional form)
    is_original_content BOOLEAN,
    owns_rights BOOLEAN,
    has_exclusive_deals BOOLEAN,
    is_on_other_platforms BOOLEAN,
    platforms JSONB,             -- Array of platform names
    has_samples BOOLEAN,
    sample_info JSONB,           -- { isLicensed: boolean, licenseDetails: string }

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for upload_attestations
CREATE INDEX IF NOT EXISTS idx_upload_attestations_track_id
ON upload_attestations(track_id);

CREATE INDEX IF NOT EXISTS idx_upload_attestations_user_id
ON upload_attestations(user_id);

CREATE INDEX IF NOT EXISTS idx_upload_attestations_agreed_at
ON upload_attestations(agreed_at);

CREATE INDEX IF NOT EXISTS idx_upload_attestations_ip_address
ON upload_attestations(ip_address);

-- Comments
COMMENT ON TABLE upload_attestations IS 'Audit trail of copyright attestations for uploaded tracks';
COMMENT ON COLUMN upload_attestations.copyright_attested IS 'Whether user attested to owning copyright';
COMMENT ON COLUMN upload_attestations.agreed_at IS 'Timestamp when user agreed to terms';
COMMENT ON COLUMN upload_attestations.ip_address IS 'IP address of the device making the attestation';
COMMENT ON COLUMN upload_attestations.device_platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN upload_attestations.terms_version IS 'Version of copyright terms user agreed to';

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE upload_attestations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own attestations
CREATE POLICY "Users can view own attestations"
ON upload_attestations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert attestations
CREATE POLICY "Service role can insert attestations"
ON upload_attestations
FOR INSERT
WITH CHECK (true); -- Service role bypasses this anyway, but explicit for clarity

-- Policy: No one can update attestations (immutable audit trail)
CREATE POLICY "Attestations are immutable"
ON upload_attestations
FOR UPDATE
USING (false);

-- Policy: No one can delete attestations (immutable audit trail)
CREATE POLICY "Attestations cannot be deleted"
ON upload_attestations
FOR DELETE
USING (false);

-- ============================================================================
-- 4. Create function to record attestation
-- ============================================================================

CREATE OR REPLACE FUNCTION record_upload_attestation(
    p_track_id UUID,
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_device_platform VARCHAR,
    p_device_os VARCHAR,
    p_app_version VARCHAR,
    p_device_model VARCHAR DEFAULT NULL,
    p_terms_version VARCHAR DEFAULT 'v1.0.0'
)
RETURNS UUID AS $$
DECLARE
    v_attestation_id UUID;
BEGIN
    -- Insert into upload_attestations table
    INSERT INTO upload_attestations (
        track_id,
        user_id,
        copyright_attested,
        agreed_at,
        ip_address,
        user_agent,
        device_platform,
        device_os,
        app_version,
        device_model,
        terms_version
    ) VALUES (
        p_track_id,
        p_user_id,
        true,
        NOW(),
        p_ip_address,
        p_user_agent,
        p_device_platform,
        p_device_os,
        p_app_version,
        p_device_model,
        p_terms_version
    )
    RETURNING id INTO v_attestation_id;

    -- Update audio_tracks table with attestation info
    UPDATE audio_tracks
    SET
        copyright_attested = true,
        attestation_timestamp = NOW(),
        attestation_ip = p_ip_address,
        attestation_user_agent = p_user_agent,
        attestation_device_info = jsonb_build_object(
            'platform', p_device_platform,
            'os', p_device_os,
            'appVersion', p_app_version,
            'model', p_device_model
        ),
        terms_version = p_terms_version
    WHERE id = p_track_id;

    RETURN v_attestation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_upload_attestation IS 'Records copyright attestation for a track upload';

-- ============================================================================
-- 5. Create function to get attestation history for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_attestation_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    attestation_id UUID,
    track_id UUID,
    track_title VARCHAR,
    attested_at TIMESTAMPTZ,
    ip_address INET,
    device_platform VARCHAR,
    terms_version VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ua.id AS attestation_id,
        ua.track_id,
        at.title AS track_title,
        ua.agreed_at AS attested_at,
        ua.ip_address,
        ua.device_platform,
        ua.terms_version
    FROM upload_attestations ua
    JOIN audio_tracks at ON ua.track_id = at.id
    WHERE ua.user_id = p_user_id
    ORDER BY ua.agreed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_attestation_history IS 'Retrieves attestation history for a specific user';

-- ============================================================================
-- 6. Admin view for attestation monitoring
-- ============================================================================

CREATE OR REPLACE VIEW admin_attestation_summary AS
SELECT
    DATE(agreed_at) AS attestation_date,
    device_platform,
    COUNT(*) AS total_attestations,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT ip_address) AS unique_ips
FROM upload_attestations
GROUP BY DATE(agreed_at), device_platform
ORDER BY attestation_date DESC, device_platform;

COMMENT ON VIEW admin_attestation_summary IS 'Daily summary of attestations by platform for admin monitoring';

-- ============================================================================
-- 7. Verification queries
-- ============================================================================

-- Verify columns added to audio_tracks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name IN (
    'copyright_attested',
    'attestation_timestamp',
    'attestation_ip',
    'attestation_user_agent',
    'attestation_device_info',
    'terms_version'
);
-- Expected: 6 rows

-- Verify upload_attestations table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'upload_attestations';
-- Expected: 1 row

-- Verify indexes created
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('audio_tracks', 'upload_attestations')
AND indexname LIKE '%attestation%';
-- Expected: 5+ indexes

-- Verify RLS policies
SELECT policyname, tablename
FROM pg_policies
WHERE tablename = 'upload_attestations';
-- Expected: 4 policies

-- Verify functions created
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'record_upload_attestation',
    'get_user_attestation_history'
);
-- Expected: 2 functions

-- ============================================================================
-- Migration complete!
-- ============================================================================
```

---

## Phase 3: Mobile App Integration

### 1. Update Supabase Helper Functions

**File:** `src/lib/supabase.ts` or `src/services/uploadService.ts`

Add function to create track with attestation:

```typescript
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface UploadAttestationData {
  copyrightAttested: boolean;
  agreedAt: string;
  ipAddress?: string; // Will be captured by backend
  userAgent: string;
  devicePlatform: 'ios' | 'android';
  deviceOS: string;
  appVersion: string;
  deviceModel?: string;
  termsVersion: string;
}

export const uploadTrackWithAttestation = async (
  trackData: {
    title: string;
    artistName: string;
    genre?: string;
    description?: string;
    audioFileUrl: string;
    coverArtUrl?: string;
    duration?: number;
  },
  attestation: UploadAttestationData
) => {
  try {
    // 1. Create the track record
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .insert({
        title: trackData.title,
        artist_name: trackData.artistName,
        genre: trackData.genre,
        description: trackData.description,
        file_url: trackData.audioFileUrl,
        cover_art_url: trackData.coverArtUrl,
        duration: trackData.duration,
        creator_id: (await supabase.auth.getUser()).data.user?.id,
        // Attestation fields
        copyright_attested: attestation.copyrightAttested,
        attestation_timestamp: attestation.agreedAt,
        attestation_user_agent: attestation.userAgent,
        attestation_device_info: {
          platform: attestation.devicePlatform,
          os: attestation.deviceOS,
          appVersion: attestation.appVersion,
          model: attestation.deviceModel,
        },
        terms_version: attestation.termsVersion,
      })
      .select()
      .single();

    if (trackError) throw trackError;

    // 2. Record attestation in audit trail (using RPC function)
    const { data: attestationData, error: attestationError } = await supabase.rpc(
      'record_upload_attestation',
      {
        p_track_id: track.id,
        p_user_id: track.creator_id,
        p_ip_address: null, // Backend will capture this
        p_user_agent: attestation.userAgent,
        p_device_platform: attestation.devicePlatform,
        p_device_os: attestation.deviceOS,
        p_app_version: attestation.appVersion,
        p_device_model: attestation.deviceModel || null,
        p_terms_version: attestation.termsVersion,
      }
    );

    if (attestationError) {
      console.warn('Attestation recording failed:', attestationError);
      // Don't fail the upload, but log the warning
    }

    return { data: track, error: null };
  } catch (error: any) {
    console.error('Upload with attestation failed:', error);
    return { data: null, error };
  }
};

// Helper function to collect device information
export const collectDeviceInfo = (): UploadAttestationData => {
  const platform = Platform.OS as 'ios' | 'android';
  const osVersion = Platform.Version;
  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const deviceModel = Device.modelName || Device.deviceName || 'Unknown';

  return {
    copyrightAttested: true,
    agreedAt: new Date().toISOString(),
    userAgent: `SoundBridge/${appVersion} (${platform}; ${deviceModel})`,
    devicePlatform: platform,
    deviceOS: `${platform === 'ios' ? 'iOS' : 'Android'} ${osVersion}`,
    appVersion,
    deviceModel,
    termsVersion: 'v1.0.0',
  };
};
```

### 2. Update Upload Screen to Use New Function

**File:** `src/screens/UploadScreen.tsx`

```typescript
const handleUpload = async () => {
  // Validate form
  if (!validateForm()) {
    return;
  }

  try {
    setIsUploading(true);

    // 1. Upload audio file to Supabase storage (existing code)
    const audioFileUrl = await uploadAudioFile(audioFile);

    // 2. Upload cover art if provided (existing code)
    const coverArtUrl = coverArt ? await uploadCoverArt(coverArt) : null;

    // 3. Collect device information for attestation
    const attestationData = collectDeviceInfo();

    // 4. Create track with attestation
    const { data: track, error } = await uploadTrackWithAttestation(
      {
        title,
        artistName,
        genre,
        description,
        audioFileUrl,
        coverArtUrl,
        duration,
      },
      attestationData
    );

    if (error) throw error;

    // Success!
    Alert.alert('Success', 'Track uploaded successfully!');
    navigation.goBack();
  } catch (error: any) {
    console.error('Upload failed:', error);
    Alert.alert('Error', error.message || 'Failed to upload track');
  } finally {
    setIsUploading(false);
  }
};
```

---

## Phase 4: Styling

**Add to your stylesheet:**

```typescript
const styles = StyleSheet.create({
  copyrightSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  copyrightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  copyrightHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  copyrightBox: {
    backgroundColor: theme.colors.primary + '10', // Light blue tint
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  copyrightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  copyrightLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

---

## Implementation Checklist

### Database (Run SQL migration)
- [ ] Run UPLOAD_ATTESTATION_MIGRATION.sql on production database
- [ ] Verify all columns added to audio_tracks table
- [ ] Verify upload_attestations table created
- [ ] Verify RLS policies applied
- [ ] Verify functions created
- [ ] Test RPC function: `record_upload_attestation()`

### Mobile App
- [ ] Install dependencies: `expo-device`, `expo-application` (if not already installed)
- [ ] Update UploadScreen.tsx with copyright checkbox UI
- [ ] Add validation logic
- [ ] Update upload button disabled state
- [ ] Create `collectDeviceInfo()` helper function
- [ ] Create `uploadTrackWithAttestation()` function in supabase.ts
- [ ] Update `handleUpload()` to use new function
- [ ] Add styling for checkbox and error states
- [ ] Create CopyrightPolicy screen (if doesn't exist)
- [ ] Add navigation route for CopyrightPolicy

### Testing
- [ ] Test checkbox toggle
- [ ] Test upload button disabled state
- [ ] Test validation (try upload without checking)
- [ ] Test error message display
- [ ] Test successful upload with attestation
- [ ] Verify attestation stored in database
- [ ] Verify attestation audit trail created
- [ ] Test on iOS
- [ ] Test on Android

### Legal
- [ ] Create copyright policy page content
- [ ] Review checkbox text with legal (if needed)
- [ ] Determine terms version number

---

## Timeline

**Day 1:**
- Run SQL migration
- Implement UI (checkbox)
- Add validation

**Day 2:**
- Implement attestation collection
- Update upload function
- Testing

---

## Next Steps

1. Review this plan
2. Run the SQL migration on your database
3. Implement the mobile UI changes
4. Test thoroughly
5. Deploy to production

Let me know if you have any questions or need clarification on any part!
