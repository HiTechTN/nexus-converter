#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Génération des icônes PWA
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ICONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../public/icons" 2>/dev/null && pwd || echo "$(dirname "${BASH_SOURCE[0]}")/../public/icons")"
mkdir -p "$ICONS_DIR"
SVG_FILE="$ICONS_DIR/icon.svg"

if [[ ! -f "$SVG_FILE" ]]; then
  echo "[!] Fichier SVG non trouvé: $SVG_FILE"
  echo "  Création de placeholders pour éviter les erreurs de build..."
  # Create placeholder PNGs so builds don't fail
  for SIZE in 192 512; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}.png"
    if [[ ! -f "$OUTPUT" ]]; then
      printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0aIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\x0d\x0a\x2d\xb4\x00\x00\x00\x00IEND\xae\x42\x60\x82' > "$OUTPUT"
      echo "  [i] placeholder icon-${SIZE}.png créé"
    fi
  done
  # Apple touch icon placeholder
  APPLE_ICON="$ICONS_DIR/../apple-touch-icon.png"
  if [[ ! -f "$APPLE_ICON" ]]; then
    printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0aIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\x0d\x0a\x2d\xb4\x00\x00\x00\x00IEND\xae\x42\x60\x82' > "$APPLE_ICON"
    echo "  [i] placeholder apple-touch-icon.png créé"
  fi
  echo "[i] Icônes placeholder créées — ajoutez icon.svg pour de vraies icônes"
  exit 0
fi

# Vérifier si ImageMagick est disponible
if command -v convert &>/dev/null || command -v magick &>/dev/null; then
  MAGICK_CMD="convert"
  command -v magick &>/dev/null && MAGICK_CMD="magick convert"

  echo "[i] Génération des icônes PNG..."

  # Icônes pour le manifest
  for SIZE in 192 512; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}.png"
    if [[ ! -f "$OUTPUT" ]]; then
      $MAGICK_CMD -background none "$SVG_FILE" -resize "${SIZE}x${SIZE}" "$OUTPUT" 2>/dev/null && \
        echo "  [✓] icon-${SIZE}.png créé" || \
        echo "  [!] Échec de icon-${SIZE}.png"
    else
      echo "  [✓] icon-${SIZE}.png déjà existant"
    fi
  done

  # Apple Touch Icon
  APPLE_ICON="$ICONS_DIR/../apple-touch-icon.png"
  if [[ ! -f "$APPLE_ICON" ]]; then
    $MAGICK_CMD -background none "$SVG_FILE" -resize "180x180" "$APPLE_ICON" 2>/dev/null && \
      echo "  [✓] apple-touch-icon.png créé" || \
      echo "  [!] Échec de apple-touch-icon.png"
  fi

  echo "[✓] Icônes générées avec succès"
else
  echo "[!] ImageMagick non installé — impossible de générer les PNG"
  echo "  Les icônes SVG seront utilisées (compatibles Chrome, Edge, Firefox)"
  echo "  Pour installer ImageMagick:"
  echo "    Linux:  sudo apt install imagemagick"
  echo "    macOS:  brew install imagemagick"
  echo "    Windows: choco install imagemagick"

  # Créer des PNG placeholder (1x1 transparent) pour éviter les 404
  for SIZE in 192 512; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}.png"
    if [[ ! -f "$OUTPUT" ]]; then
      # PNG minimal (1x1 pixel transparent)
      printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0aIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\x0d\x0a\x2d\xb4\x00\x00\x00\x00IEND\xae\x42\x60\x82' > "$OUTPUT"
      echo "  [i] placeholder icon-${SIZE}.png créé"
    fi
  done
fi
