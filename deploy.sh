#!/bin/bash
# deploy.sh — Build Expo web + deploy snail-books to iOS simulator
# Usage: ./deploy.sh [sim|phone]
set -e
cd "$(dirname "$0")"

TARGET="${1:-sim}"

echo "Building snail-books for iOS..."

# Step 1: Build Expo web
echo "→ Building Expo web frontend..."
cd ../snail-books-web
npm run build:web 2>&1 | tail -3
cd - > /dev/null

# Step 2: Sync www/ from Expo dist
echo "→ Syncing www/ from Expo build..."
/bin/rm -rf www/js www/css www/index.html www/manifest.json 2>/dev/null || true
cp -r ../snail-books-web/dist/* www/

# Step 3: Ensure static assets
/bin/mkdir -p www/static
for img in bg.jpg logo.jpg; do
  if [ -f "www/img/$img" ] && [ ! -f "www/static/$img" ]; then
    cp "www/img/$img" "www/static/$img"
  fi
done
echo "www/ synced"

# Step 4: Capacitor copy
echo "→ Copying to iOS project..."
npx cap copy ios 2>&1 | tail -2

# Step 5: Build & run
if [ "$TARGET" = "phone" ]; then
  echo "Building for real device..."
  cd ios/App
  xcodebuild -project App.xcodeproj -scheme App \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates \
    build 2>&1 | tail -5
  echo "Phone build done. Open Xcode to install on device."
else
  echo "Building for simulator..."

  # Find available iPhone simulator
  SIM_NAME=$(xcrun simctl list devices available iPhone | grep -m1 "iPhone" | sed -E 's/^[[:space:]]+(.+) \([A-F0-9-]+\) .*/\1/')
  if [ -z "$SIM_NAME" ]; then
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

  APP_PATH=$(find "$BUILD_DIR" -name "App.app" -maxdepth 3 | head -1)
  if [ -z "$APP_PATH" ]; then
    echo "App.app not found in build output"
    exit 1
  fi

  xcrun simctl terminate booted com.lanx.snailbooks 2>/dev/null || true
  sleep 1
  xcrun simctl install booted "$APP_PATH"
  xcrun simctl launch booted com.lanx.snailbooks
  echo "App launched on simulator"
fi

cd "$(dirname "$0")"
