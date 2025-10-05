# 🔍 Mobile App Debug Questions - Stripe Connect RLS Error

## 🚨 CURRENT ISSUE:
Despite successful authentication, we're still getting:
```
"Failed to store account information: new row violates row-level security policy for table \"creator_bank_accounts\""
```

## 📋 QUESTIONS FOR MOBILE APP TEAM:

### **1. Request Payload Verification**
- **Q:** What exact data is being sent in the request body to `/api/stripe/connect/create-account`?
- **Q:** Can you show the complete request payload (without sensitive data)?
- **Expected:** Should include bank account details, routing numbers, etc.

### **2. User Context Verification**  
- **Q:** Is the mobile app calling the API while the user is fully authenticated?
- **Q:** Are you calling this API immediately after login, or after some other actions?
- **Q:** Does the user's session/token expire between login and API call?

### **3. API Endpoint Verification**
- **Q:** Are you calling the correct endpoint: `https://soundbridge.live/api/stripe/connect/create-account`?
- **Q:** Are you using POST method with proper Content-Type: application/json?
- **Q:** Can you confirm the exact URL being called?

### **4. Error Timing**
- **Q:** Does this error happen immediately, or after some processing time?
- **Q:** Do you see any other errors in the mobile app console before this one?
- **Q:** Is this the first time this user is trying to set up Stripe Connect?

### **5. Token Verification**
- **Q:** Can you verify the Bearer token is the same one used for other API calls?
- **Q:** Are you refreshing the token before making this call?
- **Q:** Can you test with a freshly logged-in user?

### **6. Alternative Test**
- **Q:** Can you try calling our debug endpoint first to verify auth is working?
  - **Endpoint:** `https://soundbridge.live/api/debug/bearer-auth`
  - **Method:** POST
  - **Headers:** Same as Stripe Connect call
  - **Expected:** Should return user info successfully

## 🔧 POSSIBLE ISSUES:

### **Theory 1: Database Policy Cache**
- The RLS policies might be cached and not refreshed
- **Solution:** Wait 5-10 minutes or restart Supabase connection

### **Theory 2: User Context Missing**
- The Bearer token might not be providing the correct user context to RLS
- **Solution:** Verify token includes proper user claims

### **Theory 3: Table Permissions**
- There might be additional table-level permissions beyond RLS
- **Solution:** Check table grants and ownership

### **Theory 4: Data Validation**
- The request might be missing required fields for the database
- **Solution:** Verify all required columns are provided

## 🎯 IMMEDIATE ACTIONS:

1. **Mobile Team:** Answer the questions above
2. **Backend:** Run VERIFY_DATABASE_CHANGES.sql to check our fixes
3. **Test:** Try the debug endpoint first
4. **Compare:** Test same functionality on web app (if available)

## 📞 COMMUNICATION:
Please provide:
- Complete request payload (sanitized)
- Mobile app console logs
- Exact timing of the error
- Results from debug endpoint test
