<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="artifacts/media-converter/public/images/bg-geometric.png">
    <img src="artifacts/media-converter/public/images/bg-geometric.png" width="100%" alt="NEXUS CONVERTER" style="border-radius:12px;max-width:800px">
  </picture>
</p>

<h1 align="center">⚡ NEXUS CONVERTER</h1>

<p align="center">
  <strong>Application full-stack de téléchargement & conversion de médias</strong><br>
  1000+ sites supportés — YouTube, TikTok, Instagram, Twitch, Twitter/X…
</p>

<p align="center">
  <a href="https://github.com/HiTechTN/nexus-converter/actions/workflows/ci.yml"><img src="https://github.com/HiTechTN/nexus-converter/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/HiTechTN/nexus-converter/releases"><img src="https://img.shields.io/github/v/release/HiTechTN/nexus-converter?color=e94560&label=version" alt="Release"></a>
  <a href="https://github.com/HiTechTN/nexus-converter/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?color=0f3460" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-%3E%3D8-F69220?logo=pnpm&logoColor=white" alt="pnpm"></a>
  <a href="https://hitechtn.github.io/nexus-converter"><img src="https://img.shields.io/badge/landing%20page-github%20pages-2ea44f" alt="Landing Page"></a>
</p>

---

## 🚀 Quick Start

```bash
# Méthode 1 — Installation automatique (recommandé)
curl -fsSL https://raw.githubusercontent.com/HiTechTN/nexus-converter/main/install.sh | bash
cd ~/nexus-converter && ./start.sh

# Méthode 2 — Docker
git clone https://github.com/HiTechTN/nexus-converter.git && cd nexus-converter
docker compose up --build -d
```

> 👉 **http://localhost:5173** (dev) ou **http://localhost** (Docker)

---

## ✨ Features

| | |
|---|---|
| 🌐 **1000+ sites** | YouTube, TikTok, Instagram, Twitter/X, Twitch, Vimeo… |
| 📁 **Drag & Drop** | Upload de fichiers locaux |
| 🎬 **Formats** | MP4, MKV, MP3, WAV |
| 📺 **Qualité** | 480p, 720p, 1080p, 4K, Best |
| ⚡ **Progression temps réel** | Server-Sent Events (SSE) |
| 🧹 **Nettoyage auto** | Fichiers temporaires supprimés après téléchargement |
| 🎮 **Design gaming** | Interface sombre "Red Magic" |
| 🐧🪟🤖 **Multi-plateforme** | Linux, Windows, Android (releases) |

---

## 📦 Builds pré-packagés

Téléchargez depuis [GitHub Releases](https://github.com/HiTechTN/nexus-converter/releases) :

| Plateforme | Formats |
|---|---|
| 🐧 Linux | `.AppImage` • `.deb` • `.tar.gz` |
| 🪟 Windows | `Setup.exe` (NSIS) • `portable.exe` |
| 🤖 Android | `.apk` • `.aab` |

---

## 🏗️ Architecture

```
nexus-converter/
├── artifacts/
│   ├── api-server/          # Backend Express 5
│   │   └── src/routes/
│   │       ├── media.ts     # Routes conversion (yt-dlp + FFmpeg)
│   │       └── health.ts    # Healthcheck SSE
│   ├── media-converter/     # Frontend React + Vite + Tailwind
│   │   └── src/
│   │       ├── pages/Home.tsx
│   │       ├── hooks/use-sse.ts
│   │       └── components/GamingUI.tsx
│   ├── nexus-desktop/       # Electron shell
│   └── nexus-mobile/        # Capacitor (Android/iOS)
├── lib/
│   ├── api-spec/            # Contrat API OpenAPI 3.1
│   ├── api-client-react/    # Hooks React Query générés
│   └── api-zod/             # Schémas Zod
├── install.sh               # Installateur automatique
├── start.sh                 # Lanceur développement
├── Dockerfile               # Multi-stage
├── docker-compose.yml
└── nginx.conf               # Proxy reverse (Docker)
```

### API Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/media/info` | Métadonnées d'une URL |
| `POST` | `/api/media/convert` | Démarrer conversion URL |
| `GET` | `/api/media/progress/:jobId` | Flux SSE progression |
| `GET` | `/api/media/download/:jobId` | Télécharger fichier converti |
| `POST` | `/api/media/upload` | Upload fichier local |
| `GET` | `/api/healthz` | Health check |

---

## ⚙️ Configuration

```bash
cp .env.example .env
```

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port API |
| `FRONTEND_PORT` | `5173` | Port frontend (dev) |
| `YTDLP_PATH` | auto | Chemin yt-dlp |
| `TMP_DIR` | `./tmp` | Dossier temporaire |
| `MAX_FILE_SIZE_MB` | `500` | Taille max upload |

---

## 🛠️ Stack

| Couche | Technologie |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS 4, Framer Motion, React Query |
| **Backend** | Node.js 22, Express 5, TypeScript |
| **Médias** | yt-dlp + FFmpeg |
| **API** | OpenAPI 3.1, Orval (codegen), Zod |
| **Desktop** | Electron + electron-builder |
| **Mobile** | Capacitor + Android SDK |
| **Monorepo** | pnpm workspaces |
| **CI/CD** | GitHub Actions |

---

## 📋 Prérequis

| Outil | Version | Installation |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| FFmpeg | Toute | [ffmpeg.org](https://ffmpeg.org) |
| yt-dlp | Toute | `pip install yt-dlp` |
| Python 3 | ≥ 3.8 | [python.org](https://python.org) |

---

## 📄 Licence

MIT — © 2025 [HiTechTN](https://github.com/HiTechTN)
