# Service Provider Dashboard API Verification Request

**Date:** Current  
**Priority:** High  
**Status:** Mobile app experiencing 401 errors and loading issues

---

## Issue Summary

The mobile app's Service Provider Dashboard screen is experiencing:
1. **401 Authentication errors** when calling service provider API endpoints
2. **Stuck loading state** - screen shows "Loading dashboard..." indefinitely
3. **No navigation back** - user cannot exit the screen

---

## API Endpoints Being Called

The mobile app calls these endpoints when loading the Service Provider Dashboard:

1. **GET** `/api/service-providers/{userId}?include=offerings,portfolio,reviews,availability`
   - Purpose: Fetch service provider profile with related data
   - Expected response: `ServiceProviderProfileResponse`

2. **GET** `/api/service-providers/{userId}/bookings`
   - Purpose: Fetch provider bookings
   - Expected response: `ServiceBooking[]`

3. **GET** `/api/service-providers/{userId}/badges`
   - Purpose: Fetch badge insights
   - Expected response: `BadgeInsights`

4. **GET** `/api/service-providers/{userId}/verification/status`
   - Purpose: Fetch verification status
   - Expected response: `VerificationStatusResponse`

5. **GET** `/api/service-providers/{userId}/reviews`
   - Purpose: Fetch provider reviews
   - Expected response: `ServiceReview[]`

---

## Authentication Headers Being Sent

The mobile app sends these headers (matching WalletService/SubscriptionService pattern):

```
Authorization: Bearer {access_token}
X-Auth-Token: {access_token}
X-Authorization: Bearer {access_token}
X-Supabase-Token: {access_token}
Content-Type: application/json
```

**Token Details:**
- Token is present: ✅ Yes
- Token length: 878 characters
- Session exists: ✅ Yes

---

## Questions for Web Team

1. **Are these endpoints correct?**
   - Are the paths and query parameters correct?
   - Should `include` parameter support multiple values like `?include=offerings,portfolio,reviews,availability`?

2. **Authentication:**
   - Do these endpoints accept Bearer token authentication?
   - Are there any special authentication requirements for service provider endpoints?
   - Should we use Cookie authentication instead for these endpoints?

3. **Error Handling:**
   - What should happen if a user doesn't have a service provider profile yet?
   - Should the endpoint return 404 or create an empty profile?
   - What's the expected response format for errors?

4. **Data Schema:**
   - Can you confirm the exact response structure for each endpoint?
   - Are there any required fields that might be missing?

5. **Base URL:**
   - Should these endpoints use `https://soundbridge.live` or `https://app.soundbridge.fm`?
   - We're currently using `https://soundbridge.live` to match other services.

---

## Current Error Logs

```
❌ API Error (401): {error: 'Authentication required'}
🔐 Auth issue - Token present: true, Token length: 878
```

---

## Requested Response

Please provide:
1. Confirmation of correct endpoint paths and methods
2. Authentication requirements (Bearer token vs Cookie)
3. Expected response schemas
4. Error response formats
5. Any special handling needed for new service providers

---

**Thank you!** We need this information to fix the mobile app's Service Provider Dashboard functionality.

