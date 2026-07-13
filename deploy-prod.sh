#!/bin/bash
# deploy-prod.sh — Build & install production Release to device
# Usage: ./deploy-prod.sh [device_udid]
# Does NOT overwrite the debug test app (different bundle ID).

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

DEVICE_ID="${1:-00008150-000231920244401C}"
DERIVED_DATA=~/Library/Developer/Xcode/DerivedData/app-*

echo "🧹 清理旧签名缓存..."
/bin/rm -rf $DERIVED_DATA

echo "📦 同步原生依赖..."
cd "$PROJECT_ROOT/ios" && pod install --silent && cd "$PROJECT_ROOT"

echo "🏗️  构建生产包..."
xcodebuild \
  -workspace "$PROJECT_ROOT/ios/app.xcworkspace" \
  -scheme app \
  -configuration Release \
  -destination "id=${DEVICE_ID}" \
  -allowProvisioningUpdates \
  PRODUCT_BUNDLE_IDENTIFIER=com.lanx.snailbooks.prod \
  build

echo "📲 安装到设备..."
xcrun devicectl device install app \
  --device "$DEVICE_ID" \
  ~/Library/Developer/Xcode/DerivedData/app-*/Build/Products/Release-iphoneos/app.app

echo "✅ 生产包安装完成 (bundleID: com.lanx.snailbooks.prod)"
