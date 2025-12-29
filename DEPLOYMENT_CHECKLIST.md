# Storage-Based Tier System - Deployment Checklist

**Status:** Ready for Database Migration & Testing
**Version:** 1.0
**Date:** December 28, 2025

---

## ✅ Completed (Mobile App Code)

### Phase 1: Core Logic
- [x] StorageQuotaService.ts created (350 lines)
- [x] UploadQuotaService.ts updated with storage integration
- [x] Storage limits defined (150MB, 2GB, 10GB)
- [x] Caching system implemented (2-minute cache)
- [x] Helper functions (formatBytes, warnings, suggestions)

### Phase 2: UI Components
- [x] StorageIndicator.tsx created (full & compact versions)
- [x] StorageManagementScreen.tsx created (file management)
- [x] UploadLimitCard.tsx updated (storage-first messaging)
- [x] UploadScreen.tsx integrated (displays StorageIndicator)

### Phase 3: Pricing & Onboarding
- [x] UpgradeScreen.tsx updated (storage in pricing cards)
- [x] OnboardingScreen.tsx updated (tier comparison)
- [x] All "7 uploads/month" references replaced

### Documentation
- [x] STORAGE_TIER_IMPLEMENTATION_COMPLETE.md
- [x] STORAGE_MIGRATION_MOBILE_COMPLETE.md
- [x] QUICK_START_STORAGE_MIGRATION.md
- [x] DATABASE_MIGRATION_STORAGE.sql
- [x] BACKFILL_FILE_SIZES.md
- [x] This deployment checklist

---

## ⏳ Pending (Critical Path)

### Step 1: Database Migration ⚠️ REQUIRED
- [ ] Run `DATABASE_MIGRATION_STORAGE.sql` in Supabase SQL Editor
  - [ ] Add `file_size` column to `audio_tracks`
  - [ ] Verify `deleted_at` column exists (should already exist ✅)
  - [ ] Create `idx_audio_tracks_storage` index
  - [ ] Run verification queries

**Script Location:** `DATABASE_MIGRATION_STORAGE.sql`

### Step 2: Backfill File Sizes ⚠️ CRITICAL
- [ ] Choose backfill method:
  - [ ] Option 1: Supabase Storage metadata (recommended)
  - [ ] Option 2: Node.js script (most accurate)
  - [ ] Option 3: Default size estimate (quick fallback)
- [ ] Run backfill process
- [ ] Verify results (test queries)

**Guide Location:** `BACKFILL_FILE_SIZES.md`

### Step 3: Navigation Setup
- [ ] Add StorageManagementScreen to App.tsx navigation:
  ```typescript
  <Stack.Screen
    name="StorageManagement"
    component={StorageManagementScreen}
    options={{ headerShown: false }}
  />
  ```
- [ ] Test navigation from StorageIndicator "Manage" button

### Step 4: Upload Service Integration
- [ ] Update upload handlers to save `file_size`:
  ```typescript
  await supabase.from('audio_tracks').insert({
    user_id,
    title,
    file_url,
    file_size: actualFileSize, // ADD THIS
    // ... other fields
  });
  ```
- [ ] Test that new uploads save file_size correctly

---

## 🧪 Testing Phase

### Database Testing
- [ ] Verify `file_size` column exists
- [ ] Verify index exists and is used by queries
- [ ] Run test storage calculation query
- [ ] Check backfill accuracy (sample 10 random tracks)

### Quota Calculation Testing
- [ ] Free user: Shows 150MB limit
- [ ] Premium user: Shows 2GB limit
- [ ] Unlimited user: Shows 10GB limit
- [ ] Storage calculations match database sums

### Upload Flow Testing
- [ ] Upload a file → `file_size` saved correctly
- [ ] Storage quota updates after upload
- [ ] Upload blocked when at storage limit
- [ ] Error message shows storage details

### Delete Flow Testing
- [ ] Delete a file → `deleted_at` timestamp set
- [ ] Storage immediately freed (excluded from calculation)
- [ ] Quota UI updates in real-time
- [ ] Delete confirmation shows freed space amount

### UI/UX Testing
- [ ] StorageIndicator displays correctly
- [ ] Progress bar shows correct percentage
- [ ] Colors change at thresholds (green/orange/red)
- [ ] Warning messages appear at 80%, 90%
- [ ] Upgrade suggestions show for correct tiers
- [ ] "Manage" button navigates to StorageManagement
- [ ] StorageManagementScreen lists all files
- [ ] Sort by size/date/name works
- [ ] UploadLimitCard shows storage info
- [ ] UpgradeScreen shows updated tiers
- [ ] OnboardingScreen shows storage-based features

### User Flow Testing

#### Scenario 1: New Free User
- [ ] Signs up → sees "150MB storage (~3 tracks)"
- [ ] Uploads 3 x 50MB tracks → 150MB used
- [ ] Tries 4th upload → blocked correctly
- [ ] Message: "Storage limit reached (100% used)"
- [ ] Upgrade button says "Upgrade for 2GB storage"

#### Scenario 2: Premium User Upload
- [ ] Shows "2GB storage (~200 tracks)"
- [ ] Can upload multiple files in one session
- [ ] No monthly limit message
- [ ] Storage updates after each upload

#### Scenario 3: Premium User at 90% Storage
- [ ] Warning appears: "Almost out of storage!"
- [ ] Click "Manage" → StorageManagementScreen opens
- [ ] Sort by size → largest files first
- [ ] Delete old file → storage freed immediately
- [ ] Warning changes/disappears

#### Scenario 4: Album Upload
- [ ] Premium user uploads 10-track album (100MB)
- [ ] All 10 tracks upload successfully
- [ ] Storage shows 100MB used / 2GB available
- [ ] Can upload more immediately

---

## 🚀 Deployment Steps

### Pre-Deployment (Staging)
- [ ] Run database migration in staging
- [ ] Backfill file sizes in staging
- [ ] Deploy mobile app code to staging
- [ ] Run full test suite
- [ ] Fix any critical bugs

### Deployment (Production)

#### 1. Database (Off-Peak Hours Recommended)
- [ ] **Backup database** (critical!)
- [ ] Run `DATABASE_MIGRATION_STORAGE.sql`
- [ ] Verify columns and index created
- [ ] Run backfill process (may take time)
- [ ] Verify backfill results
- [ ] Test storage calculations manually

#### 2. Mobile App
- [ ] Deploy to TestFlight/Internal Testing
- [ ] Team testing (1-2 days)
- [ ] Fix any issues
- [ ] Deploy to App Store/Play Store

#### 3. User Communication
- [ ] In-app notification: "Introducing Storage-Based Uploads"
- [ ] Email announcement (optional)
- [ ] Help center articles updated
- [ ] Support team briefed

#### 4. Monitoring (First Week)
- [ ] Watch error rates (target: <1%)
- [ ] Monitor support tickets (should decrease)
- [ ] Track storage quota API performance
- [ ] Check subscription retention metrics
- [ ] Monitor storage-based upgrades

---

## 📊 Success Metrics

### Week 1 (Launch Week)
- [ ] No critical bugs reported
- [ ] Upload success rate >99%
- [ ] Storage calculations accurate
- [ ] Support tickets <1.5x normal

### Month 1 (First Month)
- [ ] Subscription retention +10-15%
- [ ] Support tickets -30-40%
- [ ] Storage-based upgrades >5% of total upgrades
- [ ] User satisfaction improved (survey/reviews)

### Month 3 (Long-term)
- [ ] Retention improvement sustained
- [ ] Free → Premium conversion +15%
- [ ] Premium → Unlimited conversion +10%
- [ ] Album uploads increasing

---

## 🚨 Rollback Plan

### Triggers for Rollback
- Critical bugs affecting >10% of users
- Storage calculations completely wrong
- Upload blocking incorrectly
- Support ticket volume >3x normal
- Subscription cancellations spike

### Rollback Procedure
1. Keep old upload count logic (commented in code)
2. Feature flag to switch between systems
3. Database columns can coexist
4. Revert mobile app deployment
5. Communicate with users about temporary revert

**Rollback Time:** <1 hour if prepared

---

## 📞 Support Preparation

### FAQs Updated
- [ ] "What happened to monthly uploads?"
- [ ] "Why can't I upload on Premium?"
- [ ] "How do I free up storage?"
- [ ] "Do old uploads count toward storage?"
- [ ] "What happens when I hit my limit?"

### Canned Responses Ready
- [ ] Storage limit reached
- [ ] How to delete files
- [ ] Upgrade options explained
- [ ] Storage vs upload counts explained

### Support Team Briefed
- [ ] Understand new storage system
- [ ] Know how to check user storage
- [ ] Can guide users to delete files
- [ ] Understand upgrade paths

---

## 🔍 Post-Deployment Monitoring

### Immediately After Launch
- [ ] Check error logs every 4 hours
- [ ] Monitor upload success rates
- [ ] Watch support ticket queue
- [ ] Test storage calculations manually

### First Week
- [ ] Daily error rate check
- [ ] Daily support ticket review
- [ ] Storage quota API performance
- [ ] User feedback collection

### First Month
- [ ] Weekly metrics review
- [ ] Subscription retention analysis
- [ ] Storage-based upgrade tracking
- [ ] User behavior patterns

---

## ✅ Final Pre-Launch Checklist

**Code:**
- [x] All Phase 1-3 complete
- [ ] Database migration ready
- [ ] Navigation configured
- [ ] Upload handlers updated

**Database:**
- [ ] Migration script tested in staging
- [ ] Backfill strategy chosen
- [ ] Backup plan ready
- [ ] Rollback plan documented

**Testing:**
- [ ] All test scenarios passed
- [ ] Edge cases handled
- [ ] Performance acceptable
- [ ] No critical bugs

**Operations:**
- [ ] Support team trained
- [ ] FAQs updated
- [ ] User communication ready
- [ ] Monitoring setup

**Documentation:**
- [x] All docs complete
- [x] Quick start guide ready
- [x] Deployment checklist ready
- [ ] Team briefed

---

## 🎉 Ready to Launch?

If all items above are checked, you're ready to:

1. ✅ Run database migration
2. ✅ Backfill file sizes
3. ✅ Deploy mobile app
4. ✅ Monitor & celebrate!

**The storage-based tier system will transform user retention!** 🚀

---

**Document Version:** 1.0
**Last Updated:** December 28, 2025
**Owner:** Mobile Development Team
