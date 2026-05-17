# SoundBridge Mobile — Claude Code Rules

These rules are MANDATORY. Every agent, every session, no exceptions.

---

## OTA Updates (eas update)

**Always use the npm script — never run `eas update` directly:**

```bash
npm run ota -- --message "fix: describe what changed"
```

For preview channel:
```bash
npm run ota:preview -- --message "fix: describe what changed"
```

The `ota` script has `EAS_SKIP_AUTO_FINGERPRINT=1` built in. Running `eas update` without it will hang and fail on the fingerprint step.

**Never clear the Metro cache unless absolutely necessary.** The cache lives in `.metro-cache/` inside the project and survives reboots. Clearing it forces a full cold rebuild (~20 min). The cache location to clear if truly needed:
```bash
rm -rf .metro-cache
```
Do NOT use `expo start --clear` or delete `/var/folders/.../T/metro-cache` — `.metro-cache/` is the real cache.

---

## node_modules — Critical Rules

**node_modules is excluded from iCloud Drive** via `com.apple.fileprovider.ignore#P` xattr. This is intentional and must never be removed. iCloud evicting files is what corrupted the project before.

**If you ever delete and recreate node_modules, re-apply the iCloud exclusion immediately:**
```bash
xattr -w com.apple.fileprovider.ignore#P 1 node_modules
xattr -w com.apple.fileprovider.ignore#P 1 .metro-cache
```

**Never run `npm install --force` alone to fix corrupted packages.** npm skips packages whose version matches even if their `dist/` is empty. If corruption is detected, delete the specific broken package directories first, then reinstall.

**`npm install` is expected to print a patch-package warning — this is normal.** The postinstall is `patch-package || true` so it never blocks. Do not try to "fix" this warning.

---

## Project Structure

- **Stack:** React Native + Expo SDK 54, Supabase, Stripe + Fincra (African payments), Agora (live audio/video), RevenueCat (subscriptions)
- **OTA runtime version policy:** `appVersion` — updates only reach builds matching the current `version` in `app.json` (currently `1.4.0`)
- **EAS channel:** `production` for live users, `preview` for internal testing
- **Metro config:** `metro.config.js` — uses local node_modules only, persistent FileStore cache, custom resolver for `NativeOnrampSdkModule` (Stripe mock)
- **Payments:** Stripe for UK/EU/US, Fincra for NGN/GHS/KES (African creators)
- **Dev mode:** `bypassRevenueCat: true`, `developmentTier: 'premium'` in `src/config/environment.ts`

---

## What NOT to do

- Do NOT run `eas update` without `EAS_SKIP_AUTO_FINGERPRINT=1`
- Do NOT clear Metro cache unless you have a specific reason and the user approves
- Do NOT run `npm install --force` without first deleting the corrupted package directories
- Do NOT remove the `com.apple.fileprovider.ignore#P` attribute from `node_modules`
- Do NOT commit `.metro-cache/` (it is in `.gitignore`)
- Do NOT use `npx expo start --clear` — it tries to upgrade expo and hangs
