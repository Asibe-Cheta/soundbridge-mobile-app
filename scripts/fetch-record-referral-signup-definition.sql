-- Read-only. Fetches the current definition of record_referral_signup so
-- it can be reviewed before any change is proposed to it (it affects
-- signup attribution, per explicit instruction not to touch it without
-- approval). Paste the full result back.

SELECT pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'record_referral_signup';
