#!/bin/bash
# deploy.sh — Build and install snail-books iOS app (Debug)
#
# Modes:
#   ./deploy.sh sim   → Build Debug and launch on iPhone simulator (default)
#   ./deploy.sh phone → Build Debug and install to connected real device
#
# Metro (the JS bundler) is required. Run it in another terminal first:
#   cd snail-books-ios && npx expo start
#
# 测试包固定从 develop 分支打包;生产包用 deploy-prod.sh(main)。
# 构建完成或失败都会自动切回原分支。

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-sim}"
DEVICE_ID="${2:-00008150-000231920244401C}"
DEV_BRANCH="develop"

cd "$PROJECT_ROOT"

# 记录原分支,结束时(含失败)自动恢复
ORIG_BRANCH="$(git branch --show-current)"
restore_branch() {
  cd "$PROJECT_ROOT" || true
  git checkout "$ORIG_BRANCH" --quiet 2>/dev/null || git checkout develop --quiet 2>/dev/null || true
}
trap restore_branch EXIT

echo "🔀 测试包固定从 $DEV_BRANCH 分支打包(原分支: $ORIG_BRANCH)"
git fetch origin "$DEV_BRANCH" --quiet
git checkout "$DEV_BRANCH" --quiet
git pull --ff-only origin "$DEV_BRANCH" --quiet 2>/dev/null || true

case "$TARGET" in
  sim)
    echo "📱 Build & launch on simulator (Debug, attaches to running Metro)"
    cd "$PROJECT_ROOT" && npx expo run:ios --no-bundler
    ;;
  phone)
    echo "📲 Build & install to device (Debug, requires running Metro)"
    find ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/ -name "*.mobileprovision" -delete 2>/dev/null
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
