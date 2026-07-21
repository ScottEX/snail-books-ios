#!/bin/bash
# deploy.sh — Build and launch snail-books iOS app
#
# Modes:
#   ./deploy.sh sim   → Build Debug and launch on iPhone simulator (default)
#   ./deploy.sh phone → Build for a connected real device
#
# Metro (the JS bundler) is required. Run it in another terminal first:
#   cd snail-books-ios && npx expo start

set -e
cd "$(dirname "$0")"

TARGET="${1:-sim}"

case "$TARGET" in
  sim)
    echo "📱 Build & launch on simulator (Debug, attaches to running Metro)"
    npx expo run:ios --no-bundler
    ;;
  phone)
    echo "📲 Build for connected device (Debug, requires running Metro)"
    npx expo run:ios --device --no-bundler
    ;;
  *)
    echo "Usage: ./deploy.sh [sim|phone]"
    exit 1
    ;;
esac
