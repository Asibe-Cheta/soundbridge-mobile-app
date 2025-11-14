# Service Provider Dashboard - Full Implementation Plan

**Date:** November 12, 2025  
**Based on:** `WEB_TEAM_SERVICE_PROVIDER_UI_RESPONSE.md`  
**Status:** 🚧 Implementation In Progress

---

## Overview

Rebuilding `ServiceProviderDashboardScreen` to match web team's specifications with **all 8 sections** in the correct order, matching their UI patterns and functionality.

---

## Section Order (As Per Web Team Specs)

1. **Badges Section** - Achievement badges and progress tracking
2. **Verification Section** - Identity verification status and submission
3. **Profile Section** - Basic profile information (display name, headline, bio, categories, rates)
4. **Bookings Section** - Manage incoming booking requests
5. **Offerings Section** - Create/edit/delete service offerings
6. **Portfolio Section** - Showcase portfolio items (images/videos)
7. **Availability Section** - Manage availability slots
8. **Reviews Section** - View client reviews and ratings

---

## Implementation Details

### 1. Badges Section
- Show current badge tier
- Progress toward next badge (if applicable)
- Simplified for mobile (per web team recommendation)

### 2. Verification Section
- Prerequisites checklist (cards with checkmarks/alerts)
- Last submission info (if exists)
- Verification form (government ID URL, selfie URL, business doc URL, notes)
- Submit button (disabled if prerequisites not met)

### 3. Profile Section
- Display name, headline, bio
- Categories (chips)
- Default rate display
- Edit button → navigate to ServiceProviderOnboardingScreen

### 4. Bookings Section
- Card-based list (not timeline)
- Each card shows:
  - Client avatar + name + booking ID
  - Offering title (or "Custom service")
  - Scheduled time range
  - Total amount
  - Status badge (color-coded)
  - Action buttons (context-dependent):
    - Pending: "Confirm slot" (green), "Decline" (red)
    - Confirmed Awaiting Payment: "Cancel booking" (red)
    - Paid: "Mark completed" (green gradient)
- Empty state message

### 5. Offerings Section
- **Form at top:**
  - Title (text input)
  - Category (dropdown)
  - Rate Amount (number input)
  - Rate Currency (dropdown)
  - Rate Unit (text input)
  - Description (textarea, 3 rows)
  - Active Toggle (checkbox)
  - "Add offering" button (orange/pink gradient)
- **Card-based list below:**
  - Each offering card shows:
    - Title + Active badge (if active)
    - Category (capitalized)
    - Rate display: `{amount} {currency} / {unit}`
    - Description (if provided)
    - Action buttons: Toggle Active/Inactive, Edit, Delete
- Empty state message

### 6. Portfolio Section
- **Form at top:**
  - Media URL (text input, required)
  - Thumbnail URL (text input, optional)
  - Caption (text input, optional)
  - Display Order (number input, optional)
  - "Add portfolio item" button (blue/purple gradient)
- **Grid display:**
  - Grid layout (responsive)
  - Each item shows:
    - Thumbnail (or gradient placeholder)
    - Caption (or "Portfolio item")
    - Created date
    - Preview button (external link icon)
    - Delete button (trash icon)
- **Video Support:**
  - Detect YouTube/Vimeo URLs
  - Show play button overlay for videos
  - Open modal with embedded player on tap
- Empty state message

### 7. Availability Section
- **Form at top:**
  - Start Time (datetime picker, required)
  - End Time (datetime picker, required)
  - Recurrence Rule (text input, optional) - RRULE format
  - Recurring Slot (checkbox)
  - Clients can book this slot (checkbox)
  - "Add slot" button (teal/blue gradient)
- **List display (not calendar):**
  - Vertical list
  - Each slot shows:
    - Date/time range: `{start} → {end}`
    - Status badges: "Bookable" / "Unavailable"
    - Recurring indicator (if `is_recurring`)
    - Recurrence rule text (if provided)
    - Delete button (trash icon)
- Empty state message

### 8. Reviews Section
- Display client reviews and ratings
- Each review shows:
  - Reviewer avatar + name
  - Rating (stars)
  - Review title (if provided)
  - Review comment (if provided)
  - Date
  - Booking reference (if linked)
- Empty state message

---

## Component Structure

```typescript
export default function ServiceProviderDashboardScreen({ userId }: { userId: string }) {
  // State management
  // Data loading
  // Section renderers (8 sections)
  // Form handlers
  
  return (
    <ScrollView>
      {renderBadgesSection()}
      {renderVerificationSection()}
      {renderProfileSection()}
      {renderBookingsSection()}
      {renderOfferingsSection()}
      {renderPortfolioSection()}
      {renderAvailabilitySection()}
      {renderReviewsSection()}
    </ScrollView>
  );
}
```

---

## UI Patterns (From Web Team)

### Section Cards
- Background: `theme.colors.cardBackground` with backdrop blur
- Border: `1px solid` with `theme.colors.borderCard`
- Border radius: `16px` (1rem)
- Padding: `16px` (1rem on mobile)
- Header: Title + optional action/helper pill

### Form Inputs
- Padding: `12px` (0.75rem)
- Border radius: `10px` (0.6rem)
- Border: `1px solid` with `theme.colors.border`
- Background: `theme.colors.card`
- Color: `theme.colors.text`

### Action Buttons
- Gradient backgrounds (varies by action)
- Border radius: `12px` (0.75rem)
- Padding: `10px 18px` (0.6rem 1.1rem)
- Font weight: `600`
- Icon + text layout

### Color Palette
- Primary Gradient: `linear-gradient(135deg, #DC2626, #EC4899)` (red to pink)
- Success: `#34d399` (green)
- Warning: `#facc15` (yellow)
- Error: `#f87171` (red)
- Info: `#60a5fa` (blue)

---

## API Endpoints Used

1. **Profile:** `GET /api/service-providers/{userId}?include=offerings,portfolio,reviews`
2. **Offerings:** `GET/POST/PATCH/DELETE /api/service-providers/{userId}/offerings/{offeringId}`
3. **Portfolio:** `GET/POST/DELETE /api/service-providers/{userId}/portfolio`
4. **Availability:** `GET/POST/DELETE /api/service-providers/{userId}/availability/{availabilityId}`
5. **Bookings:** `GET /api/service-providers/{userId}/bookings`, `PATCH /api/service-providers/{userId}/bookings?bookingId={id}`
6. **Verification:** `GET /api/service-providers/{userId}/verification/status`, `POST /api/service-providers/{userId}/verification/request`
7. **Badges:** `GET /api/service-providers/{userId}/badges`
8. **Reviews:** Included in profile response with `?include=reviews`

---

## Mobile-Specific Enhancements

1. **Native File Pickers** - For portfolio items and verification documents (upload to Supabase Storage first)
2. **Simplified Recurrence** - Instead of RRULE text input, use:
   - Toggle: "Recurring?"
   - Frequency: Daily/Weekly/Monthly dropdown
   - Days of week: Checkboxes (if weekly)
   - End date: Date picker
3. **Better Date/Time Pickers** - Use native datetime pickers, show timezone clearly
4. **Pull-to-Refresh** - Refresh all data
5. **Lazy Loading** - Load sections on-demand (as user scrolls)
6. **Optimistic Updates** - Update UI immediately when toggling offering status

---

## Implementation Status

- [x] Update ProfileScreen to add Service Provider tab
- [ ] Rebuild ServiceProviderDashboardScreen with all 8 sections
- [ ] Implement Badges Section
- [ ] Implement Verification Section (with prerequisites checklist)
- [ ] Implement Profile Section (with edit navigation)
- [ ] Implement Bookings Section (with status actions)
- [ ] Implement Offerings Section (full CRUD with form)
- [ ] Implement Portfolio Section (with video embedding)
- [ ] Implement Availability Section (list view with add/delete)
- [ ] Implement Reviews Section
- [ ] Add pull-to-refresh
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test all features

---

**Status:** 🚧 In Progress  
**Last Updated:** November 12, 2025

