#!/bin/bash
# deploy.sh — Build and install snail-books iOS app (Debug)
#
# Modes:
#   ./deploy.sh sim   → Build Debug and launch on iPhone simulator (default)
#   ./deploy.sh phone → Build Debug and install to connected real device
#
# Metro (the JS bundler) is required. Run it in another terminal first:
#   cd snail-books-ios && npx expo start

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-sim}"
DEVICE_ID="${2:-00008150-000231920244401C}"

case "$TARGET" in
  sim)
    echo "📱 Build & launch on simulator (Debug, attaches to running Metro)"
    cd "$PROJECT_ROOT" && npx expo run:ios --no-bundler
    ;;
  phone)
    echo "📲 Build & install to device (Debug, requires running Metro)"
    cd "$PROJECT_ROOT/ios" && pod install --silent && cd "$PROJECT_ROOT"
    xcodebuild \
      -workspace "$PROJECT_ROOT/ios/app.xcworkspace" \
      -scheme app \
      -configuration Debug \
      -destination "id=${DEVICE_ID}" \
      -allowProvisioningUpdates \
      build
    echo "📲 安装到设备..."
    xcrun devicectl device install app \
      --device "$DEVICE_ID" \
      ~/Library/Developer/Xcode/DerivedData/app-*/Build/Products/Debug-iphoneos/app.app
    echo "✅ 开发包安装完成"
    ;;
  *)
    echo "Usage: ./deploy.sh [sim|phone] [device_udid]"
    exit 1
    ;;
esac
