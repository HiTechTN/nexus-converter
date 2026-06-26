#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Utilitaire de détection de ports disponibles
# ═══════════════════════════════════════════════════════════════════════════════

# Trouve un port disponible dans une plage donnée
# Usage: find_available_port <port_de_départ> <port_de_fin>
find_available_port() {
  local start_port="${1:-3000}"
  local end_port="${2:-3100}"

  for port in $(seq "$start_port" "$end_port"); do
    if ! port_in_use "$port"; then
      echo "$port"
      return 0
    fi
  done

  # Si aucun port n'est libre, on prend le dernier et on espère
  echo "$end_port"
  return 1
}

# Vérifie si un port est utilisé
# Usage: port_in_use <port>
port_in_use() {
  local port="$1"

  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v ss &>/dev/null; then
      ss -tln "sport = :$port" 2>/dev/null | grep -q ":$port"
      return $?
    elif command -v netstat &>/dev/null; then
      netstat -tln 2>/dev/null | grep -q ":$port "
      return $?
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    netstat -an 2>/dev/null | grep -q "\.$port "
    return $?
  fi

  # Fallback: utiliser une connexion bash /dev/tcp
  timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null
  return $?
}

# Lit ou initialise les ports dans .env
# Usage: init_ports_from_env <fichier_env>
init_ports_from_env() {
  local env_file="${1:-.env}"

  local api_port="${PORT:-}"
  local frontend_port="${FRONTEND_PORT:-}"

  if [[ -z "$api_port" ]]; then
    api_port=$(find_available_port 3000 3100)
  fi

  if [[ -z "$frontend_port" ]]; then
    # Pour le frontend, chercher après le port API
    frontend_port=$(find_available_port $((api_port + 1)) $((api_port + 100)))
  fi

  echo "$api_port" "$frontend_port"
}

# Exporte les fonctions si le script est sourcé
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  export -f find_available_port
  export -f port_in_use
  export -f init_ports_from_env
fi
