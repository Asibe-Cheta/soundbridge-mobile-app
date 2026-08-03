#!/usr/bin/env bash
# Production OTA gate — requires explicit confirmation and bundle verification.
# Usage: npm run ota -- --message "your message"
#        SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota -- --message "..."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MESSAGE=""
KEEP_DIST=0
EXTRA_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --message)
      MESSAGE="${2:-}"
      shift 2
      ;;
    --message=*)
      MESSAGE="${1#--message=}"
      shift
      ;;
    --keep-dist)
      KEEP_DIST=1
      shift
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "ERROR: --message is required."
  echo 'Example: SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota -- --message "fix: ..."'
  exit 1
fi

echo "══════════════════════════════════════════════════════════════"
echo "  PRODUCTION OTA — LIVE USERS (channel: production)"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "Message: $MESSAGE"
echo "Runtime: $(node -p "require('./app.json').expo.version")"
echo ""
echo "Git HEAD: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
echo ""
echo "Uncommitted changes (working tree is what gets bundled):"
git status --short 2>/dev/null | head -30 || true
UNCOMMITTED=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -gt 30 ]]; then
  echo "  … and $((UNCOMMITTED - 30)) more files"
fi
echo ""

if git diff --name-only HEAD -- App.tsx 2>/dev/null | grep -q App.tsx; then
  echo "⚠️  App.tsx differs from git HEAD — bundle will NOT match commit hash on EAS."
  echo "   HEAD tab: $(git show HEAD:App.tsx 2>/dev/null | grep -E 'component=\{.*Screen\}' | head -1 || echo 'unknown')"
  echo "   Working tree uses TestFeed if present: $(grep -E 'TestFeedScreen|FeedScreen' App.tsx | head -1 || echo 'unknown')"
  echo ""
fi

if [[ "$MESSAGE" == investigate:* || "$MESSAGE" == diag:* || "$MESSAGE" == *"investigate:"* || "$MESSAGE" == *"diag:"* ]]; then
  if [[ "${SB_OTA_DIAG_OK:-}" != "YES" ]]; then
    echo "ERROR: Diagnostic/investigation OTAs require SB_OTA_DIAG_OK=YES"
    echo "       Production users should not receive debug builds without explicit opt-in."
    exit 1
  fi
fi

if [[ "${SB_OTA_CONFIRM:-}" != "YES_I_PUBLISH_TO_LIVE_USERS" ]]; then
  echo "BLOCKED: Set SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS to publish."
  echo ""
  echo "  SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota -- --message \"...\""
  exit 1
fi

if [[ "$KEEP_DIST" == 1 ]]; then
  echo "Skipping export (--keep-dist) — using existing dist/ …"
  if [[ ! -d dist/_expo/static/js ]]; then
    echo "ERROR: dist/ is missing or incomplete. Remove --keep-dist to re-export."
    exit 1
  fi
else
  echo "Exporting iOS + Android bundle to dist/ …"
  rm -rf dist
  npx expo export --platform ios --platform android --output-dir dist
fi

IOS_BUNDLE=$(find dist/_expo/static/js/ios -name '*.hbc' 2>/dev/null | head -1)
if [[ -z "$IOS_BUNDLE" ]]; then
  echo "ERROR: iOS bundle not found in dist/"
  exit 1
fi

echo "Verifying bundle markers …"
if [[ "$MESSAGE" == investigate:* || "$MESSAGE" == diag:* || "$MESSAGE" == *"investigate:"* || "$MESSAGE" == *"diag:"* ]]; then
  MARKERS=(runEmbeddedOtaDiagnosticsOnLaunch)
else
  MARKERS=(TestFeedScreen TestUploadScreen disableAuthListener)
fi
MISSING=()
for m in "${MARKERS[@]}"; do
  if ! python3 -c "import sys; sys.exit(0 if open(sys.argv[1],'rb').read().find(sys.argv[2].encode())>=0 else 1)" "$IOS_BUNDLE" "$m"; then
    MISSING+=("$m")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Bundle missing expected markers: ${MISSING[*]}"
  echo "       This usually means the export used git HEAD, not the full working tree."
  echo "       Aborting — fix working tree or markers before publishing to production."
  exit 1
fi

echo "✓ Bundle contains: ${MARKERS[*]}"
echo ""
echo "Uploading to production (platforms separately, auto-retry with new pipeline on timeout) …"

_eas_upload() {
  local platform="$1"
  EXPO_UNSTABLE_USE_NEW_UPLOAD_PIPELINE=1 EAS_SKIP_AUTO_FINGERPRINT=1 eas update \
    --channel production \
    --platform "$platform" \
    --non-interactive \
    --skip-bundler \
    --input-dir dist \
    --message "$MESSAGE" \
    ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}
}

# iOS — first attempt
if _eas_upload ios; then
  echo ""
  echo "iOS published."
else
  echo ""
  echo "iOS first attempt timed out. Retrying once …"
  _eas_upload ios
  echo ""
  echo "iOS published."
fi

echo "Uploading Android …"

# Android — first attempt
if _eas_upload android; then
  echo ""
  echo "Android published."
else
  echo ""
  echo "Android first attempt timed out. Retrying once …"
  _eas_upload android
  echo ""
  echo "Android published."
fi

echo ""
echo "✓ Published (iOS + Android). Users need force-quit → reopen (×2) to apply."
