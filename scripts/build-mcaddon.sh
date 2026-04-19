#!/bin/bash
# .mcaddon パッケージ作成 (CI/ローカル共用)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$ROOT/dist"

VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT/src/BP/manifest.json','utf8')).header.version.join('.'))")

mkdir -p "$DIST"

echo "📦 Building v$VERSION ..."

cd "$ROOT/src/BP" && zip -r "$DIST/ArltStory_BP_v${VERSION}.mcpack" . -x '.*'
cd "$ROOT/src/RP" && zip -r "$DIST/ArltStory_RP_v${VERSION}.mcpack" . -x '.*'

cd "$DIST"
zip "ArltStory_v${VERSION}.mcaddon" "ArltStory_BP_v${VERSION}.mcpack" "ArltStory_RP_v${VERSION}.mcpack"

echo "✅ Build complete: $DIST/ArltStory_v${VERSION}.mcaddon"
