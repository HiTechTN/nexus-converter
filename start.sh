#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
RESET="\033[0m"

log()    { echo -e "${GREEN}[✓]${RESET} $1"; }
warn()   { echo -e "${YELLOW}[!]${RESET} $1"; }
error()  { echo -e "${RED}[✗]${RESET} $1"; }
info()   { echo -e "${BLUE}[i]${RESET} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       NEXUS CONVERTER — DÉMARRAGE        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ─── Source port utilities ───────────────────────────────────────────────────
if [[ -f "lib/ports.sh" ]]; then
  # shellcheck disable=SC1091
  source "lib/ports.sh"
fi

# ─── Vérifications rapides ──────────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  error "Node.js n'est pas installé."
  info "  Lancez d'abord: ./install.sh"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  error "pnpm n'est pas installé."
  info "  Lancez d'abord: ./install.sh"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  warn "node_modules introuvable. Installation des dépendances..."
  pnpm install
  log "Dépendances installées"
fi

# ─── Chargement / détection des ports ────────────────────────────────────────

API_PORT=""
FRONTEND_PORT=""

if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source ".env"
  API_PORT="${PORT:-}"
  FRONTEND_PORT="${FRONTEND_PORT:-}"
fi

API_PORT="${PORT:-$API_PORT}"
FRONTEND_PORT="${FRONTEND_PORT:-$FRONTEND_PORT}"

if [[ -z "$API_PORT" ]]; then
  API_PORT=$(find_available_port 3000 3100)
fi
if [[ -z "$FRONTEND_PORT" ]]; then
  FRONTEND_PORT=$(find_available_port "$((API_PORT + 1))" "$((API_PORT + 100))")
fi

export PORT="$API_PORT"
export FRONTEND_PORT="$FRONTEND_PORT"

# ─── Build des libs si nécessaire ───────────────────────────────────────────

if [[ ! -d "lib/api-zod/dist" ]]; then
  info "Build de @workspace/api-zod..."
  pnpm --filter @workspace/api-zod run build
  log "api-zod: build réussi"
fi

if [[ ! -d "lib/api-client-react/dist" ]]; then
  info "Build de @workspace/api-client-react..."
  pnpm --filter @workspace/api-client-react run build
  log "api-client-react: build réussi"
fi

# ─── Vérification des prérequis runtime ──────────────────────────────────────

PYTHON_CMD=""
command -v python3 &>/dev/null && PYTHON_CMD="python3" || command -v python &>/dev/null && PYTHON_CMD="python"

if ! command -v ffmpeg &>/dev/null; then
  warn "FFmpeg non installé — la conversion de fichiers locaux sera limitée"
fi

if ! command -v yt-dlp &>/dev/null; then
  warn "yt-dlp non installé — la conversion depuis URL ne fonctionnera pas"
  if [[ -n "$PYTHON_CMD" ]]; then
    info "  Essayez: $PYTHON_CMD -m pip install yt-dlp"
  fi
fi

# ─── Création du dossier tmp ─────────────────────────────────────────────────

mkdir -p "${TMP_DIR:-./tmp}"

# ─── Lancement des serveurs ─────────────────────────────────────────────────

info "Démarrage des serveurs..."
echo ""

# Lancer les deux serveurs en arrière-plan
PORT=$API_PORT FRONTEND_PORT=$FRONTEND_PORT pnpm --filter @workspace/api-server run dev &
API_PID=$!

FRONTEND_PORT=$FRONTEND_PORT PORT=$API_PORT pnpm --filter @workspace/media-converter run dev &
FRONTEND_PID=$!

# Attendre que l'API soit prête
API_READY=false
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$API_PORT/api/healthz" &>/dev/null; then
    API_READY=true
    break
  fi
  sleep 0.5
done

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      APPLICATION EN COURS D'EXÉCUTION    ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""
if $API_READY; then
  log "Frontend : ${BOLD}http://localhost:$FRONTEND_PORT${RESET}"
  log "API       : ${BOLD}http://localhost:$API_PORT${RESET}"
  log "Health   : ${BOLD}http://localhost:$API_PORT/api/healthz${RESET}"
else
  warn "API pas encore prête — vérifiez les logs ci-dessus"
  log "Frontend : ${BOLD}http://localhost:$FRONTEND_PORT${RESET}"
  log "API       : ${BOLD}http://localhost:$API_PORT${RESET}"
fi
echo ""
info "Appuyez sur Ctrl+C pour arrêter les serveurs"
echo ""

# Nettoyage des processes enfants à la sortie
cleanup() {
  echo ""
  info "Arrêt des serveurs..."
  kill $API_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait $API_PID 2>/dev/null || true
  wait $FRONTEND_PID 2>/dev/null || true
  log "Serveurs arrêtés. À bientôt !"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Attendre
wait
