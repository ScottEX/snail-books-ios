#!/bin/bash
# deploy.sh — Build and install snail-books iOS app
#
# Modes:
#   ./deploy.sh sim   → Build Debug and install on iPhone simulator (default)
#   ./deploy.sh phone → Build Debug and install to connected real device
#
# Metro (the JS bundler) is required. Run it in another terminal first:
#   cd snail-books-ios && npx expo start

set -e
cd "$(dirname "$0")"

TARGET="${1:-sim}"

case "$TARGET" in
  sim)
    echo "📱 Build & install on simulator (Debug, attaches to running Metro)"
    npx expo run:ios --no-bundler --no-launch
    ;;
  phone)
    echo "📲 Build & install to device (Debug, requires running Metro)"
    npx expo run:ios --device --no-bundler --no-launch
    ;;
  *)
    echo "Usage: ./deploy.sh [sim|phone]"
    exit 1
    ;;
esac
