---
title: Verification Badge Plan
status: Draft
owner: Mobile Team
audience: Web App Team + Mobile Team
---

# Goals
- Display a verified indicator for verified users (creator or listener).
- Maintain clarity and consistency across profile and posts.

# Agreed Decisions
- Show badge for both creators and listeners when verified by admin.
- Use the gradient check badge (not the micro app icon).

# Backend Requirements
- Use existing `profiles.is_verified` (boolean).
- Confirm verification is authoritative from admin workflow.

# Badge Options
1) **Gradient check badge** (recommended)
2) **Micro app icon** (`sb-app-icon.png` ~12–14px)

# Recommendation
Use a small gradient check badge for clarity and consistency.  

# Placement (Mobile)
- Profile header beside display name
- Post author row (cards and lists)
- Creator cards and list rows

# API Spec (Optional)
If web team prefers a dedicated endpoint for verification state:
```
GET /api/verification/status?userId=uuid
Response: { "is_verified": true }
```
Status codes:
- 200: ok
- 404: user not found
- 500: server error

# Questions for Web Team
1) Should verification be shown for both creators and listeners?  
Answer: Yes, both creators and listeners if verified by admin.
2) Confirm badge asset: gradient check vs micro app icon.  
Answer: Use gradient check badge.
