# Service Provider Feature - User Navigation Guide

**Date:** November 12, 2025  
**Status:** ✅ UI Implementation Complete

---

## How to Become a Service Provider

### Navigation Path

1. **Open the Profile Screen**
   - Tap the **Profile** tab in the bottom navigation bar
   - Or navigate to Profile from any screen

2. **Go to Settings Tab**
   - In Profile screen, tap the **Settings** tab at the top

3. **Find Creator Tools Section**
   - Scroll down to the **"Creator Tools"** section
   - You'll see:
     - Collaboration Availability
     - Collaboration Requests
     - **"Become a Service Provider"** (if you're not already one)
     - **"Service Provider Dashboard"** (if you're already a service provider)

4. **Tap "Become a Service Provider"**
   - A confirmation dialog will appear explaining what service providers can do
   - Tap **"Continue"** to proceed
   - The app will add the `service_provider` creator type to your account
   - After success, you'll be prompted to set up your profile

5. **Set Up Your Profile**
   - You'll be taken to the **Service Provider Onboarding** screen
   - Fill in:
     - **Business/Service Name** (required)
     - **Headline** (optional)
     - **Bio** (optional)
     - **Service Categories** (select from available options)
     - **Default Rate** (optional - you can set specific rates per offering later)
   - Tap **"Save Profile"** when done

6. **Access Your Dashboard**
   - After saving, you'll be taken to the **Service Provider Dashboard**
   - Or navigate back to Profile → Settings → **"Service Provider Dashboard"**

---

## Service Provider Dashboard Features

The dashboard shows:

- **Profile Summary**
  - Your service name and headline
  - Badge tier (if applicable)
  - Review count and average rating
  - Total bookings

- **Quick Actions**
  - Manage Offerings (coming soon)
  - Portfolio (coming soon)
  - Availability (coming soon)
  - Verification (coming soon)

- **Recent Bookings**
  - List of your recent service bookings
  - Booking status and amounts

---

## Files Created/Modified

### New Screens
- `src/screens/ServiceProviderOnboardingScreen.tsx` - Profile setup form
- `src/screens/ServiceProviderDashboardScreen.tsx` - Dashboard for managing service provider account

### Modified Files
- `src/screens/ProfileScreen.tsx` - Added service provider option in Creator Tools section
- `App.tsx` - Added navigation routes for new screens

---

## Current Status

✅ **Complete:**
- Navigation to become a service provider
- Profile setup form
- Basic dashboard view
- Integration with backend API

🚧 **Coming Soon:**
- Manage service offerings (create, edit, delete)
- Portfolio management (add images/videos)
- Availability calendar management
- Verification submission flow
- Full booking management interface
- Review management

---

## User Flow Diagram

```
Profile Screen
    ↓
Settings Tab
    ↓
Creator Tools Section
    ↓
"Become a Service Provider" Button
    ↓
Confirmation Dialog
    ↓
API Call (adds service_provider creator type)
    ↓
Service Provider Onboarding Screen
    ↓
Fill Profile Form
    ↓
Save Profile
    ↓
Service Provider Dashboard
```

---

## Technical Details

### API Integration
- Uses `becomeServiceProvider()` from `creatorExpansionService.ts`
- Uses `upsertServiceProviderProfile()` to save profile
- Uses `fetchServiceProviderProfile()` to load existing data
- Uses `fetchProviderBookings()` to show bookings
- Uses `fetchBadgeInsights()` to show badge information

### Creator Type Check
- ProfileScreen checks `userProfile?.creator_types?.includes('service_provider')`
- Shows different UI based on whether user is already a service provider
- Automatically refreshes user profile after becoming a service provider

---

**Status:** ✅ Ready for Testing  
**Last Updated:** November 12, 2025

