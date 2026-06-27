#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Bundle API Server for Android Mobile
#
# Bundles the compiled API server into a self-contained nodejs-project/
# directory suitable for inclusion as Android assets.
#
# Usage:
#   ./bundle-api-server.sh
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_SERVER_DIR="$MONOREPO_DIR/artifacts/api-server"
OUTPUT_DIR="$SCRIPT_DIR/nodejs-project"

# Ensure Node.js/pnpm are in PATH (handles nvm environments)
for NVM_HOME in "$HOME/.nvm" "/home/hitech/.nvm" "/root/.nvm"; do
  NODE_VERSIONS="$NVM_HOME/versions/node"
  [ -d "$NODE_VERSIONS" ] || continue
  NODE_DIR="$(ls -d "$NODE_VERSIONS/v"*"/bin" 2>/dev/null | tail -1 || true)"
  [ -n "$NODE_DIR" ] && [ -d "$NODE_DIR" ] && export PATH="$NODE_DIR:$PATH" && break
done

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NEXUS CONVERTER — Bundle API Server for Mobile             ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "[1/4] Building API server TypeScript..."
cd "$API_SERVER_DIR"
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
  echo "  → dist/ already exists, skipping build"
else
  corepack pnpm run build 2>&1 || {
    echo "  → pnpm build had warnings, checking dist..."
    if [ ! -f "dist/index.js" ]; then
      corepack npx tsc -p tsconfig.json
    fi
  }
fi

echo "[2/4] Creating nodejs-project directory..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "[3/4] Bundling API server with esbuild..."
ESBUILD_BIN=""
for ESBUILD_CANDIDATE in \
  "$SCRIPT_DIR/node_modules/.bin/esbuild" \
  "$MONOREPO_DIR/node_modules/.bin/esbuild" \
  "$MONOREPO_DIR/node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild" \
  "$MONOREPO_DIR/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/bin/esbuild"; do
  if [ -x "$ESBUILD_CANDIDATE" ]; then
    ESBUILD_BIN="$ESBUILD_CANDIDATE"
    break
  fi
done

if [ -z "$ESBUILD_BIN" ]; then
  echo "Error: esbuild not found. Install it with: pnpm add -D esbuild"
  exit 1
fi

"$ESBUILD_BIN" \
  "$API_SERVER_DIR/dist/index.js" \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile="$OUTPUT_DIR/main.js" \
  --external:yt-dlp \
  --external:ffmpeg \
  --external:ffprobe \
  --minify-whitespace

echo "[4/4] Creating package.json..."
cat > "$OUTPUT_DIR/package.json" << 'JSONEOF'
{
  "name": "nexus-converter-mobile-server",
  "version": "1.2.5",
  "private": true,
  "main": "main.js"
}
JSONEOF

echo ""
echo "✓ API server bundled for mobile: $OUTPUT_DIR"
echo "  Size: $(du -sh "$OUTPUT_DIR" | cut -f1)"
echo "  Entry: main.js"
