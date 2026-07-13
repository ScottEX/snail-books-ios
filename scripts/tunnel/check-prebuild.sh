#!/bin/bash
# Guard: verify AppDelegate.mm still has the frp tunnel jsLocation override.
# Run as a post-prebuild / postinstall hook to prevent accidental removal.

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DELEGATE="$PROJECT_ROOT/ios/app/AppDelegate.mm"
REQUIRED_LINE='setJsLocation:@"8.135.58.90:8081"'

if ! grep -qF "$REQUIRED_LINE" "$APP_DELEGATE" 2>/dev/null; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  HOT UPDATE TUNNEL MAY BE BROKEN                        ║"
  echo "║──────────────────────────────────────────────────────────────║"
  echo "║  $APP_DELEGATE   ║"
  echo "║  is missing:                                                 ║"
  echo "║  [[RCTBundleURLProvider sharedSettings] setJsLocation:...]   ║"
  echo "║──────────────────────────────────────────────────────────────║"
  echo "║  Fix: re-add the line or run scripts/tunnel/fix-prebuild.sh  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

echo "✅ AppDelegate tunnel config intact"
