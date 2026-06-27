# ⚡ NEXUS CONVERTER

**Application web full-stack de téléchargement et conversion de médias.**  
Supporte **1000+ sites** (YouTube, Twitter/X, Instagram, TikTok, Twitch, Vimeo, Reddit, et bien d'autres) grâce à [yt-dlp](https://github.com/yt-dlp/yt-dlp).

![Design sombre gaming Red Magic](artifacts/media-converter/public/images/bg-geometric.png)

---

## ✨ Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 🌐 **1000+ sites** | Toute URL valide (YouTube, TikTok, Instagram, Twitch…) |
| 📁 **Drag & Drop** | Upload de fichiers locaux directement |
| 🎬 **Formats** | MP4, MKV, MP3, WAV |
| 📺 **Qualité** | 480p, 720p, 1080p, 4K, Best |
| ⚡ **Progression temps réel** | Via Server-Sent Events (SSE) |
| 🧹 **Nettoyage auto** | Fichiers temporaires supprimés après téléchargement |
| 🎮 **Design gaming** | Interface sombre "Red Magic" avec animations |

---

## 🚀 Installation rapide

### Méthode 1 — Script automatique (recommandé)

```bash
git clone https://github.com/VOTRE_USER/nexus-converter.git
cd nexus-converter
./install.sh
./start.sh
```

L'application sera disponible sur **http://localhost:5173**

### Méthode 2 — Docker Compose (le plus simple)

```bash
git clone https://github.com/VOTRE_USER/nexus-converter.git
cd nexus-converter

# Construire et lancer
docker compose up --build

# En arrière-plan
docker compose up --build -d
```

L'application sera disponible sur **http://localhost**

### Méthode 3 — Manuel

```bash
# 1. Prérequis système
#    - Node.js 20+  →  https://nodejs.org
#    - pnpm         →  npm install -g pnpm
#    - FFmpeg       →  https://ffmpeg.org/download.html
#    - yt-dlp       →  pip install yt-dlp

# 2. Cloner et installer
git clone https://github.com/VOTRE_USER/nexus-converter.git
cd nexus-converter
pnpm install

# 3. Générer le client API
pnpm --filter @workspace/api-spec run codegen

# 4. Mode développement (deux terminaux)
PORT=3000 pnpm --filter @workspace/api-server run dev      # Terminal 1
PORT=5173 pnpm --filter @workspace/media-converter run dev # Terminal 2
```

---

## ⚙️ Configuration

Copiez `.env.example` en `.env` et ajustez les valeurs :

```bash
cp .env.example .env
```

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port du serveur API |
| `FRONTEND_PORT` | `5173` | Port du frontend (dev) |
| `YTDLP_PATH` | auto | Chemin vers yt-dlp |
| `TMP_DIR` | `./tmp` | Dossier temporaire |
| `MAX_FILE_SIZE_MB` | `500` | Taille max upload |

---

## 🏗️ Architecture

```
nexus-converter/
├── artifacts/
│   ├── api-server/          # Backend Express 5
│   │   └── src/routes/
│   │       ├── media.ts     # Routes conversion (yt-dlp + FFmpeg)
│   │       └── health.ts    # Healthcheck
│   └── media-converter/     # Frontend React + Vite + Tailwind
│       └── src/
│           ├── pages/Home.tsx
│           ├── hooks/use-sse.ts    # Progression temps réel
│           └── components/GamingUI.tsx
├── lib/
│   ├── api-spec/openapi.yaml       # Contrat API OpenAPI 3.1
│   ├── api-client-react/           # Hooks React Query générés
│   └── api-zod/                    # Schémas Zod générés
├── install.sh       # Installateur automatique
├── start.sh         # Lanceur (prod + dev)
├── Dockerfile       # Image Docker multi-stage
├── docker-compose.yml
└── nginx.conf       # Proxy reverse (Docker)
```

### API Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/media/info` | Métadonnées d'une URL |
| `POST` | `/api/media/convert` | Démarrer une conversion URL |
| `GET` | `/api/media/progress/:jobId` | Flux SSE de progression |
| `GET` | `/api/media/download/:jobId` | Télécharger le fichier converti |
| `POST` | `/api/media/upload` | Uploader un fichier local |
| `GET` | `/api/healthz` | Health check |

---

## 🛠️ Stack technique

- **Frontend** : React 18, Vite, Tailwind CSS 4, Framer Motion, React Query
- **Backend** : Node.js 20, Express 5, TypeScript
- **Médias** : [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [FFmpeg](https://ffmpeg.org)
- **API** : OpenAPI 3.1, Orval (codegen), Zod
- **Monorepo** : pnpm workspaces

---

## 📋 Prérequis

| Outil | Version | Installation |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| FFmpeg | Toute | https://ffmpeg.org |
| yt-dlp | Toute | `pip install yt-dlp` |
| Python 3 | ≥ 3.8 | https://python.org |

---

## 📄 Licence

MIT
