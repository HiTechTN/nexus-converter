#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Desktop Build Script
# Prépare les ressources et compile l'application Electron
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$SCRIPT_DIR/.."
PROJECT_DIR="$DESKTOP_DIR/../.."

echo "=== Building NEXUS Desktop ==="

# 1. Vérifier que les builds web et API existent
echo "[1/3] Vérification des builds prerequisites..."

if [ ! -d "$PROJECT_DIR/artifacts/media-converter/dist" ]; then
  echo "  → Build web manquant. Construction..."
  cd "$PROJECT_DIR"
  pnpm --filter @workspace/api-zod run build
  pnpm --filter @workspace/api-client-react run build
  pnpm --filter @workspace/api-server run build
  pnpm --filter @workspace/media-converter run build
  echo "  ✓ Web build terminé"
else
  echo "  ✓ Web build trouvé"
fi

if [ ! -d "$PROJECT_DIR/artifacts/api-server/dist" ]; then
  echo "  → Build API manquant. Construction..."
  cd "$PROJECT_DIR"
  pnpm --filter @workspace/api-server run build
  echo "  ✓ API build terminé"
else
  echo "  ✓ API build trouvé"
fi

# 2. Générer les icônes
echo "[2/3] Génération des icônes..."
bash "$DESKTOP_DIR/scripts/generate-icons.sh"

# 3. Compiler l'Electron main process
echo "[3/3] Compilation Electron..."
cd "$DESKTOP_DIR"
npx tsc -p tsconfig.electron.json
echo "  ✓ Electron compilé"

echo ""
echo "✓ Desktop build terminé !"
echo "  → dist-electron/main.js"
echo ""
echo "Pour packager :"
echo "  pnpm --filter @workspace/nexus-desktop run package:linux"
echo "  pnpm --filter @workspace/nexus-desktop run package:win"
