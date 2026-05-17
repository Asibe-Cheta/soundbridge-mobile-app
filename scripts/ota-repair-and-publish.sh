#!/usr/bin/env bash
# Repair truncated node_modules and publish production OTA.
# Run from Terminal.app (not Cursor) — Desktop/iCloud paths can stall file reads.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Kill stuck export/metro processes"
pkill -9 -f "soundbridge-mobile-app.*(export|cli export)" 2>/dev/null || true
pkill -9 -f "@expo/cli/build/bin/cli export" 2>/dev/null || true

echo "==> Ghost folder check (should be 0)"
ghosts=$(ls node_modules 2>/dev/null | grep -E ' [0-9]' | wc -l | tr -d ' ')
if [ "$ghosts" != "0" ]; then
  echo "ERROR: $ghosts ghost folders in node_modules — move them out before continuing."
  exit 1
fi

repair_babel() {
  local base="$1" ver="$2"
  curl -fsSL "https://registry.npmjs.org/@babel/${base}/-/${base}-${ver}.tgz" -o "/tmp/${base}.tgz"
  rm -rf "node_modules/@babel/${base}"
  mkdir -p "node_modules/@babel/${base}"
  tar -xzf "/tmp/${base}.tgz" -C "node_modules/@babel/${base}" --strip-components=1
}

echo "==> Repair critical Babel packages"
repair_babel "helper-validator-option" "7.27.1"
repair_babel "helper-compilation-targets" "7.27.1"
repair_babel "compat-data" "7.27.1"
curl -fsSL "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz" -o /tmp/yallist.tgz
rm -rf node_modules/yallist && mkdir -p node_modules/yallist
tar -xzf /tmp/yallist.tgz -C node_modules/yallist --strip-components=1

echo "==> Restore react-native if stripped (<50MB)"
rn_size=$(du -sm node_modules/react-native 2>/dev/null | cut -f1)
if [ "${rn_size:-0}" -lt 50 ]; then
  curl -fsSL "https://registry.npmjs.org/react-native/-/react-native-0.81.5.tgz" -o /tmp/react-native.tgz
  rm -rf node_modules/react-native
  mkdir -p node_modules/react-native
  tar -xzf /tmp/react-native.tgz -C node_modules/react-native --strip-components=1
fi

echo "==> Babel smoke test"
node -e "require('@babel/core').transformSync('1+1',{configFile:false,babelrc:false}); console.log('babel ok');"

echo "==> npm install (restores missing packages; may take several minutes)"
npm install --no-audit --no-fund --legacy-peer-deps

echo "==> node_modules size (expect ~500MB+)"
du -sh node_modules

echo "==> Export bundles"
CI=1 EXPO_NO_TELEMETRY=1 NODE_ENV=production \
  node ./node_modules/@expo/cli/build/bin/cli export \
  --output-dir dist -p ios -p android --dump-assetmap --clear --max-workers 1

echo "==> Verify assetmap (bg03.png only, not .jpg)"
grep -E 'bg03\.(png|jpg)' dist/assetmap.json || true

echo "==> Publish to production"
EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_NO_DEPENDENCY_VALIDATION=1 eas update \
  --branch production \
  --message "fix: remove live_interest_enabled column from audio_tracks queries" \
  --non-interactive

echo "==> Done. Restore expo-build-properties in app.json plugins when confirmed."
