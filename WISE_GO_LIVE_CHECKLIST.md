# Wise Payout System - Go Live Checklist

**Date:** December 29, 2025
**Status:** Pre-Production
**Target:** Production Launch

---

## ✅ Pre-Launch Verification

### Phase 1: Environment Setup (5 min)

- [ ] **Verify environment variables are set**
  ```bash
  node scripts/verify-wise-webhook.js
  ```
  Expected: All checks pass ✅

- [ ] **Check Wise account balance**
  ```bash
  node scripts/check-wise-balance.js
  ```
  Expected: All balances above thresholds ✅

- [ ] **Verify webhook subscription is active**
  ```bash
  node scripts/list-wise-webhooks.js
  ```
  Expected: Shows active webhook ✅

---

### Phase 2: Integration Testing (15 min)

- [ ] **Test webhook delivery**
  ```bash
  node scripts/test-wise-webhook.js $WISE_WEBHOOK_SUBSCRIPTION_ID
  ```
  Expected: Test notification sent ✅

  Then check Vercel logs:
  - [ ] Log shows "Wise webhook POST request received" ✅
  - [ ] Event processed without errors ✅

- [ ] **Verify database schema**
  ```sql
  -- Run in Supabase SQL Editor
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'wise_payouts'
  ORDER BY ordinal_position;
  ```
  Expected: All 25+ columns present ✅

- [ ] **Test database queries**
  ```sql
  -- Should return empty or existing payouts
  SELECT COUNT(*) FROM wise_payouts WHERE deleted_at IS NULL;
  ```
  Expected: Query runs successfully ✅

---

### Phase 3: End-to-End Test (30 min)

- [ ] **Prepare test account**
  - [ ] Identify test creator account
  - [ ] Verify test bank account details (use your own account!)
  - [ ] Decide test amount (recommend ₦100 = ~$0.07)

- [ ] **Update test configuration**
  ```typescript
  // Edit scripts/test-wise-payout-e2e.ts
  const TEST_CONFIG = {
    creatorId: 'YOUR_REAL_CREATOR_ID',
    amount: 100, // Small test amount
    currency: 'NGN',
    bankAccountNumber: 'YOUR_REAL_ACCOUNT',
    bankCode: '044', // Your bank
    accountHolderName: 'YOUR_NAME',
  };
  ```

- [ ] **Run end-to-end test**
  ```bash
  npx ts-node scripts/test-wise-payout-e2e.ts
  ```

  Expected Results:
  - [ ] Payout created in database ✅
  - [ ] Wise transfer initiated ✅
  - [ ] Transfer ID returned ✅
  - [ ] Webhook received within 60 seconds ✅
  - [ ] Database status updated to completed ✅
  - [ ] Funds arrive in bank account (verify manually) ✅

- [ ] **Verify in Wise Dashboard**
  - [ ] Login to https://wise.com/
  - [ ] Check recent transfers
  - [ ] Verify test transfer shows "Completed" ✅

---

## 🚀 Launch Preparation

### Phase 4: Monitoring Setup (30 min)

- [ ] **Set up daily balance check**

  **Option A: Cron Job (Recommended)**
  ```bash
  # Add to crontab: crontab -e
  0 9 * * * cd /path/to/soundbridge-mobile-app && node scripts/check-wise-balance.js
  ```

  **Option B: CI/CD Schedule**
  - Add to GitHub Actions or similar
  - Run daily at 9 AM
  - Send alert if balance low

- [ ] **Configure Vercel alerts**
  - [ ] Go to Vercel Dashboard → Project → Settings → Notifications
  - [ ] Enable "Function Errors" alerts
  - [ ] Set threshold: >5 errors in 5 minutes
  - [ ] Add team email addresses

- [ ] **Set up database monitoring**
  - [ ] Create saved query in Supabase for stuck payouts
  - [ ] Schedule to run hourly (if Supabase supports)
  - [ ] Or set reminder to check manually daily

- [ ] **Create Slack webhook (optional but recommended)**
  ```javascript
  // Add to scripts/check-wise-balance.js
  const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
  ```

---

### Phase 5: Documentation Review (15 min)

- [ ] **Read monitoring guide**
  - [ ] Review [WISE_PRODUCTION_MONITORING_GUIDE.md](WISE_PRODUCTION_MONITORING_GUIDE.md)
  - [ ] Bookmark for reference
  - [ ] Share with team

- [ ] **Understand error codes**
  - [ ] Review error codes in [WISE_PAYOUT_IMPLEMENTATION_COMPLETE.md](WISE_PAYOUT_IMPLEMENTATION_COMPLETE.md)
  - [ ] Know which errors are retryable
  - [ ] Understand troubleshooting steps

- [ ] **Team training**
  - [ ] Share [WISE_INTEGRATION_README.md](WISE_INTEGRATION_README.md) with team
  - [ ] Walk through common operations
  - [ ] Demonstrate troubleshooting

---

## 📋 First Production Payout

### Phase 6: First Real Payout (30 min)

- [ ] **Select first payout**
  - [ ] Choose creator with verified bank details
  - [ ] Start with small amount (₦1,000 - ₦10,000)
  - [ ] Notify creator about test payout

- [ ] **Initiate payout**
  ```typescript
  // Via admin panel or API
  const result = await payoutToCreator({
    creatorId: 'verified-creator-id',
    amount: 5000, // ₦5,000
    currency: 'NGN',
    bankAccountNumber: 'creator-account',
    bankCode: 'creator-bank-code',
    accountHolderName: 'Creator Name',
    reason: 'Test payout - earnings',
  });
  ```

- [ ] **Monitor progress (Real-time)**
  - [ ] Check database: Status should be "pending" → "processing"
  - [ ] Check Vercel logs: Webhook events
  - [ ] Check Wise dashboard: Transfer status
  - [ ] Within 5 minutes: Status should be "completed" ✅

- [ ] **Verify completion**
  - [ ] Database shows status = "completed" ✅
  - [ ] `completed_at` timestamp is set ✅
  - [ ] `wise_status_history` has entries ✅
  - [ ] Creator confirms funds received ✅

---

## 🎯 Production Launch

### Phase 7: Go Live! (Ongoing)

- [ ] **Start with low volume**
  - [ ] Process 1-5 payouts manually
  - [ ] Monitor each one closely
  - [ ] Document any issues

- [ ] **Gradually increase volume**
  - [ ] Week 1: 5-10 payouts/day
  - [ ] Week 2: 10-20 payouts/day
  - [ ] Week 3: 20-50 payouts/day
  - [ ] Month 2+: Full production volume

- [ ] **Daily monitoring routine**
  - [ ] Morning: Check balance
  - [ ] Morning: Review failed payouts
  - [ ] Afternoon: Check stuck payouts (>1 hour pending)
  - [ ] Evening: Review daily summary

---

## 🔍 Post-Launch Monitoring (First Week)

### Daily Tasks

- [ ] **Day 1**
  - [ ] Check webhook is receiving events
  - [ ] Verify all payouts completed successfully
  - [ ] Review Vercel logs for any warnings
  - [ ] Confirm creators received funds
  - [ ] Document any issues

- [ ] **Day 2-3**
  - [ ] Review success rate (should be >95%)
  - [ ] Check average processing time (should be <5 min)
  - [ ] Identify any patterns in failures
  - [ ] Optimize if needed

- [ ] **Day 4-7**
  - [ ] Continue monitoring
  - [ ] Start batch payouts if ready
  - [ ] Fine-tune concurrency settings
  - [ ] Update documentation with learnings

---

## 📊 Success Metrics

Track these metrics in first week:

| Metric | Target | Day 1 | Day 3 | Day 7 |
|--------|--------|-------|-------|-------|
| Total Payouts | - | | | |
| Success Rate | >95% | | | |
| Avg Processing Time | <5 min | | | |
| Failed Payouts | <5% | | | |
| Stuck Payouts | 0 | | | |
| Webhook Latency | <30 sec | | | |

---

## 🐛 Troubleshooting

### If Something Goes Wrong

1. **Don't Panic!**
   - Most issues are easily fixable
   - Money is safe in Wise even if status is wrong

2. **Check Documentation**
   - [WISE_PRODUCTION_MONITORING_GUIDE.md](WISE_PRODUCTION_MONITORING_GUIDE.md) - Common issues section

3. **Run Diagnostics**
   ```bash
   # Verify webhook
   node scripts/verify-wise-webhook.js

   # Check balance
   node scripts/check-wise-balance.js

   # Check Wise API
   curl "https://api.wise.com/v1/transfers/TRANSFER_ID" \
     -H "Authorization: Bearer $WISE_API_TOKEN"
   ```

4. **Contact Support**
   - Internal: Dev team
   - External: Wise support (https://wise.com/help/)

---

## ✅ Launch Approval Sign-off

Before going live, confirm with team:

### Mobile Team Lead
- [ ] Code reviewed and approved
- [ ] Testing completed successfully
- [ ] Documentation is complete
- [ ] Monitoring is set up

**Signed:** _________________ **Date:** _________

### Backend Team Lead
- [ ] Webhook endpoint deployed and tested
- [ ] Environment variables configured
- [ ] Vercel alerts configured
- [ ] Database schema verified

**Signed:** _________________ **Date:** _________

### Product/Admin
- [ ] Business requirements met
- [ ] Legal/compliance approved (if needed)
- [ ] Support team trained
- [ ] Go-live plan approved

**Signed:** _________________ **Date:** _________

---

## 🎊 Ready to Launch!

Once all checkboxes above are complete:

### Final Steps

1. **Announce to team**
   - Notify all stakeholders
   - Share monitoring guide
   - Confirm support procedures

2. **Start processing**
   - Begin with low volume
   - Monitor closely
   - Scale gradually

3. **Celebrate! 🎉**
   - Team has done amazing work
   - System is production-ready
   - Creators can now get paid globally!

---

## 📞 Emergency Contacts

### If Production Issue Occurs

**Mobile Team:**
- Lead: [Name] - [Contact]
- On-call: [Name] - [Contact]

**Backend Team:**
- Lead: [Name] - [Contact]
- On-call: [Name] - [Contact]

**Wise Support:**
- Help: https://wise.com/help/
- Email: api@wise.com
- Phone: [Your region's support number]

---

## 📝 Post-Launch Checklist (Week 1)

- [ ] **Day 1:** Monitor constantly
- [ ] **Day 2:** Review first 24 hours
- [ ] **Day 3:** Optimize based on learnings
- [ ] **Day 7:** Weekly review meeting
- [ ] **Week 2:** Increase volume gradually
- [ ] **Month 1:** Full production scale

---

## 🎯 Launch Checklist Summary

**Essential (Must Complete):**
- ✅ Environment variables verified
- ✅ Webhook tested and working
- ✅ Database schema correct
- ✅ End-to-end test passed
- ✅ First production payout successful

**Recommended (Should Complete):**
- ⏳ Daily balance check automated
- ⏳ Vercel alerts configured
- ⏳ Team trained on monitoring
- ⏳ Documentation reviewed

**Optional (Nice to Have):**
- ⏳ Slack alerts configured
- ⏳ Admin dashboard built
- ⏳ Analytics set up

---

**When all essential items are ✅ → You're ready to launch! 🚀**

---

**Last Updated:** December 29, 2025
**Version:** 1.0
**Status:** Ready for Production
