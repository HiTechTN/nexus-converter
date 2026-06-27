#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Installateur automatique complet
# Détection OS • Installation prérequis • Configuration ports • Build
#
# Usage:
#   ./install.sh              # Installation locale (dans le dépôt cloné)
#   curl -fsSL https://github.com/HiTechTN/nexus-converter/releases/latest/download/install.sh | bash
#                             # Installation via curl (télécharge + installe)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Détection curl one-liner ────────────────────────────────────────────────
# Si le script est pipé via curl (pas de fichier), on télécharge d'abord le code
if [[ "$0" == "bash" || "$0" == "sh" || ! -f "$0" ]]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║     NEXUS CONVERTER — Téléchargement via curl            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  INSTALL_DIR="${HOME}/nexus-converter"
  VERSION="1.2.4"

  echo "[i] Préparation du dossier ${INSTALL_DIR}..."
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"

  echo "[i] Téléchargement du code source v${VERSION}..."
  curl -fsSL "https://github.com/HiTechTN/nexus-converter/archive/refs/tags/v${VERSION}.tar.gz" \
    | tar xz --strip-components=1 -C "$INSTALL_DIR" --overwrite

  echo "[✓] Code téléchargé dans ${INSTALL_DIR}"
  echo ""
  cd "$INSTALL_DIR"
  exec bash "$INSTALL_DIR/install.sh"
  exit 0
fi

# ─── Couleurs ────────────────────────────────────────────────────────────────
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
step()   { echo ""; echo -e "${CYAN}━━━ $1 ━━━${RESET}"; }
banner() { echo -e "${BOLD}$1${RESET}"; }

# Spinner pour opérations longues
spinner() {
  local pid=$1
  local msg=$2
  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}%s${RESET} ${msg}..." "${spin:$i:1}"
    i=$(( (i+1) % ${#spin} ))
    sleep 0.1
  done
  printf "\r  ${GREEN}✓${RESET} ${msg}   \n"
}

# Exécute avec spinner
run_with_spinner() {
  local msg=$1
  shift
  ("$@" &>/dev/null) &
  local pid=$!
  spinner "$pid" "$msg"
  wait "$pid"
  return $?
}

# ─── Source port utilities ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/ports.sh
if [[ -f "$SCRIPT_DIR/lib/ports.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/ports.sh"
fi

# ─── Banner ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║              NEXUS CONVERTER — INSTALLATION              ║${RESET}"
echo -e "${BOLD}║        Installation automatique de tous les prérequis     ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ─── Détection OS ───────────────────────────────────────────────────────────
step "DÉTECTION DU SYSTÈME"

OS=""
OS_FAMILY=""
PKG_MANAGER=""
PKG_UPDATE=""
PKG_INSTALL=""

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
  OS_FAMILY="Linux"

  # Détection de la distribution
  if grep -qi "debian\|ubuntu" /etc/os-release 2>/dev/null; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update -y"
    PKG_INSTALL="apt install -y"
  elif grep -qi "fedora\|rhel\|centos" /etc/os-release 2>/dev/null; then
    PKG_MANAGER="dnf"
    PKG_UPDATE="dnf update -y"
    PKG_INSTALL="dnf install -y"
  elif grep -qi "arch\|manjaro" /etc/os-release 2>/dev/null; then
    PKG_MANAGER="pacman"
    PKG_UPDATE="pacman -Sy"
    PKG_INSTALL="pacman -S --noconfirm"
  elif grep -qi "alpine" /etc/os-release 2>/dev/null; then
    PKG_MANAGER="apk"
    PKG_UPDATE="apk update"
    PKG_INSTALL="apk add"
  elif grep -qi "opensuse\|suse" /etc/os-release 2>/dev/null; then
    PKG_MANAGER="zypper"
    PKG_UPDATE="zypper refresh"
    PKG_INSTALL="zypper install -y"
  else
    log "Distribution Linux détectée (non identifiée)"
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update -y"
    PKG_INSTALL="apt install -y"
  fi

elif [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
  OS_FAMILY="macOS"

  if command -v brew &>/dev/null; then
    PKG_MANAGER="brew"
    PKG_UPDATE="brew update"
    PKG_INSTALL="brew install"
  else
    warn "Homebrew non trouvé. Installation de Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
    if command -v brew &>/dev/null; then
      PKG_MANAGER="brew"
      PKG_UPDATE="brew update"
      PKG_INSTALL="brew install"
      log "Homebrew installé"
    else
      warn "Impossible d'installer Homebrew. Installation manuelle des prérequis nécessaire."
    fi
  fi

elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* || "$OSTYPE" == "mingw"* ]]; then
  OS="windows"
  OS_FAMILY="Windows"
  log "Windows détecté (Git Bash/MSYS2)"

  if command -v winget &>/dev/null; then
    PKG_MANAGER="winget"
    PKG_INSTALL="winget install"
  elif command -v choco &>/dev/null; then
    PKG_MANAGER="choco"
    PKG_INSTALL="choco install -y"
  elif command -v scoop &>/dev/null; then
    PKG_MANAGER="scoop"
    PKG_INSTALL="scoop install"
  fi
else
  OS="linux"
  OS_FAMILY="Linux"
  PKG_MANAGER="apt"
  PKG_UPDATE="apt update -y"
  PKG_INSTALL="apt install -y"
fi

log "Système : $OS_FAMILY"
log "Gestionnaire : ${PKG_MANAGER:-non détecté}"

# ─── Installation des prérequis système ─────────────────────────────────────
step "INSTALLATION DES PRÉREQUIS SYSTÈME"

# Fonction d'installation générique
install_pkg() {
  local pkg_name="$1"
  local cmd_check="$2"
  local install_cmd="$3"
  local label="${4:-$pkg_name}"

  info "Installation de $label..."
  if eval "$cmd_check" &>/dev/null; then
    log "$label déjà installé"
    return 0
  fi

  if [[ -n "$PKG_MANAGER" ]]; then
    case "$PKG_MANAGER" in
      apt|dnf|apk|zypper)
        sudo $PKG_INSTALL $install_cmd 2>/dev/null || {
          warn "Échec de l'installation de $label avec $PKG_MANAGER"
          return 1
        }
        ;;
      brew|winget|choco|scoop)
        $PKG_INSTALL $install_cmd 2>/dev/null || {
          warn "Échec de l'installation de $label avec $PKG_MANAGER"
          return 1
        }
        ;;
      pacman)
        sudo $PKG_INSTALL $install_cmd 2>/dev/null || {
          warn "Échec de l'installation de $label avec pacman"
          return 1
        }
        ;;
    esac
  else
    warn "Aucun gestionnaire de paquets disponible pour installer $label"
    warn "  → Veuillez installer $label manuellement"
    return 1
  fi

  if eval "$cmd_check" &>/dev/null; then
    log "$label installé avec succès"
    return 0
  else
    warn "L'installation de $label semble avoir échoué"
    return 1
  fi
}

# ─── 1. Node.js ────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    log "Node.js $(node -v) — OK"
  else
    warn "Node.js $(node -v) trop vieux (≥ 18 requis). Mise à jour nécessaire."
    install_nodejs
  fi
else
  info "Node.js non trouvé. Installation..."
  install_nodejs
fi

install_nodejs() {
  # Utiliser fnm (Fast Node Manager) — plus rapide que nvm
  if ! command -v fnm &>/dev/null; then
    info "Installation de fnm (Fast Node Manager)..."
    if [[ "$OS" == "linux" || "$OS" == "macos" ]]; then
      curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell 2>/dev/null || true
      export PATH="$HOME/.local/share/fnm:$PATH"
      if [[ -f "$HOME/.local/share/fnm/fnm" ]]; then
        log "fnm installé"
      else
        # Fallback: utiliser nvm
        warn "Fallback: installation de nvm..."
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash 2>/dev/null || true
        export NVM_DIR="$HOME/.nvm"
        [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
      fi
    fi
  fi

  if command -v fnm &>/dev/null; then
    fnm install 20 2>/dev/null || true
    fnm use 20 2>/dev/null || true
    export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"
  elif command -v nvm &>/dev/null; then
    nvm install 20 2>/dev/null || true
    nvm use 20 2>/dev/null || true
  fi

  # Dernier recours: utiliser le NodeSource setup
  if ! command -v node &>/dev/null; then
    if [[ "$OS" == "linux" ]] && command -v curl &>/dev/null; then
      info "Installation de Node.js 20 via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
      sudo $PKG_INSTALL nodejs 2>/dev/null || true
    elif [[ "$OS" == "macos" ]] && command -v brew &>/dev/null; then
      brew install node@20 2>/dev/null || true
    fi
  fi

  if command -v node &>/dev/null; then
    log "Node.js $(node -v) installé"
  else
    error "Node.js n'a pas pu être installé automatiquement."
    error "  → https://nodejs.org — Veuillez l'installer manuellement"
  fi
}

# ─── 2. pnpm ───────────────────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  log "pnpm $(pnpm -v) — OK"
else
  info "Installation de pnpm..."
  npm install -g pnpm 2>/dev/null && log "pnpm $(pnpm -v) installé" || {
    # Fallback: via corepack
    if command -v corepack &>/dev/null; then
      corepack enable && corepack prepare pnpm@latest --activate 2>/dev/null || true
    fi
    if command -v pnpm &>/dev/null; then
      log "pnpm $(pnpm -v) installé"
    else
      warn "pnpm non installé. npm install -g pnpm"
    fi
  }
fi

# ─── 3. FFmpeg ─────────────────────────────────────────────────────────────
if command -v ffmpeg &>/dev/null; then
  log "FFmpeg $(ffmpeg -version 2>&1 | head -1 | grep -oP 'version \K[^ ]+' || true) — OK"
else
  info "Installation de FFmpeg..."
  case "$PKG_MANAGER" in
    apt)    sudo $PKG_INSTALL ffmpeg 2>/dev/null || true ;;
    dnf)    sudo $PKG_INSTALL ffmpeg 2>/dev/null || sudo $PKG_INSTALL ffmpeg-free 2>/dev/null || true ;;
    pacman) sudo $PKG_INSTALL ffmpeg 2>/dev/null || true ;;
    apk)    sudo $PKG_INSTALL ffmpeg ffmpeg-libs 2>/dev/null || true ;;
    zypper) sudo $PKG_INSTALL ffmpeg 2>/dev/null || true ;;
    brew)   $PKG_INSTALL ffmpeg 2>/dev/null || true ;;
    winget) winget install FFmpeg 2>/dev/null || true ;;
    choco)  choco install ffmpeg -y 2>/dev/null || true ;;
    scoop)  scoop install ffmpeg 2>/dev/null || true ;;
  esac

  if command -v ffmpeg &>/dev/null; then
    log "FFmpeg installé"
  else
    warn "FFmpeg n'a pas pu être installé automatiquement."
    warn "  → https://ffmpeg.org/download.html"
  fi
fi

# ─── 4. Python 3 ───────────────────────────────────────────────────────────
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
  log "Python3 $(python3 --version 2>&1 | cut -d' ' -f2) — OK"
elif command -v python &>/dev/null; then
  PYVER=$(python --version 2>&1 | cut -d' ' -f2 | cut -d. -f1)
  if [[ "$PYVER" -ge 3 ]]; then
    PYTHON_CMD="python"
    log "Python $(python --version 2>&1) — OK"
  fi
else
  info "Installation de Python 3..."
  case "$PKG_MANAGER" in
    apt)    sudo $PKG_INSTALL python3 python3-pip 2>/dev/null || true ;;
    dnf)    sudo $PKG_INSTALL python3 python3-pip 2>/dev/null || true ;;
    pacman) sudo $PKG_INSTALL python python-pip 2>/dev/null || true ;;
    apk)    sudo $PKG_INSTALL python3 py3-pip 2>/dev/null || true ;;
    brew)   $PKG_INSTALL python3 2>/dev/null || true ;;
  esac

  if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
    log "Python3 $(python3 --version 2>&1 | cut -d' ' -f2) installé"
  elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
    log "Python $(python --version 2>&1) trouvé"
  else
    warn "Python 3 non installé. → https://python.org"
  fi
fi

# ─── 5. yt-dlp ─────────────────────────────────────────────────────────────
if command -v yt-dlp &>/dev/null; then
  log "yt-dlp $(yt-dlp --version 2>/dev/null || true) — OK"
else
  info "Installation de yt-dlp..."
  if [[ -n "$PYTHON_CMD" ]]; then
    # Essayer pip3 d'abord, puis pip
    $PYTHON_CMD -m pip install yt-dlp 2>/dev/null || \
    $PYTHON_CMD -m pip install --break-system-packages yt-dlp 2>/dev/null || \
    pip3 install yt-dlp 2>/dev/null || \
    pip3 install --break-system-packages yt-dlp 2>/dev/null || \
    pip install yt-dlp 2>/dev/null || true
  fi

  # Installation alternative: curl
  if ! command -v yt-dlp &>/dev/null; then
    if [[ "$OS" == "linux" || "$OS" == "macos" ]]; then
      sudo curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp 2>/dev/null && \
      sudo chmod a+rx /usr/local/bin/yt-dlp 2>/dev/null || true
    fi
  fi

  if command -v yt-dlp &>/dev/null; then
    log "yt-dlp $(yt-dlp --version 2>/dev/null || true) installé"
  else
    warn "yt-dlp n'a pas pu être installé automatiquement."
    warn "  → pip install yt-dlp"
  fi
fi

# ─── Vérification finale des prérequis ─────────────────────────────────────
step "VÉRIFICATION DES PRÉREQUIS"

echo ""
echo -e "  ${BOLD}Prérequis              Statut${RESET}"
echo "  ───────────────────────────────────────"

check_and_print() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "  $label          ${GREEN}✓${RESET}"
  else
    echo -e "  $label          ${RED}✗${RESET}"
  fi
}

check_and_print "Node.js ≥ 18"    "node -e 'process.exit(parseInt(process.version.slice(1))>=18?0:1)'"
check_and_print "pnpm"            "command -v pnpm"
check_and_print "FFmpeg"          "command -v ffmpeg"
check_and_print "Python 3"        "command -v $PYTHON_CMD"
check_and_print "yt-dlp"          "command -v yt-dlp"

echo ""

# ─── Configuration des ports ────────────────────────────────────────────────
step "CONFIGURATION DES PORTS"

# Chercher des ports disponibles
detected_api_port=$(find_available_port 3000 3100)
detected_frontend_port=$(find_available_port $((detected_api_port + 1)) $((detected_api_port + 100)))

log "Port API détecté : $detected_api_port"
log "Port Frontend détecté : $detected_frontend_port"

# Créer le .env
if [[ -f ".env" ]]; then
  warn "Fichier .env déjà existant. Mise à jour des ports..."
  # Mettre à jour les lignes PORT et FRONTEND_PORT
  if grep -q "^PORT=" .env; then
    sed -i "s/^PORT=.*/PORT=$detected_api_port/" .env
  else
    echo "PORT=$detected_api_port" >> .env
  fi
  if grep -q "^FRONTEND_PORT=" .env; then
    sed -i "s/^FRONTEND_PORT=.*/FRONTEND_PORT=$detected_frontend_port/" .env
  else
    echo "FRONTEND_PORT=$detected_frontend_port" >> .env
  fi
else
  cp .env.example .env 2>/dev/null || true
  # Écrire les ports détectés
  cat > .env << EOF
# Port du serveur API
PORT=$detected_api_port

# Port du frontend (dev)
FRONTEND_PORT=$detected_frontend_port

# Chemin vers yt-dlp (laisser vide pour détection automatique)
YTDLP_PATH=

# Dossier temporaire pour les fichiers convertis
TMP_DIR=./tmp

# Taille max d'upload en MB
MAX_FILE_SIZE_MB=500
EOF
  log "Fichier .env créé avec les ports : API=$detected_api_port Frontend=$detected_frontend_port"
fi

# Exporter les variables pour la suite
export PORT=$detected_api_port
export FRONTEND_PORT=$detected_frontend_port

# ─── Installation des dépendances Node.js ──────────────────────────────────
step "INSTALLATION DES DÉPENDANCES NODE.JS"

info "Installation des dépendances du monorepo..."
if run_with_spinner "Installation des dépendances Node.js" pnpm install; then
  log "Dépendances installées avec succès"
else
  warn "Échec, tentative avec --no-frozen-lockfile..."
  run_with_spinner "Nouvelle tentative" pnpm install --no-frozen-lockfile || true
fi

# ─── Build des librairies partagées ────────────────────────────────────────
step "BUILD DES LIBRAIRIES PARTAGÉES"

run_with_spinner "Build de @workspace/api-zod" pnpm --filter @workspace/api-zod run build && \
  log "api-zod: build réussi" || warn "api-zod: échec du build"

run_with_spinner "Build de @workspace/api-client-react" pnpm --filter @workspace/api-client-react run build && \
  log "api-client-react: build réussi" || warn "api-client-react: échec du build"

# ─── Nettoyage ─────────────────────────────────────────────────────────────
step "NETTOYAGE"

rm -rf tmp 2>/dev/null || true
mkdir -p tmp
log "Dossier tmp/ créé"

# ─── Création du .desktop (menu applications) ──────────────────────────────
step "CRÉATION DU RACCOURCI MENU APPLICATIONS"

DESKTOP_FILE="$HOME/.local/share/applications/nexus-converter.desktop"
DESKTOP_ICON="$SCRIPT_DIR/artifacts/nexus-desktop/resources/icons/256x256.png"

mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=NEXUS Converter
Comment=Application de téléchargement et conversion de médias
Exec=${SCRIPT_DIR}/start.sh
Icon=${DESKTOP_ICON}
Terminal=true
Type=Application
Categories=AudioVideo;Utility;
Keywords=youtube;download;converter;media;video;audio;
StartupNotify=true
EOF

if [[ -f "$DESKTOP_FILE" ]]; then
  log "Raccourci créé : $DESKTOP_FILE"
  # Rafraîchir la base de données des applications desktop
  if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  fi
else
  warn "Impossible de créer le raccourci menu"
fi

# ─── Résumé final ──────────────────────────────────────────────────────────
step "INSTALLATION TERMINÉE"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║           NEXUS CONVERTER — PRÊT À L'EMPLOI             ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ─── Résumé ─────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}Composant              Statut${RESET}"
echo -e "  ───────────────────────────────────────────"
check_and_print "Node.js $(node -v 2>/dev/null)" "command -v node"
check_and_print "pnpm $(pnpm -v 2>/dev/null)" "command -v pnpm"
check_and_print "FFmpeg" "command -v ffmpeg"
check_and_print "yt-dlp" "command -v yt-dlp"
echo ""

echo -e "  ${CYAN}▶${RESET} Pour lancer :"
echo -e "    ${BOLD}./start.sh${RESET}"
echo ""
echo -e "  ${CYAN}▶${RESET} Accès :"
echo -e "    Frontend  → ${BOLD}http://localhost:$detected_frontend_port${RESET}"
echo -e "    API       → ${BOLD}http://localhost:$detected_api_port${RESET}"
echo -e "    Health    → ${BOLD}http://localhost:$detected_api_port/api/healthz${RESET}"
echo ""
echo -e "  ${CYAN}▶${RESET} Docker : ${BOLD}docker compose up --build${RESET}"
echo ""
