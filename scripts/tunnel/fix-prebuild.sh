#!/bin/bash
# Auto-fix: re-apply the tunnel jsLocation override after expo prebuild.
# Reads from scripts/tunnel/frpc.toml to get the remote host.

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DELEGATE="$PROJECT_ROOT/ios/app/AppDelegate.mm"
REMOTE_HOST="8.135.58.90:8081"
GUARD_LINE="setJsLocation:@\"${REMOTE_HOST}\""

if grep -qF "$GUARD_LINE" "$APP_DELEGATE" 2>/dev/null; then
  echo "✅ tunnel config already present in AppDelegate"
  exit 0
fi

echo "🔧 re-applying tunnel config to AppDelegate..."

# Insert after the #if DEBUG line, before the return
sed -i '' '/^#if DEBUG$/,/^#else$/{ /^#if DEBUG$/a\
  // Use frp tunnel for remote device development\
  [[RCTBundleURLProvider sharedSettings] '"${GUARD_LINE}"'];
}' "$APP_DELEGATE"

echo "✅ tunnel config restored"
