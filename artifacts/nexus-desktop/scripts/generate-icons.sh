#!/usr/bin/env bash
set -euo pipefail

# Génère les icônes pour l'application desktop Electron
# Nécessite: ImageMagick

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../resources/icons"
mkdir -p "$ICONS_DIR"

BG_COLOR="#0a0a1a"
ACCENT_COLOR="#e94560"
HEX_COLOR="#e94560"
SECONDARY_COLOR="#0f3460"

echo "=== Génération des icônes desktop ==="

# Créer un PNG de base en utilisant une approche simple
# On crée des carrés avec dégradé et cercle (pas de texte complexe)
BASE_ICON="$ICONS_DIR/base.png"

# Créer la base (1024x1024)
convert -size 1024x1024 xc:"$BG_COLOR" \
  -fill none -stroke "$HEX_COLOR" -strokewidth 12 \
  -draw "polygon 512,60 920,240 920,784 512,964 104,784 104,240" \
  -fill none -stroke "$SECONDARY_COLOR" -strokewidth 6 \
  -draw "polygon 512,160 800,280 800,744 512,864 224,744 224,280" \
  -fill "$ACCENT_COLOR" -draw "circle 512,512 512,420" \
  -fill white -font "${FONT:-DejaVu-Sans-Bold}" -pointsize 350 -gravity center \
  -annotate +0+30 'N' \
  "$BASE_ICON"

echo "  → Base icon created"

# Redimensionnements
for size in 16 24 32 48 64 96 128 256 512; do
  convert "$BASE_ICON" -resize "${size}x${size}" "$ICONS_DIR/${size}x${size}.png"
done
echo "  → Multi-size PNGs"

cp "$ICONS_DIR/256x256.png" "$ICONS_DIR/icon-256.png"

# Windows .ico
convert "$BASE_ICON" \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  \( -clone 0 -resize 64x64 \) \
  \( -clone 0 -resize 128x128 \) \
  \( -clone 0 -resize 256x256 \) \
  -delete 0 -colors 256 "$ICONS_DIR/icon.ico"
echo "  → icon.ico (Windows)"

# macOS .iconset
mkdir -p "$ICONS_DIR/icon.iconset"
for size in 16 32 64 128 256 512; do
  s2=$((size * 2))
  convert "$BASE_ICON" -resize "${size}x${size}" "$ICONS_DIR/icon.iconset/icon_${size}x${size}.png"
  convert "$BASE_ICON" -resize "${s2}x${s2}" "$ICONS_DIR/icon.iconset/icon_${size}x${size}@2x.png"
done

if command -v iconutil &>/dev/null; then
  iconutil -c icns "$ICONS_DIR/icon.iconset" -o "$ICONS_DIR/icon.icns"
  echo "  → icon.icns (macOS)"
fi

# Nettoyer
rm -f "$BASE_ICON"

echo "✓ Icônes générées dans $ICONS_DIR"
echo ""
echo "Fichiers:"
ls -lh "$ICONS_DIR"
