<document>
# Complete Storage-Based Tier Migration Guide

## Executive Summary

**Current Problem:** 7 uploads/month feels restrictive and causes user churn. Users upload all 7 tracks on Day 1, then feel locked out for 29 days.

**Solution:** Replace upload count limits with storage-based limits:
- Free: 150MB storage (~3 tracks total)
- Premium (£6.99/mo): 2GB storage (~200 tracks), unlimited uploads
- Unlimited (£12.99/mo): 10GB storage (~1000 tracks), unlimited uploads

**Why This Works:**
- No "wasted uploads" feeling
- Users can upload whenever they want (storage permitting)
- Album releases work (10-15 tracks fit easily)
- Clear differentiation between tiers (150MB vs 2GB vs 10GB)
- Professional positioning (catalog storage vs arbitrary monthly limits)

---

## PHASE 1: Core Storage Logic Implementation

### Overview
Replace all upload count checking logic with storage-based quota checks throughout the mobile app codebase.

### Files to Update

#### 1. UploadQuotaService.ts (or equivalent service file)

**Current State:** 
- Checks monthly upload counts (7 for Premium, unlimited for Unlimited)
- Resets monthly
- Blocks uploads when quota exceeded

**Required Changes:**
- Define storage limits as constants (150MB, 2GB, 10GB)
- Create function to calculate current storage usage (sum all file_size from uploads table)
- Create function to check if new file fits within storage limit
- Remove all monthly upload count logic
- Add helper function to format bytes to human-readable (e.g., "1.5 GB")

**Key Logic:**
- Query all user's uploads where deleted_at is NULL
- Sum file_size column to get current usage
- Compare (current usage + new file size) against tier storage limit
- Return: can upload (boolean), current usage, limit, available space, percent used

#### 2. Database Schema Updates

**uploads table:**
- Add column: file_size (BIGINT, stores file size in bytes)
- Add column: deleted_at (TIMESTAMPTZ, NULL by default for soft deletes)
- Create index on (user_id, file_size) WHERE deleted_at IS NULL for fast queries
- Backfill file_size for existing uploads (may require script to fetch from storage provider)

**Note:** Do NOT drop or modify existing subscription/tier columns. Only ADD new columns.

#### 3. Upload Flow Handler

**Current State:**
- Checks monthly upload quota before allowing upload
- Shows "X uploads remaining this month" messages

**Required Changes:**
- Before file upload starts, call storage quota check function
- Pass in: user ID, file size to be uploaded
- If storage would be exceeded, show error with:
  - Current usage formatted (e.g., "1.8 GB")
  - Storage limit formatted (e.g., "2 GB")
  - File size attempting to upload
  - Available space remaining
  - Upgrade prompt if not on highest tier
- If storage check passes, proceed with upload
- After successful upload to storage, save file_size in database record
- Remove all "uploads remaining" messaging

**Error Messages to Show:**
- Free tier: "Storage limit reached. You've used [X] of 150MB. Upgrade to Premium for 2GB!"
- Premium tier: "Storage limit reached. You've used [X] of 2GB. Upgrade to Unlimited for 10GB, or delete old files."
- Unlimited tier: "Storage limit reached. You've used [X] of 10GB. Please delete some files to free up space."

#### 4. Tier Features Configuration

**File:** Constants or config file defining tier features

**Required Changes:**
- Update tier feature definitions to include:
  - storage: number (in bytes)
  - storageFormatted: string (e.g., "2GB")
  - uploads: number or Infinity
  - uploadsFormatted: string (e.g., "Unlimited*")

**New Structure:**
```
FREE TIER:
- storage: 150MB
- uploads: 3 (lifetime total, not monthly)
- storageFormatted: "150MB"
- uploadsFormatted: "3 tracks total"

PREMIUM TIER:
- storage: 2GB  
- uploads: Infinity
- storageFormatted: "2GB (~200 tracks)"
- uploadsFormatted: "Unlimited*"
- Note: *Limited by storage capacity

UNLIMITED TIER:
- storage: 10GB
- uploads: Infinity
- storageFormatted: "10GB (~1000 tracks)"
- uploadsFormatted: "Unlimited"
```

#### 5. Remove Old Upload Count Logic

**Search entire codebase for:**
- "monthlyLimit"
- "uploads_remaining"
- "monthly_upload_count"
- "getMonthlyUploadCount"
- "checkMonthlyQuota"
- "7 uploads"
- "10 uploads"
- Any functions calculating or checking monthly upload counts

**Action:** Delete all instances and replace with storage-based checks

**Important:** Do NOT just comment out old code. Fully remove to avoid confusion.

### Testing Requirements

- Free user: Can upload 3 files totaling less than 150MB
- Free user: Blocked when total storage would exceed 150MB
- Premium user: Can upload unlimited files as long as total stays under 2GB
- Premium user: Blocked when total storage would exceed 2GB
- Unlimited user: Can upload unlimited files as long as total stays under 10GB
- File sizes correctly stored in database after upload
- Storage calculations accurate (sum of all file_size where deleted_at IS NULL)
- Deleted files immediately free up storage (excluded from sum)
- Error messages show correct storage amounts and tier-appropriate upgrade prompts

---

## PHASE 2: UI Updates - Upload & Storage Display

### Overview
Update all user-facing screens to show storage information instead of upload counts.

### Components to Update

#### 1. Upload Screen - Storage Indicator

**Current State:**
- May show "X uploads remaining this month"
- No storage information

**Required Changes:**
- Add storage indicator at top of upload screen
- Show: "[X] used / [Y] total" (e.g., "1.2 GB / 2 GB")
- Add visual progress bar:
  - Green when under 80% used
  - Orange when 80-90% used
  - Red when over 90% used
- Show available space (e.g., "800 MB available")
- Add warning message when over 80% used:
  - 80-90%: "Running low on storage. Consider managing your files."
  - 90%+: "Almost out of storage! Delete old files or upgrade."
- If not on unlimited tier and approaching limit, show upgrade button
- Remove all "uploads remaining" text

**Do NOT:**
- Do not show both storage and upload count (confusing)
- Do not add overly dramatic warnings (keep tone helpful)
- Do not block access to other features based on storage

#### 2. Storage Management Screen

**Location:** Profile section or Settings

**Current State:** May not exist

**Required Changes:**
- Create new screen/section for storage management
- Show storage overview:
  - Total used / Total limit
  - Visual progress bar
  - Percentage used
  - Number of files
- List all user's uploads:
  - Sort by file size (largest first)
  - Show: Title, file size, upload date
  - Add delete button for each file
- Show how much space would be freed by deleting each file
- Confirmation dialog before deletion: "Delete [title]? This will free up [X MB]"
- After deletion, immediately refresh storage display
- If over 50% storage used and not on unlimited tier, show upgrade card:
  - "Need more space? Upgrade to [next tier] for [X GB] storage"

**Important:**
- Make deletion easy but not accidental (require confirmation)
- Update storage display immediately after deletion (no page refresh needed)
- Show file size in human-readable format (MB/GB, not bytes)

#### 3. Profile/Dashboard - Storage Widget

**Location:** Main dashboard or profile overview

**Required Changes:**
- Add small storage widget showing quick overview
- Display: "[X]% used" with small progress bar
- Click to open full storage management screen
- If approaching limit, show warning icon
- Keep widget compact (don't dominate dashboard)

#### 4. Remove Upload Count Displays

**Search UI codebase for:**
- "uploads remaining"
- "X uploads left"
- "uploads/month"
- "monthly uploads"
- Any text showing upload counts

**Action:** 
- Remove all instances
- Replace with storage-based information where contextually appropriate
- If removal creates empty space, redesign that UI section

**Do NOT:**
- Do not leave empty spaces or broken layouts
- Do not mix storage and upload count messaging
- Do not show both old and new systems simultaneously

### Design Guidelines

**Visual Hierarchy:**
- Storage information should be prominent but not overwhelming
- Progress bars should be intuitive (green = good, red = bad)
- Warning messages should be helpful, not panic-inducing

**Tone of Voice:**
- Informative: "You've used 1.5 GB of 2 GB"
- Helpful: "Consider deleting old demos to free up space"
- NOT alarmist: ❌ "URGENT! STORAGE CRITICAL!"

**Accessibility:**
- Progress bars should have text alternatives
- Color should not be only indicator (use icons too)
- Storage amounts should be screen-reader friendly

---

## PHASE 3: Onboarding & Upgrade Screens

### Overview
Update onboarding flow and pricing/upgrade screens to communicate storage-based value proposition.

### Screens to Update

#### 1. Onboarding - Tier Comparison

**Current State:**
- Shows "7 uploads/month" or "10 uploads/month"

**Required Changes:**
- Update feature lists for each tier:

**FREE:**
- Highlight: "150MB storage"
- "3 tracks total"
- "1 event/month"
- "Basic analytics"
- "3 messages/month"

**PREMIUM (Most Popular):**
- Highlight: "2GB storage (~200 tracks)"
- "Unlimited uploads*"
- "5 events/month"
- "Keep 95% of tips"
- "Advanced analytics"
- "Unlimited messages"
- Footnote: "*Limited by storage capacity"

**UNLIMITED:**
- Highlight: "10GB storage (~1000 tracks)"
- "Unlimited uploads"
- "Unlimited events"
- "Verified badge"
- "Custom URL"
- "Priority support"
- "Pro analytics"

**Visual Emphasis:**
- Storage amount should be most prominent feature
- Use larger font or visual icon for storage
- Show "~200 tracks" or "~1000 tracks" to make storage tangible

#### 2. Upgrade Screen - Pricing Cards

**Current State:**
- Pricing cards may show upload limits

**Required Changes:**
- Each pricing card should prominently display storage amount
- Order of information:
  1. Tier name
  2. Price (£X.99/month)
  3. Storage (large, emphasized) - "2GB" or "10GB"
  4. Storage context - "≈ 200 tracks" or "≈ 1000 tracks"
  5. Feature list
  6. CTA button

**Premium Card (Most Popular):**
- Add "MOST POPULAR" badge
- Slightly larger or elevated compared to other cards
- Emphasize value: "2GB storage for £6.99/month"

**Visual Design:**
- Storage should be largest text after price
- Use visual icon (📁 or storage icon) next to storage amount
- Show approximate track count in smaller, lighter text
- Keep "Unlimited uploads*" in feature list with asterisk explanation

#### 3. Comparison Table

**Add to upgrade screen:**
- Comparison table showing all tiers side-by-side
- Rows: Storage, Uploads, Events, Analytics, Support, Special Features
- Columns: Free, Premium, Unlimited

**Storage Row (Most Important):**
- Should be first row or visually highlighted
- Show: 150MB | 2GB | 10GB
- Consider adding visual (progress bars or icons)

**Uploads Row:**
- Show: 3 total | Unlimited* | Unlimited
- Footnote under table: "*Premium uploads unlimited but limited by 2GB storage"

**Other Rows:**
- Events: 1/month | 5/month | Unlimited
- Analytics: Basic | Advanced | Pro
- Support: Email | Email | Priority
- Special: - | - | Verified badge, Custom URL

#### 4. Marketing Copy Updates

**Throughout onboarding and upgrade flows:**

**Replace:**
- "7 uploads per month" → "2GB storage (≈200 tracks)"
- "10 tracks monthly" → "Unlimited uploads, 2GB storage"
- "Monthly upload limit" → "Storage-based uploads"

**New Messaging:**
- Free: "Get started with 150MB - perfect for trying out SoundBridge"
- Premium: "2GB storage means you can build a substantial catalog of ~200 tracks"
- Unlimited: "10GB storage for serious creators - store 1000+ tracks and never worry about space"

**Value Propositions:**
- "Upload whenever inspiration strikes - no monthly limits"
- "Build your entire catalog - albums, singles, demos"
- "Storage that grows with your creativity"

#### 5. FAQ Section

**Add to upgrade screen or help section:**

**Q: How does storage work?**
A: Instead of limiting uploads per month, we give you storage space. Premium gets 2GB (≈200 tracks) and Unlimited gets 10GB (≈1000 tracks). Upload as many files as you want, as long as they fit!

**Q: What happens when I run out of storage?**
A: You can delete old files to free up space, or upgrade to a higher tier. We'll warn you when approaching your limit.

**Q: How big is an average audio file?**
A: A typical 3-minute high-quality track is about 10MB. So 2GB = ~200 tracks, 10GB = ~1000 tracks.

**Q: Can I upload unlimited files on Premium?**
A: Yes! Premium allows unlimited uploads, limited only by your 2GB storage. Manage your catalog strategically, or upgrade to Unlimited for 10GB.

**Q: Do deleted files free up storage immediately?**
A: Yes! When you delete a file, that storage becomes available right away.

**Q: What if I need to upload a full album?**
A: Albums fit easily! A 12-track album is typically 120MB, leaving plenty of room in Premium's 2GB.

### Design Guidelines

**Consistency:**
- Use same terminology everywhere ("storage" not "space" or "capacity")
- Format storage amounts consistently (e.g., always "2GB" not "2 GB" or "2gb")
- Always explain storage in track equivalents (~200 tracks)

**Clarity:**
- Avoid technical jargon (bytes, megabytes in fine print only)
- Make storage limits concrete (200 tracks vs 1000 tracks)
- Explain "unlimited uploads" caveat clearly

**Hierarchy:**
- Storage should be the PRIMARY differentiator between tiers
- Price second
- Other features supporting points

---

## PHASE 4: Web App Implementation Guide

### Overview
Documentation for web app team to implement identical storage-based tier system.

### Components Required

#### 1. Constants/Configuration

**Create or update tier configuration file:**
- Define storage limits in bytes: 150MB, 2GB, 10GB
- Define tier features matching mobile app exactly
- Include formatted strings for display
- Keep this file as source of truth for both platforms

**Important:** Both mobile and web must reference same tier structure to avoid inconsistencies.

#### 2. Database Migration

**Required changes to uploads table:**
- Add file_size column (BIGINT, default 0, stores bytes)
- Add deleted_at column (TIMESTAMPTZ, NULL by default for soft deletes)
- Create index on (user_id, file_size) WHERE deleted_at IS NULL
- Backfill existing uploads' file_size (requires accessing storage provider metadata)

**Migration Strategy:**
- Write migration script to add columns
- Create index for performance
- Backfill file sizes in batches (may take time for large datasets)
- Verify backfill accuracy before proceeding
- Do NOT delete old upload count columns yet (keep for rollback safety)

#### 3. Storage Quota Service

**Create new service file:**
- Function to calculate user's current storage usage
- Function to check if upload would exceed limit
- Function to format bytes to human-readable
- Return object with: canUpload, currentUsage, storageLimit, available, percentUsed, tier

**Logic:**
- Query all uploads for user where deleted_at IS NULL
- Sum file_size column
- Compare against tier's storage limit
- Check if proposed file size would exceed limit

**Error Handling:**
- Handle missing file_size gracefully (treat as 0 or reject upload)
- Handle database errors
- Log quota check failures for monitoring

#### 4. Upload Flow Updates

**In upload API endpoint or handler:**
- Before processing file upload, call storage quota check
- Pass user ID and incoming file size
- If quota exceeded, return 413 (Payload Too Large) with error details
- Error response should include:
  - Clear message: "Storage limit exceeded"
  - Current usage formatted
  - Storage limit formatted
  - Available space
  - Upgrade suggestion if applicable
- If quota allows, proceed with upload
- After successful upload to storage, save file_size in database
- If file_size not saved, storage quota will be inaccurate

**Critical:** File size must be stored in database for quota calculations to work.

#### 5. Dashboard Updates

**Add storage widget to user dashboard:**
- Display current usage / limit
- Show visual progress bar (green/orange/red based on percentage)
- Show percentage used
- Link to storage management page
- Warning message if over 80% used
- Upgrade prompt if not on unlimited tier and approaching limit

**Design should match mobile app:**
- Same color scheme (green < 80%, orange 80-90%, red > 90%)
- Same terminology
- Same upgrade prompts

#### 6. Storage Management Interface

**Create new page or section:**
- List all user's uploads with file sizes
- Sort by size (largest first) by default
- Allow sorting by date, name, size
- Show total storage used and available
- Delete functionality with confirmation
- After deletion, immediately update storage display
- Show how much space each file uses
- Consider bulk delete option for power users

**User Experience:**
- Make it easy to identify large files eating storage
- Confirm before deletion (prevent accidents)
- Update storage totals in real-time after deletion
- Provide search/filter to find specific files

#### 7. Pricing Page Updates

**Update /pricing page:**
- Prominently display storage amounts (150MB, 2GB, 10GB)
- Show track equivalents (~3, ~200, ~1000 tracks)
- List "Unlimited uploads*" with asterisk explanation
- Remove any references to "X uploads/month"
- Add comparison table showing storage row first
- Include FAQ section about storage

**Messaging:**
- Emphasize storage as primary differentiator
- Explain storage in tangible terms (number of tracks)
- Make "unlimited uploads" caveat clear
- Position as professional catalog storage

#### 8. Billing Integration Updates

**Stripe/payment provider:**
- Update product metadata to include storage limits
- Ensure tier assignment reflects storage-based system
- Test subscription creation and tier assignment
- Verify webhook handling for subscription changes
- Update any subscription management UI

**Important:** Existing subscribers should NOT be disrupted. They automatically get new storage limits based on their tier.

#### 9. Remove Old Upload Count Logic

**Search web app codebase for:**
- Monthly upload limit checks
- Upload count displays
- "uploads remaining" messaging
- Functions calculating monthly quotas

**Action:**
- Remove all monthly upload count logic
- Delete upload count display components
- Remove upload count from analytics (replace with storage metrics)

**Do NOT:**
- Break existing user experience during removal
- Delete database columns yet (keep for safety)
- Remove all at once (phase removal carefully)

#### 10. Analytics Updates

**Track new storage-based metrics:**
- Storage limit reached events
- Storage warning shown (at 80%, 90%)
- Files deleted for storage management
- Storage-based upgrade conversions
- Average storage usage by tier

**Remove old metrics:**
- Monthly upload count
- Uploads remaining
- Upload limit reached (replaced by storage limit)

### Testing Requirements

**End-to-End Tests:**
- Free user upload flow: 3 files under 150MB total
- Free user blocked at 150MB limit
- Premium user unlimited uploads under 2GB
- Premium user blocked at 2GB limit
- Unlimited user uploads under 10GB
- File deletion frees storage immediately
- Storage calculations accurate across all tiers
- Error messages show correct amounts
- Upgrade prompts appear at correct thresholds

**Integration Tests:**
- Storage quota API returns correct data
- Upload API checks storage before processing
- Database correctly stores file_size
- Deleted files excluded from storage calculations
- Subscription changes update storage limits

**UI Tests:**
- Dashboard shows storage widget
- Storage management page lists files correctly
- Delete confirmation works
- Progress bars show correct percentages
- Upgrade prompts lead to correct pricing page

### Deployment Checklist

**Pre-Deployment:**
- Run database migration in staging
- Backfill file sizes in staging
- Test storage quota calculations in staging
- Verify upload flow in staging
- Test all tiers in staging
- Review error messages
- Check mobile-web consistency

**Deployment:**
- Run database migration in production
- Deploy API changes
- Deploy frontend changes
- Monitor error rates
- Watch storage quota API performance
- Check for any upload failures

**Post-Deployment:**
- Verify existing users can upload
- Test free tier limits
- Test premium tier limits
- Monitor support tickets for confusion
- Track storage-related analytics
- Check for any edge cases

**Rollback Plan:**
- Keep old upload count columns in database
- Document how to revert API changes
- Have frontend rollback ready
- Monitor key metrics to trigger rollback if needed

### Timeline Estimate

**Development:**
- Database migration and backfill: 4-6 hours
- Storage quota service: 3-4 hours
- Upload flow updates: 3-4 hours
- Dashboard widget: 2-3 hours
- Storage management page: 4-6 hours
- Pricing page updates: 2-3 hours
- Remove old logic: 2-3 hours
- Testing: 6-8 hours

**Total: ~26-37 hours (4-5 business days)**

**Staged Rollout Recommended:**
- Week 1: Database migration, core storage logic
- Week 2: UI updates, storage management
- Week 3: Pricing page, marketing updates
- Week 4: Remove old logic, final testing

### Success Metrics

**Track these after deployment:**
- Storage limit hit rate (should be low initially)
- Upgrade conversions from storage prompts
- User complaints/confusion (should decrease)
- Average storage usage by tier
- Files deleted for storage management
- Subscription retention (should improve)

**Red Flags:**
- High error rates on uploads
- Users confused about storage vs uploads
- Increase in support tickets
- Decrease in upload activity
- Storage calculations incorrect

### Support Preparation

**Update support documentation:**
- Explain storage-based system
- How to manage storage
- Why change from upload counts
- How to upgrade for more storage
- How deletion works
- What happens at storage limit

**Prepare support team:**
- Brief on new system before launch
- Provide FAQs for common questions
- Create canned responses for storage questions
- Monitor feedback closely in first 2 weeks

**Common Questions to Prepare For:**
- "Where did my monthly uploads go?"
- "Why can't I upload if I'm on Premium?"
- "How do I free up storage?"
- "What counts toward my storage?"
- "Do deleted files free up space immediately?"

---

## Cross-Platform Consistency Requirements

### Critical Alignment Points

**Both mobile and web must:**
- Use identical storage limits (150MB, 2GB, 10GB)
- Use identical terminology ("storage" not "space" or "capacity")
- Show storage in same format (e.g., "2GB (~200 tracks)")
- Use same color coding (green/orange/red at same thresholds)
- Display same error messages
- Show same upgrade prompts
- Calculate storage identically

**Inconsistencies to Avoid:**
- Different storage limits between platforms
- Different messaging about features
- Different upgrade prompts
- Different storage calculation logic
- Different error messages

**Testing:**
- Test same user account on both platforms
- Verify storage shows identically
- Verify upload limits enforced identically
- Check that file uploaded on web counts on mobile and vice versa

---

## Migration Communication Plan

### User Communication

**Announcement Timeline:**

**2 Weeks Before Launch:**
- Blog post: "Introducing Storage-Based Uploads"
- Email to all users explaining change
- In-app notification about upcoming change

**1 Week Before:**
- Reminder email
- In-app banner about change
- Social media posts

**Day of Launch:**
- In-app tutorial on first login
- Email: "Your New Storage-Based Experience"
- Help center articles updated

**1 Week After:**
- Follow-up email: "How to Manage Your Storage"
- Blog post: "Tips for Managing Your SoundBridge Storage"

### Messaging Strategy

**Key Messages:**
- "More flexibility - upload whenever inspiration strikes"
- "No more monthly limits - manage your catalog your way"
- "Premium users get 2GB (that's ~200 tracks!)"
- "Same great pricing, better experience"

**Reassurance:**
- "All your existing uploads are safe"
- "Your current plan isn't changing"
- "You're getting MORE flexibility"
- "Most users won't notice any difference"

**Support:**
- "We're here to help - contact support anytime"
- "Check out our storage management guide"
- "Questions? Visit our updated FAQ"

### Internal Communication

**Before Launch:**
- Brief all teams (support, marketing, engineering)
- Update internal documentation
- Train support team on new system
- Prepare for increased support volume

**Day of Launch:**
- War room for monitoring
- Real-time support channel
- Engineering on standby
- Monitor key metrics

**After Launch:**
- Daily check-ins for first week
- Weekly review meetings
- Collect feedback and iterate
- Document lessons learned

---

## Rollback Plan

### If Major Issues Arise

**Criteria for Rollback:**
- Upload failure rate > 5%
- Support ticket volume > 3x normal
- Critical bug in storage calculations
- Widespread user confusion causing churn

**Rollback Procedure:**

**Database:**
- Old upload count columns still exist (not dropped)
- Can revert to old quota checking logic

**Code:**
- Keep old upload count checking code in separate branch
- Can redeploy previous version quickly
- Feature flag to switch between systems

**User Communication:**
- Apologize for disruption
- Explain temporary reversion
- Provide timeline for re-launch
- Offer compensation if appropriate (e.g., free month)

**Prevention:**
- Thorough testing in staging
- Gradual rollout (consider beta users first)
- Monitor metrics closely
- Have rollback plan ready before launch

---

## Summary Checklist

### Mobile App (Phases 1-3)

**Phase 1 - Core Logic:**
- [ ] Storage limits defined (150MB, 2GB, 10GB)
- [ ] Storage quota check function created
- [ ] Upload flow checks storage before uploading
- [ ] File sizes stored in database
- [ ] Old upload count logic removed
- [ ] Tier features updated with storage info

**Phase 2 - UI Updates:**
- [ ] Storage indicator added to upload screen
- [ ] Storage management screen created
- [ ] Delete files functionality works
- [ ] All upload count displays removed
- [ ] Progress bars show storage usage
- [ ] Warning messages at 80%+ usage

**Phase 3 - Onboarding/Upgrade:**
- [ ] Pricing cards show storage prominently
- [ ] Onboarding updated with storage info
- [ ] Comparison table created
- [ ] Marketing copy updated
- [ ] FAQ section added
- [ ] All "uploads/month" references removed

### Web App (Phase 4)

**Database:**
- [ ] Migration script created
- [ ] file_size column added
- [ ] deleted_at column added
- [ ] Index created
- [ ] Existing uploads backfilled

**Backend:**
- [ ] Storage quota service created
- [ ] Upload API checks storage
- [ ] File sizes stored on upload
- [ ] Error handling implemented
- [ ] Old upload count logic removed

**Frontend:**
- [ ] Dashboard storage widget added
- [ ] Storage management page created
- [ ] Pricing page updated
- [ ] Upload count displays removed
- [ ] Upgrade prompts updated

**Deployment:**
- [ ] Staging tested thoroughly
- [ ] Production migration ready
- [ ] Monitoring in place
- [ ] Support team briefed
- [ ] Rollback plan documented

### Post-Launch

- [ ] Monitor storage quota API performance
- [ ] Track storage-based metrics
- [ ] Collect user feedback
- [ ] Update documentation based on feedback
- [ ] Iterate on messaging if needed
- [ ] Celebrate successful migration! 🎉

---

## Final Notes

**This migration will:**
- ✅ Improve user experience (no wasted uploads)
- ✅ Reduce churn (no monthly lockout feeling)
- ✅ Enable album releases (10+ tracks fit easily)
- ✅ Differentiate tiers clearly (150MB vs 2GB vs 10GB)
- ✅ Position professionally (catalog storage)
- ✅ Simplify understanding (GB is clearer than "uploads/month")

**Success depends on:**
- Thorough testing before launch
- Clear communication to users
- Consistent implementation across platforms
- Monitoring and quick response to issues
- Willingness to iterate based on feedback

**Timeline:**
- Mobile App: ~3-4 days development + 2 days testing
- Web App: ~4-5 days development + 2 days testing
- Total: ~2 weeks for complete migration
</document>