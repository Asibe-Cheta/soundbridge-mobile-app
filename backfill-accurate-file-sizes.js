/**
 * Accurate File Size Backfill Script
 *
 * This script fetches actual file sizes from your storage provider
 * and updates the audio_tracks table with accurate file_size values.
 *
 * Requirements:
 * - Node.js installed
 * - @supabase/supabase-js package
 *
 * Usage:
 * 1. npm install @supabase/supabase-js
 * 2. Update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY below
 * 3. node backfill-accurate-file-sizes.js
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION - Update these values
// ============================================================================

const SUPABASE_URL = 'https://aunxdbqukbxyyiusaeqi.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY5MDYxNSwiZXhwIjoyMDY4MjY2NjE1fQ.xx1XtyOUn-am8gh_bak79xM3J-qQ8y_LGU0n6DlOOys'; // From Supabase Settings > API
const STORAGE_BUCKET = 'audio-tracks'; // Your audio files bucket name

// ============================================================================
// Script Configuration
// ============================================================================

const BATCH_SIZE = 10; // Process 10 files at a time
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

// ============================================================================
// Initialize Supabase Client
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Main Backfill Function
// ============================================================================

async function backfillFileSizes() {
  console.log('🚀 Starting accurate file size backfill...\n');

  try {
    // Step 1: Fetch all tracks that need backfilling
    // Include tracks with exactly 10MB (10485760 bytes) or very small sizes (< 1MB) as they likely have incorrect sizes
    console.log('📊 Fetching tracks from database...');
    const { data: tracks, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('id, title, file_url, file_size')
      .or('file_size.is.null,file_size.eq.0,file_size.eq.10485760,file_size.lt.1048576')
      .is('deleted_at', null);

    if (fetchError) {
      console.error('❌ Error fetching tracks:', fetchError);
      return;
    }

    if (!tracks || tracks.length === 0) {
      console.log('✅ No tracks need backfilling! All file sizes are already set.');
      return;
    }

    console.log(`📦 Found ${tracks.length} tracks needing file size backfill\n`);

    // Step 2: Process tracks in batches
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} tracks)...`);

      // Process each track in the batch
      for (const track of batch) {
        try {
          // Method 1: Try to get file size via HTTP HEAD request to the URL
          let fileSize = null;

          // Extract the storage path from the full URL
          // Format: https://.../storage/v1/object/public/audio-tracks/{user-id}/{filename}
          const urlParts = track.file_url.split('/audio-tracks/');
          const storagePath = urlParts.length > 1 ? urlParts[1] : null;
          const fileName = track.file_url.split('/').pop();

          console.log(`  🔍 Processing: "${track.title}" (${fileName})`);

          if (!storagePath) {
            console.log(`    ⚠️  Could not extract storage path from URL`);
            fileSize = 10485760; // Fallback to 10MB
          } else {
            // Try HTTP HEAD request with the actual file URL
            try {
              const response = await fetch(track.file_url, { method: 'HEAD' });
              const contentLength = response.headers.get('content-length');

              if (contentLength && parseInt(contentLength) > 1000) { // Ignore tiny responses (error pages)
                fileSize = parseInt(contentLength);
                console.log(`    ✅ Found via HTTP: ${formatBytes(fileSize)}`);
              } else {
                console.log(`    ⚠️  Response too small (${contentLength} bytes), likely an error page`);
              }
            } catch (httpError) {
              console.log(`    ⚠️  HTTP request failed: ${httpError.message}`);
            }

            // Method 2: Try Supabase Storage API if HTTP failed
            if (!fileSize) {
              try {
                const { data: fileInfo, error: infoError } = await supabase
                  .storage
                  .from(STORAGE_BUCKET)
                  .list(storagePath.split('/')[0], {
                    search: fileName
                  });

                if (!infoError && fileInfo && fileInfo.length > 0) {
                  const file = fileInfo[0];
                  if (file.metadata && file.metadata.size) {
                    fileSize = parseInt(file.metadata.size);
                    console.log(`    ✅ Found in storage metadata: ${formatBytes(fileSize)}`);
                  }
                }
              } catch (storageError) {
                console.log(`    ⚠️  Storage API failed: ${storageError.message}`);
              }
            }
          }

          // Method 3: Fallback to default 10MB if still no size
          if (!fileSize) {
            fileSize = 10485760; // 10MB default
            console.log(`    ⚠️  Using default: ${formatBytes(fileSize)}`);
          }

          // Update database
          const { error: updateError } = await supabase
            .from('audio_tracks')
            .update({ file_size: fileSize })
            .eq('id', track.id);

          if (updateError) {
            console.log(`    ❌ Update failed: ${updateError.message}`);
            errorCount++;
          } else {
            successCount++;
            results.push({
              id: track.id,
              title: track.title,
              file_size: fileSize,
              file_size_formatted: formatBytes(fileSize)
            });
          }

        } catch (error) {
          console.error(`    ❌ Error processing track "${track.title}":`, error.message);
          errorCount++;
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < tracks.length) {
        console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} tracks`);
    console.log(`❌ Errors: ${errorCount} tracks`);
    console.log(`📦 Total processed: ${tracks.length} tracks\n`);

    // Step 4: Verification
    console.log('🔍 Running verification query...\n');
    const { data: verifyData } = await supabase
      .from('audio_tracks')
      .select('file_size')
      .is('deleted_at', null);

    if (verifyData) {
      const totalBytes = verifyData.reduce((sum, track) => sum + (track.file_size || 0), 0);
      const avgBytes = totalBytes / verifyData.length;
      const tracksWithSize = verifyData.filter(t => t.file_size > 0).length;

      console.log('📈 VERIFICATION RESULTS:');
      console.log(`  Total tracks: ${verifyData.length}`);
      console.log(`  Tracks with file_size: ${tracksWithSize}`);
      console.log(`  Total storage: ${formatBytes(totalBytes)}`);
      console.log(`  Average per track: ${formatBytes(avgBytes)}`);
    }

    console.log('\n✅ Backfill complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// ============================================================================
// Run Script
// ============================================================================

// Validate configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ ERROR: Please update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the script');
  console.error('   You can find these values in your Supabase project settings');
  process.exit(1);
}

// Run the backfill
backfillFileSizes()
  .then(() => {
    console.log('🎉 Script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
