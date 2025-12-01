# Mobile Team - Block & Report API Query
**Date:** December 2025  
**From:** Mobile App Team  
**To:** Web App Team  
**Subject:** API Endpoint Details for Block and Report Features

---

## Overview

We have implemented the Block and Report features in the mobile app as per the `BLOCK_FEATURE_MOBILE_DOCUMENTATION.md` specification. However, we're encountering API errors (400 Bad Request) when submitting reports and need clarification on the exact API format and requirements.

---

## 1. Report Content API

### Current Implementation

**Endpoint:** `POST /api/reports/content`

**Request Body (Current):**
```json
{
  "content_type": "post",
  "content_id": "uuid-of-post",
  "report_type": "spam",
  "description": "Optional description text"
}
```

### Questions:

1. **Field Names:** Are the field names correct?
   - `content_type` vs `contentType`?
   - `content_id` vs `contentId`?
   - `report_type` vs `reportType`?

2. **Content Type Values:** What are the exact accepted values?
   - We're using: `"post"`, `"comment"`, `"track"`, `"profile"`, `"playlist"`
   - Are these correct? Any case sensitivity requirements?

3. **Report Type Values:** What are the exact accepted values?
   - We're using: `"spam"`, `"inappropriate"`, `"harassment"`, `"fake"`, `"copyright"`, `"other"`
   - Are these correct? Any case sensitivity requirements?

4. **Description Field:**
   - Is `description` required or optional?
   - If optional, should we omit it from the request body entirely, or send it as `null`/empty string?
   - What's the maximum length?

5. **Error Response Format:** When a 400 error occurs, what format is the error response?
   - Example: `{ "error": "message" }` or `{ "message": "error" }` or `{ "details": "error" }`?

### Current Error:
```
❌ API Error (400): Object
```

We're not seeing the actual error message. Can you provide:
- The exact error response format
- Common validation error messages we should handle

---

## 2. Block User API

### Current Implementation

**Endpoint:** `POST /api/users/block`

**Request Body (Current):**
```json
{
  "blockedUserId": "uuid-of-user-to-block",
  "reason": "Optional reason text"
}
```

### Questions:

1. **Field Names:** Are the field names correct?
   - `blockedUserId` vs `blocked_user_id` vs `blocked_userId`?
   - `reason` - is this correct?

2. **Reason Field:**
   - Is `reason` required or optional?
   - If optional, should we omit it from the request body entirely?
   - What's the maximum length?

3. **Unblock Endpoint:**
   - `DELETE /api/users/block?userId=<userId>` - is this correct?
   - Should the query parameter be `userId` or `user_id`?

4. **Check Block Status:**
   - `GET /api/users/block?checkUserId=<userId>` - is this correct?
   - Should the query parameter be `checkUserId` or `check_user_id`?

5. **List Blocked Users:**
   - `GET /api/users/block?list=blocked` - is this correct?
   - What are the accepted values for `list` parameter?

---

## 3. Authentication

### Current Implementation:
- We're sending: `Authorization: Bearer <token>` header
- Token is obtained from Supabase session: `session.access_token`

### Questions:
1. Is this the correct authentication method?
2. Should we also send any cookie headers?
3. Are there any additional headers required?

---

## 4. Error Handling

### Current Error Response Handling:
We're trying to extract error messages from:
- `error.body.error`
- `error.body.message`
- `error.body.details`

### Questions:
1. What is the exact structure of error responses?
2. Can you provide examples of:
   - 400 Bad Request errors
   - 401 Unauthorized errors
   - 404 Not Found errors
   - 500 Server errors

---

## 5. Testing

### Test Cases We Need Confirmed:

**Report API:**
- [ ] Report a post with all report types
- [ ] Report with description
- [ ] Report without description
- [ ] Report with empty description
- [ ] Invalid content_type value
- [ ] Invalid report_type value
- [ ] Missing required fields

**Block API:**
- [ ] Block a user with reason
- [ ] Block a user without reason
- [ ] Block yourself (should return 400)
- [ ] Block already blocked user (should return 409)
- [ ] Unblock a user
- [ ] Check block status
- [ ] List blocked users

---

## 6. Request Examples

### Report Content - What We're Sending:
```typescript
POST /api/reports/content
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "content_type": "post",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "report_type": "spam",
  "description": "This is spam content"
}
```

**Is this correct? If not, please provide the exact format.**

### Block User - What We're Sending:
```typescript
POST /api/users/block
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "blockedUserId": "123e4567-e89b-12d3-a456-426614174000",
  "reason": "Inappropriate behavior"
}
```

**Is this correct? If not, please provide the exact format.**

---

## 7. Additional Information Needed

1. **API Base URL:** We're using `https://www.soundbridge.live` - is this correct?
2. **Rate Limiting:** Are there any rate limits on these endpoints?
3. **Response Times:** What are typical response times?
4. **Idempotency:** Can the same report be submitted multiple times, or should we prevent duplicates?

---

## Summary

We need:
1. ✅ Exact field names (camelCase vs snake_case)
2. ✅ Exact accepted values for enums (content_type, report_type)
3. ✅ Required vs optional fields
4. ✅ Error response format and common error messages
5. ✅ Complete working examples of successful requests

Once we have this information, we can fix the API integration and complete the feature implementation.

---

**Thank you for your assistance!**

**Mobile Team Contact:** [Your contact info]  
**Priority:** High - Blocking feature completion

