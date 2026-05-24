#!/bin/bash
# deploy.sh — Deploy snail-books to simulator or real device
# Usage: ./deploy.sh [sim|phone]
#   sim  → dev server mode (no rebuild needed after first time)
#   phone → bundled mode (self-contained)

set -e
cd "$(dirname "$0")"
TARGET="${1:-sim}"
CONFIG="capacitor.config.json"

if [ "$TARGET" = "phone" ]; then
  echo "📱 Deploying for real device (bundled mode)..."
  # Remove dev server URL
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
if 'url' in c.get('server', {}):
    del c['server']['url']
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
"
  npx cap copy ios
  cd ios/App
  xcodebuild -project App.xcodeproj -scheme App \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates \
    build 2>&1 | tail -5
  echo "✅ Phone build done. Open Xcode to install on device."
else
  echo "🖥  Deploying for simulator (dev server mode)..."
  # Ensure dev server URL is present
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
c.setdefault('server', {})['url'] = 'http://localhost:9876'
c['server']['cleartext'] = True
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
"
  npx cap copy ios
  cd ios/App
  xcodebuild -project App.xcodeproj -scheme App \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    build 2>&1 | tail -3
  xcrun simctl terminate booted com.lanx.snailbooks 2>/dev/null || true
  sleep 1
  xcrun simctl install booted \
    "$HOME/Library/Developer/Xcode/DerivedData/App-cjijclanzkrtjlerkiwabkmnrdwt/Build/Products/Debug-iphonesimulator/App.app"
  xcrun simctl launch booted com.lanx.snailbooks
  echo "✅ Simulator deployed. Edit www/ files → kill & reopen app."
fi
