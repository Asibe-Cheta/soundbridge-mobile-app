# 📧 SendGrid Subscription Email Templates

**Date:** December 3, 2025  
**Purpose:** HTML templates for subscription-related email notifications  
**Platform:** SendGrid Dynamic Templates

---

## 📋 **Template Setup Instructions**

1. Log in to your SendGrid dashboard
2. Go to **Email API** → **Dynamic Templates**
3. Click **Create a Dynamic Template**
4. For each template below:
   - Create a new template
   - Add a version
   - Copy the HTML code
   - Add the dynamic data fields listed
   - Save and copy the Template ID

---

## 1. Subscription Confirmation Email

**Template Name:** "Subscription Confirmation - Pro Upgrade"  
**Template ID Variable:** `SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID`

### **Dynamic Data Fields:**
- `user_name` (Text)
- `plan_name` (Text)
- `billing_cycle` (Text)
- `amount` (Text)
- `currency` (Text)
- `subscription_start_date` (Text)
- `next_billing_date` (Text)
- `invoice_url` (Text/URL - optional)
- `dashboard_url` (Text/URL)
- `support_email` (Text)
- `app_name` (Text)
- `money_back_guarantee_text` (Text)

### **HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to SoundBridge Pro!</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
    color: #1a1a1a;
    line-height: 1.6;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    padding: 40px 30px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .content {
    padding: 40px 30px;
  }
  .content p {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #374151;
  }
  .content p:first-child {
    font-size: 18px;
    color: #1f2937;
  }
  .details-box {
    background-color: #f9fafb;
    border-left: 4px solid #8b5cf6;
    padding: 24px;
    margin: 32px 0;
    border-radius: 8px;
  }
  .details-box p {
    margin: 8px 0;
    font-size: 15px;
  }
  .details-box strong {
    color: #1f2937;
    display: inline-block;
    min-width: 140px;
  }
  .cta-button {
    display: inline-block;
    background-color: #8b5cf6;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
    transition: background-color 0.2s;
  }
  .cta-button:hover {
    background-color: #7c3aed;
  }
  .guarantee-box {
    background-color: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 20px;
    margin: 32px 0;
    text-align: center;
  }
  .guarantee-box p {
    margin: 0;
    font-size: 15px;
    color: #92400e;
  }
  .guarantee-box strong {
    font-size: 16px;
  }
  .footer {
    background-color: #f9fafb;
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    margin: 8px 0;
  }
  .footer a {
    color: #8b5cf6;
    text-decoration: none;
  }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <h1>🎉 Welcome to {{plan_name}}!</h1>
    <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">Your subscription is now active</p>
  </div>
  
  <div class="content">
    <p>Hi {{user_name}},</p>
    
    <p>Thank you for upgrading to {{plan_name}}! We're excited to have you as part of our Pro community.</p>
    
    <div class="details-box">
      <p><strong>Plan:</strong> {{plan_name}}</p>
      <p><strong>Billing Cycle:</strong> {{billing_cycle}}</p>
      <p><strong>Amount Paid:</strong> {{amount}} {{currency}}</p>
      <p><strong>Start Date:</strong> {{subscription_start_date}}</p>
      <p><strong>Next Billing:</strong> {{next_billing_date}}</p>
    </div>
    
    <div class="guarantee-box">
      <p><strong>🛡️ {{money_back_guarantee_text}}</strong></p>
      <p>Not satisfied? Request a full refund within 7 days - no questions asked.</p>
    </div>
    
    <p><strong>What's Next?</strong></p>
    <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
      <li>Upload up to 10 tracks per month</li>
      <li>Unlimited professional searches</li>
      <li>Unlimited direct messages</li>
      <li>Advanced analytics and insights</li>
      <li>Custom branding options</li>
      <li>Priority support</li>
    </ul>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{dashboard_url}}" class="cta-button">Go to Dashboard</a>
    </div>
    
    {{#if invoice_url}}
    <p style="text-align: center; margin-top: 24px;">
      <a href="{{invoice_url}}" style="color: #8b5cf6; text-decoration: none;">📄 View Invoice</a>
    </p>
    {{/if}}
    
    <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
      Questions? Reply to this email or contact us at <a href="mailto:{{support_email}}" style="color: #8b5cf6;">{{support_email}}</a>
    </p>
  </div>
  
  <div class="footer">
    <p><strong>{{app_name}}</strong></p>
    <p>Connect. Create. Collaborate.</p>
    <p style="margin-top: 16px;">
      <a href="{{dashboard_url}}">Dashboard</a> | 
      <a href="https://soundbridge.live/pricing">Pricing</a> | 
      <a href="mailto:{{support_email}}">Support</a>
    </p>
    <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
      This email was sent regarding your {{app_name}} subscription. 
      If you have questions, please contact us.
    </p>
  </div>
</div>
</body>
</html>
```

---

## 2. Payment Receipt Email

**Template Name:** "Payment Receipt - Subscription"  
**Template ID Variable:** `SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID`

### **Dynamic Data Fields:**
- `user_name` (Text)
- `amount` (Text)
- `currency` (Text)
- `billing_cycle` (Text)
- `payment_date` (Text)
- `invoice_number` (Text)
- `invoice_url` (Text/URL - optional)
- `next_billing_date` (Text)
- `dashboard_url` (Text/URL)
- `support_email` (Text)
- `app_name` (Text)

### **HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Receipt</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
    color: #1a1a1a;
    line-height: 1.6;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    padding: 40px 30px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .content {
    padding: 40px 30px;
  }
  .content p {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #374151;
  }
  .receipt-box {
    background-color: #f9fafb;
    border: 2px solid #10b981;
    border-radius: 8px;
    padding: 32px;
    margin: 32px 0;
  }
  .receipt-box h2 {
    margin: 0 0 24px 0;
    font-size: 20px;
    color: #1f2937;
    text-align: center;
    border-bottom: 2px solid #10b981;
    padding-bottom: 16px;
  }
  .receipt-details {
    display: table;
    width: 100%;
  }
  .receipt-row {
    display: table-row;
  }
  .receipt-label {
    display: table-cell;
    padding: 12px 0;
    font-weight: 600;
    color: #374151;
    width: 50%;
  }
  .receipt-value {
    display: table-cell;
    padding: 12px 0;
    text-align: right;
    color: #1f2937;
  }
  .amount-highlight {
    font-size: 32px;
    font-weight: 700;
    color: #10b981;
    text-align: center;
    padding: 24px 0;
    border-top: 2px solid #d1d5db;
    border-bottom: 2px solid #d1d5db;
    margin: 24px 0;
  }
  .cta-button {
    display: inline-block;
    background-color: #10b981;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
  }
  .footer {
    background-color: #f9fafb;
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    margin: 8px 0;
  }
  .footer a {
    color: #8b5cf6;
    text-decoration: none;
  }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <h1>✅ Payment Received</h1>
    <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">Your subscription payment was successful</p>
  </div>
  
  <div class="content">
    <p>Hi {{user_name}},</p>
    
    <p>This email confirms that we've received your payment for your {{app_name}} Pro subscription.</p>
    
    <div class="receipt-box">
      <h2>Payment Receipt</h2>
      
      <div class="receipt-details">
        <div class="receipt-row">
          <div class="receipt-label">Invoice Number:</div>
          <div class="receipt-value">{{invoice_number}}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Payment Date:</div>
          <div class="receipt-value">{{payment_date}}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Billing Cycle:</div>
          <div class="receipt-value">{{billing_cycle}}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Next Billing:</div>
          <div class="receipt-value">{{next_billing_date}}</div>
        </div>
      </div>
      
      <div class="amount-highlight">
        {{amount}} {{currency}}
      </div>
      
      {{#if invoice_url}}
      <div style="text-align: center; margin-top: 24px;">
        <a href="{{invoice_url}}" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">📄 Download Invoice PDF</a>
      </div>
      {{/if}}
    </div>
    
    <p>Your Pro subscription is active and all features are available to you.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{dashboard_url}}" class="cta-button">View Dashboard</a>
    </div>
    
    <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
      Questions about this payment? Reply to this email or contact us at <a href="mailto:{{support_email}}" style="color: #8b5cf6;">{{support_email}}</a>
    </p>
  </div>
  
  <div class="footer">
    <p><strong>{{app_name}}</strong></p>
    <p>Connect. Create. Collaborate.</p>
    <p style="margin-top: 16px;">
      <a href="{{dashboard_url}}">Dashboard</a> | 
      <a href="https://soundbridge.live/pricing">Pricing</a> | 
      <a href="mailto:{{support_email}}">Support</a>
    </p>
  </div>
</div>
</body>
</html>
```

---

## 3. Payment Failed Email

**Template Name:** "Payment Failed - Action Required"  
**Template ID Variable:** `SENDGRID_PAYMENT_FAILED_TEMPLATE_ID`

### **Dynamic Data Fields:**
- `user_name` (Text)
- `amount` (Text)
- `currency` (Text)
- `billing_cycle` (Text)
- `payment_date` (Text)
- `grace_period_days` (Number)
- `grace_period_end_date` (Text)
- `update_payment_url` (Text/URL)
- `dashboard_url` (Text/URL)
- `support_email` (Text)
- `app_name` (Text)

### **HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Failed - Action Required</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
    color: #1a1a1a;
    line-height: 1.6;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    padding: 40px 30px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .content {
    padding: 40px 30px;
  }
  .content p {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #374151;
  }
  .warning-box {
    background-color: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 24px;
    margin: 32px 0;
    border-radius: 8px;
  }
  .warning-box p {
    margin: 8px 0;
    font-size: 15px;
    color: #92400e;
  }
  .warning-box strong {
    font-size: 18px;
    display: block;
    margin-bottom: 12px;
  }
  .details-box {
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 24px;
    margin: 32px 0;
  }
  .details-box p {
    margin: 8px 0;
    font-size: 15px;
    color: #374151;
  }
  .details-box strong {
    color: #1f2937;
    display: inline-block;
    min-width: 160px;
  }
  .urgency-box {
    background-color: #fee2e2;
    border: 2px solid #ef4444;
    border-radius: 8px;
    padding: 24px;
    margin: 32px 0;
    text-align: center;
  }
  .urgency-box p {
    margin: 8px 0;
    font-size: 16px;
    color: #991b1b;
    font-weight: 600;
  }
  .cta-button {
    display: inline-block;
    background-color: #f59e0b;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
  }
  .footer {
    background-color: #f9fafb;
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    margin: 8px 0;
  }
  .footer a {
    color: #8b5cf6;
    text-decoration: none;
  }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <h1>⚠️ Payment Failed</h1>
    <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">Action required to keep your subscription</p>
  </div>
  
  <div class="content">
    <p>Hi {{user_name}},</p>
    
    <p>We were unable to process your payment for your {{app_name}} Pro subscription. Your payment method may have expired, been declined, or insufficient funds were available.</p>
    
    <div class="warning-box">
      <strong>⚠️ Your subscription is at risk</strong>
      <p>You have <strong>{{grace_period_days}} days</strong> to update your payment method before your account is downgraded to the Free tier.</p>
    </div>
    
    <div class="details-box">
      <p><strong>Payment Details:</strong></p>
      <p><strong>Amount Attempted:</strong> {{amount}} {{currency}}</p>
      <p><strong>Billing Cycle:</strong> {{billing_cycle}}</p>
      <p><strong>Payment Date:</strong> {{payment_date}}</p>
      <p><strong>Grace Period Ends:</strong> {{grace_period_end_date}}</p>
    </div>
    
    <div class="urgency-box">
      <p>⏰ Update your payment method by {{grace_period_end_date}} to keep your Pro features!</p>
    </div>
    
    <p><strong>What happens if you don't update your payment method?</strong></p>
    <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
      <li>Your account will be downgraded to the Free tier</li>
      <li>You'll lose access to Pro features</li>
      <li>Upload limits will revert to 3 lifetime uploads</li>
      <li>Search and message limits will revert to Free tier limits</li>
    </ul>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{update_payment_url}}" class="cta-button">Update Payment Method</a>
    </div>
    
    <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
      Need help? Reply to this email or contact us at <a href="mailto:{{support_email}}" style="color: #8b5cf6;">{{support_email}}</a>
    </p>
  </div>
  
  <div class="footer">
    <p><strong>{{app_name}}</strong></p>
    <p>Connect. Create. Collaborate.</p>
    <p style="margin-top: 16px;">
      <a href="{{dashboard_url}}">Dashboard</a> | 
      <a href="{{update_payment_url}}">Update Payment</a> | 
      <a href="mailto:{{support_email}}">Support</a>
    </p>
  </div>
</div>
</body>
</html>
```

---

## 4. Account Downgraded Email

**Template Name:** "Account Downgraded - Subscription Ended"  
**Template ID Variable:** `SENDGRID_ACCOUNT_DOWNGRADED_TEMPLATE_ID`

### **Dynamic Data Fields:**
- `user_name` (Text)
- `downgrade_reason` (Text)
- `downgrade_date` (Text)
- `reactivate_url` (Text/URL)
- `dashboard_url` (Text/URL)
- `support_email` (Text)
- `app_name` (Text)

### **HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Subscription Has Ended</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
    color: #1a1a1a;
    line-height: 1.6;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    padding: 40px 30px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .content {
    padding: 40px 30px;
  }
  .content p {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #374151;
  }
  .info-box {
    background-color: #f3f4f6;
    border-left: 4px solid #6b7280;
    padding: 24px;
    margin: 32px 0;
    border-radius: 8px;
  }
  .info-box p {
    margin: 8px 0;
    font-size: 15px;
    color: #374151;
  }
  .details-box {
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 24px;
    margin: 32px 0;
  }
  .details-box p {
    margin: 8px 0;
    font-size: 15px;
    color: #374151;
  }
  .details-box strong {
    color: #1f2937;
    display: inline-block;
    min-width: 140px;
  }
  .features-list {
    background-color: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 24px;
    margin: 32px 0;
  }
  .features-list h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #92400e;
  }
  .features-list ul {
    margin: 0;
    padding-left: 24px;
    color: #78350f;
  }
  .features-list li {
    margin: 8px 0;
    font-size: 15px;
  }
  .cta-button {
    display: inline-block;
    background-color: #8b5cf6;
    color: #ffffff;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
  }
  .footer {
    background-color: #f9fafb;
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    margin: 8px 0;
  }
  .footer a {
    color: #8b5cf6;
    text-decoration: none;
  }
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <h1>Your Pro Subscription Has Ended</h1>
    <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">Your account has been downgraded to Free tier</p>
  </div>
  
  <div class="content">
    <p>Hi {{user_name}},</p>
    
    <p>{{downgrade_reason}}</p>
    
    <div class="info-box">
      <p><strong>Effective Date:</strong> {{downgrade_date}}</p>
      <p>Your account has been downgraded to the Free tier. You now have access to Free tier features only.</p>
    </div>
    
    <div class="details-box">
      <p><strong>What Changed:</strong></p>
      <p>• Upload limit: 3 lifetime uploads (was 10 per month)</p>
      <p>• Search limit: 5 searches per month (was unlimited)</p>
      <p>• Message limit: 3 messages per month (was unlimited)</p>
      <p>• Advanced Analytics: No longer available</p>
      <p>• Custom Branding: No longer available</p>
      <p>• Priority Support: No longer available</p>
    </div>
    
    <div class="features-list">
      <h3>💎 Get Pro Features Back</h3>
      <p style="color: #78350f; margin-bottom: 12px;">Upgrade back to Pro to regain access to:</p>
      <ul>
        <li>10 uploads per month</li>
        <li>Unlimited searches and messages</li>
        <li>Advanced analytics</li>
        <li>Custom branding</li>
        <li>Revenue sharing</li>
        <li>Priority support</li>
      </ul>
    </div>
    
    <p><strong>Important:</strong> Your existing content remains safe. If you have more than 3 tracks, you can choose which 3 to keep public. The rest will become private until you upgrade again.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{reactivate_url}}" class="cta-button">Reactivate Pro Subscription</a>
    </div>
    
    <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
      Questions? Reply to this email or contact us at <a href="mailto:{{support_email}}" style="color: #8b5cf6;">{{support_email}}</a>
    </p>
  </div>
  
  <div class="footer">
    <p><strong>{{app_name}}</strong></p>
    <p>Connect. Create. Collaborate.</p>
    <p style="margin-top: 16px;">
      <a href="{{dashboard_url}}">Dashboard</a> | 
      <a href="{{reactivate_url}}">Upgrade to Pro</a> | 
      <a href="mailto:{{support_email}}">Support</a>
    </p>
    <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
      You can reactivate your Pro subscription at any time. We'd love to have you back!
    </p>
  </div>
</div>
</body>
</html>
```

---

## 📝 **Template Setup Checklist**

For each template:

1. ✅ Create template in SendGrid dashboard
2. ✅ Add version (HTML)
3. ✅ Paste HTML code
4. ✅ Add all dynamic data fields listed
5. ✅ Set default subject line (shown in template)
6. ✅ Preview and test with sample data
7. ✅ Save and copy Template ID
8. ✅ Add Template ID to environment variables

---

## 🎨 **Design Notes**

- **Brand Colors:** Purple (#8b5cf6) for primary actions, Green (#10b981) for success, Orange (#f59e0b) for warnings
- **Typography:** System font stack for best compatibility
- **Responsive:** Works on mobile and desktop
- **Accessibility:** High contrast, readable fonts
- **Branding:** Consistent with SoundBridge brand

---

**Last Updated:** December 3, 2025  
**Ready for:** SendGrid Template Creation
