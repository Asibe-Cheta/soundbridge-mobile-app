CURSOR PROMPT FOR CLOUDFLARE R2 MIGRATION:

IMPORTANT NOTE FOR WEB TEAM:
SoundBridge already has an active Cloudflare account with R2 and CDN in use.
DO NOT create a new Cloudflare account.
The bucket (soundbridge-audio) may already exist — check the dashboard first before creating a new one.
You will need the existing Cloudflare credentials from the founder before proceeding.
Skip straight to "GETTING CLOUDFLARE CREDENTIALS" section below to confirm what's already set up.

PHASE 1: Initial Setup (Give Cursor This First)
I need to migrate audio file uploads from Supabase Storage to Cloudflare R2 to reduce storage costs and eliminate egress fees.

CURRENT SETUP:
- Next.js 14 app with TypeScript
- Supabase for database, auth, and currently storage
- Audio files stored in Supabase Storage
- Upload endpoint likely at /api/upload or similar
- Database stores file URLs in a tracks table

NEW REQUIREMENTS:
- Move audio file storage to Cloudflare R2 (S3-compatible)
- Keep Supabase for database and auth only
- Use @aws-sdk/client-s3 for R2 uploads (R2 is S3-compatible)
- Generate public CDN URLs for playback
- Store R2 URLs in Supabase database
- Maintain existing upload API interface

STEP 1: Install required packages
Show me the exact npm install command needed.

STEP 2: Environment variables
Show me what to add to .env.local with placeholder values and comments explaining where to get each value from Cloudflare dashboard.

STEP 3: Create R2 client configuration
Create /lib/r2-client.ts that:
- Initializes S3Client for Cloudflare R2
- Uses environment variables for credentials
- Exports configured client
- Includes TypeScript types

Show me the complete implementation for steps 1-3.

PHASE 2: Upload Implementation (After Phase 1 Works)
Now update the upload endpoint to use Cloudflare R2.

REQUIREMENTS:
- Find my current upload API endpoint (search codebase for file upload logic)
- Update it to upload files to R2 instead of Supabase Storage
- Generate unique filenames with timestamp to prevent collisions (e.g., {timestamp}-{originalname}.mp3)
- Upload to R2 bucket using PutObjectCommand
- Generate public URL in format: https://pub-{account_hash}.r2.dev/{bucket-name}/{filename}
- Return the public URL to client
- Add comprehensive error handling

SECURITY:
- Validate file type (only allow: .mp3, .wav, .m4a, .flac, .ogg)
- Validate file size (max 50MB)
- Sanitize filename (remove special characters, spaces)
- Add rate limiting if not already present

ERROR HANDLING:
- Catch upload failures and return clear error messages
- Handle network timeouts
- Log errors for debugging
- Return appropriate HTTP status codes

Show me:
1. The updated upload API endpoint code
2. File validation helper functions
3. Error handling implementation
4. Example request/response format

PHASE 3: Database Integration (After Phase 2 Works)
Update database operations to store R2 URLs instead of Supabase Storage URLs.

CURRENT STATE:
- Database has tracks table with audio_url or file_url column (find the exact column name)
- Existing uploads may have Supabase Storage URLs

REQUIREMENTS:
1. Update upload endpoint to save R2 URL to database after successful upload
2. Show me the Supabase query to insert/update the track record with R2 URL
3. Ensure existing audio player can fetch and play from R2 URLs
4. Add database migration if column name needs changing

Show me:
1. Database insert/update logic for R2 URLs
2. Any required database schema changes
3. Example of complete upload flow (file → R2 → database → return URL)

PHASE 4: Audio Playback Update (After Phase 3 Works)
Ensure audio player components can fetch and play from Cloudflare R2 URLs.

REQUIREMENTS:
- Find all components that play audio files (search for <audio>, ReactPlayer, Howler, or custom audio players)
- Verify they can load from R2 public URLs (https://pub-*.r2.dev/*)
- Add loading states and error handling for failed loads
- Test with both old Supabase URLs and new R2 URLs during migration

Show me:
1. List of components that need updating
2. Any required changes to audio player implementation
3. CORS configuration needed on R2 bucket (if any)

PHASE 5: Migration Script for Existing Files (Optional - Do Last)
Create a one-time migration script to move existing files from Supabase Storage to Cloudflare R2.

REQUIREMENTS:
- List all files currently in Supabase Storage
- Download each file
- Upload to Cloudflare R2 with same filename structure
- Update database URLs from Supabase Storage to R2
- Verify file integrity (check file sizes match)
- Log progress and any failures
- Do NOT delete from Supabase until verified successful

Create /scripts/migrate-to-r2.ts that:
- Can be run with: npm run migrate-files
- Shows progress (e.g., "Migrating 45/100 files...")
- Handles failures gracefully (skip and log, don't crash)
- Generates report at end (success count, failure count, list of failed files)

Show me the complete migration script implementation.

GETTING CLOUDFLARE CREDENTIALS:

NOTE: SoundBridge already has an active Cloudflare account. Do not create a new one.
Contact the founder for existing credentials before proceeding.

1. Log into the existing Cloudflare Dashboard:
   - Navigate to R2 section in left sidebar
   - Check if the bucket "soundbridge-audio" already exists
   - If it exists, use it. If not, create it:
     Click "Create bucket" → Name: soundbridge-audio → Location: Automatic → Click "Create bucket"

2. Get or create API Credentials:
   - Go to R2 overview page
   - Click "Manage R2 API Tokens"
   - Check if an existing token with Object Read & Write permissions exists
   - If not, click "Create API Token" → Select permissions: "Object Read & Write" → Click "Create API Token"
   - SAVE THESE IMMEDIATELY (won't be shown again):
     - Access Key ID
     - Secret Access Key
     - Account ID (shown in R2 dashboard URL or settings)

3. Enable Public Access (if not already enabled):
   - Go to your bucket settings
   - Under "Public Access" → Enable
   - Copy the public bucket URL: https://pub-xxxxx.r2.dev

4. Add to .env.local:
   # Cloudflare R2 Configuration
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   CLOUDFLARE_ACCESS_KEY_ID=your_access_key_here
   CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key_here
   R2_BUCKET_NAME=soundbridge-audio
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

USAGE INSTRUCTIONS:
Step 1: Confirm Cloudflare credentials with founder (account already exists)
Step 2: Check if soundbridge-audio bucket already exists in R2 dashboard
Step 3: Give Cursor PHASE 1 prompt, let it complete
Step 4: Test R2 client works (Cursor will create test file)
Step 5: Give Cursor PHASE 2 prompt, let it complete
Step 6: Test upload endpoint with Postman/Thunder Client
Step 7: Give Cursor PHASE 3 prompt, let it complete
Step 8: Test full flow: upload file → check database → verify URL
Step 9: Give Cursor PHASE 4 prompt, let it complete
Step 10: Test audio playback in app
Step 11: (Optional) Give Cursor PHASE 5 prompt to migrate old files
