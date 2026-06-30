#!/usr/bin/env bash
# Republish a previous known-good update group to production (rollback forward).
# Usage: SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota:republish -- --group <GROUP_ID> --message "..."

set -euo pipefail

if [[ "${SB_OTA_CONFIRM:-}" != "YES_I_PUBLISH_TO_LIVE_USERS" ]]; then
  echo "BLOCKED: Set SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS"
  exit 1
fi

GROUP=""
MESSAGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --group) GROUP="$2"; shift 2 ;;
    --group=*) GROUP="${1#--group=}"; shift ;;
    --message) MESSAGE="$2"; shift 2 ;;
    --message=*) MESSAGE="${1#--message=}"; shift ;;
    *) shift ;;
  esac
done

if [[ -z "$GROUP" || -z "$MESSAGE" ]]; then
  echo "Usage: SB_OTA_CONFIRM=YES_I_PUBLISH_TO_LIVE_USERS npm run ota:republish -- --group <GROUP_ID> --message \"...\""
  exit 1
fi

echo "Republishing group $GROUP to production …"
echo "Message: $MESSAGE"
echo ""

EAS_SKIP_AUTO_FINGERPRINT=1 npx eas update:republish \
  --group "$GROUP" \
  --destination-channel production \
  --message "$MESSAGE" \
  --non-interactive

echo "✓ Republished. Users need force-quit → reopen (×2) to apply."
