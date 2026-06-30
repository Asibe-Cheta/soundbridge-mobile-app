#!/usr/bin/env bash
# Production OTA gate — requires explicit confirmation and bundle verification.
# Usage: npm run ota -- --message "your message"
#        SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota -- --message "..."

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MESSAGE=""
EXTRA_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == --message && -n "${2:-}" ]]; then
    MESSAGE="$2"
    shift
  elif [[ "$arg" == --message=* ]]; then
    MESSAGE="${arg#--message=}"
  else
    EXTRA_ARGS+=("$arg")
  fi
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

echo "Exporting iOS + Android bundle to dist/ …"
rm -rf dist
npx expo export --platform ios --platform android --output-dir dist

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
echo "Uploading to production …"

EAS_SKIP_AUTO_FINGERPRINT=1 npx eas update \
  --channel production \
  --non-interactive \
  --skip-bundler \
  --input-dir dist \
  --message "$MESSAGE" \
  "${EXTRA_ARGS[@]}"

echo ""
echo "✓ Published. Users need force-quit → reopen (×2) to apply."
