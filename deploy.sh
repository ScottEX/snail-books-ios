#!/bin/bash
# deploy.sh — Deploy snail-books to iOS simulator
# Usage:
#   ./deploy.sh dev    → 热更新模式（连 Expo dev server，改代码即时刷新）
#   ./deploy.sh sim    → 离线模式（bundled 构建，和 App Store 一致）
#   ./deploy.sh phone  → 真机构建
#
# 热更新模式：
#   1. 先在 snail-books-web 里 npm run web（保持运行）
#   2. 再跑 ./deploy.sh dev（只需首次 build，之后改 React 代码不用 rebuild）
#   3. iOS App 内容从 dev server 实时加载，HMR 自动刷新

set -e
cd "$(dirname "$0")"

TARGET="${1:-sim}"
CONFIG="capacitor.config.json"

dev_mode() {
  echo "🔥 Hot-reload dev mode"
  echo "   Make sure 'cd ../snail-books-web && npm run web' is running"

  # Set capacitor to load from Expo web dev server
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
c.setdefault('server', {})['url'] = 'http://localhost:19006'
c['server']['cleartext'] = True
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
print('  server.url = http://localhost:8081')
"

  # Still need to sync www/ for initial assets (static/, img/)
  /bin/rm -rf www/js www/css www/index.html www/manifest.json 2>/dev/null || true
  cp -r ../snail-books-web/dist/* www/ 2>/dev/null || true
  /bin/mkdir -p www/static
  for img in bg.jpg logo.jpg; do
    [ -f "www/img/$img" ] && [ ! -f "www/static/$img" ] && cp "www/img/$img" "www/static/$img"
  done

  build_and_run
}

offline_mode() {
  echo "📦 Bundled mode"

  # Remove dev server URL
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
if 'server' in c and 'url' in c['server']:
    del c['server']['url']
if 'server' in c and 'cleartext' in c['server']:
    del c['server']['cleartext']
# Remove empty server key
if 'server' in c and not c['server']:
    del c['server']
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
print('  server config removed')
"

  # Build Expo web
  echo "→ Building Expo web frontend..."
  cd ../snail-books-web
  npm run build:web 2>&1 | tail -3
  cd - > /dev/null

  # Sync www/
  echo "→ Syncing www/ from Expo build..."
  /bin/rm -rf www/js www/css www/index.html www/manifest.json 2>/dev/null || true
  cp -r ../snail-books-web/dist/* www/
  /bin/mkdir -p www/static
  for img in bg.jpg logo.jpg; do
    [ -f "www/img/$img" ] && [ ! -f "www/static/$img" ] && cp "www/img/$img" "www/static/$img"
  done
  echo "  www/ synced"

  build_and_run
}

build_and_run() {
  echo "→ Copying to iOS project..."
  npx cap copy ios 2>&1 | tail -2

  if [ "$TARGET" = "phone" ]; then
    echo "Building for real device..."
    cd ios/App
    xcodebuild -project App.xcodeproj -scheme App \
      -destination 'generic/platform=iOS' \
      -allowProvisioningUpdates \
      build 2>&1 | tail -5
    echo "Phone build done. Open Xcode to install on device."
    return
  fi

  echo "Building for simulator..."

  SIM_NAME="iPhone 17"
  if ! xcrun simctl list devices available | grep -q "iPhone 17"; then
    SIM_NAME="iPhone 16 Pro"
  fi
  echo "   Using simulator: $SIM_NAME"

  cd ios/App
  BUILD_DIR="$(pwd)/build"
  xcodebuild -project App.xcodeproj -scheme App \
    -configuration Debug \
    -destination "platform=iOS Simulator,name=$SIM_NAME" \
    -derivedDataPath "$BUILD_DIR" \
    build 2>&1 | tail -5

  APP_PATH=$(find "$BUILD_DIR" -name "App.app" -maxdepth 5 | head -1)
  if [ -z "$APP_PATH" ]; then
    echo "App.app not found in build output"
    exit 1
  fi

  xcrun simctl terminate booted com.lanx.snailbooks 2>/dev/null || true
  sleep 1

  # Boot simulator if needed
  if ! xcrun simctl list devices booted | grep -q "Booted"; then
    xcrun simctl boot "$SIM_NAME" 2>/dev/null || true
    sleep 3
  fi

  xcrun simctl install booted "$APP_PATH"
  xcrun simctl launch booted com.lanx.snailbooks

  if [ "$TARGET" = "dev" ]; then
    echo ""
    echo "✅ Dev mode active — edit React code in snail-books-web/src/ and the iOS app will hot-reload"
  else
    echo "App launched on simulator"
  fi
}

case "$TARGET" in
  dev)
    dev_mode
    ;;
  sim)
    offline_mode
    ;;
  phone)
    TARGET=phone offline_mode
    ;;
  *)
    echo "Usage: ./deploy.sh [dev|sim|phone]"
    exit 1
    ;;
esac

cd "$(dirname "$0")"
