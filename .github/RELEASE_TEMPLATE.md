## 🚀 NEXUS CONVERTER {{ tag_name }}

Application full-stak de téléchargement et conversion de médias.

---

### ⚡ Installation rapide

```bash
# Une seule commande — tout est automatisé
curl -fsSL https://raw.githubusercontent.com/HiTechTN/nexus-converter/main/install.sh | bash
```

### 📦 Téléchargements

| Plateforme | Format(s) | Lien |
|------------|-----------|------|
| 🐧 **Linux** | `.AppImage` `.deb` `.rpm` `.tar.gz` | Voir les assets ci-dessous |
| 🪟 **Windows** | `.exe` `.portable.exe` `.msi` | Voir les assets ci-dessous |
| 🤖 **Android** | `.apk` `.aab` | Voir les assets ci-dessous |
| 🍎 **iOS** | `.ipa` | Voir les assets ci-dessous |
| 🌐 **Web** | GitHub Pages | https://hitechtn.github.io/nexus-converter |

### ✨ Fonctionnalités

- Interface gaming "Red Magic" avec animations fluides
- Support de **1000+ sites** (YouTube, TikTok, Instagram, Twitch...)
- Conversion en **MP4, MKV, MP3, WAV** avec choix de qualité (480p → 4K)
- **Drag & drop** de fichiers locaux
- **Lecteur vidéo/audio** intégré avec contrôles custom
- **Progression en temps réel** via SSE
- **PWA mobile** installable
- **Déploiement Docker** ready

### 🔧 Stack

- **Frontend**: React 18 + Vite 5 + Tailwind 4 + Framer Motion
- **Desktop**: Electron 30 + electron-builder
- **Mobile**: Capacitor 6 (Android + iOS)
- **Backend**: Express 5 + TypeScript
- **Validation**: Zod + OpenAPI 3.1
- **Monorepo**: pnpm workspaces
- **Média**: yt-dlp + FFmpeg

---

<details>
<summary>📋 Notes de version</summary>

### v1.2.0
- Correction: LICENSE ajoutée pour les builds .deb
- Correction: artifactName personnalisé pour les binaires desktop
- Correction: install.sh utilise GitHub archive au lieu d'un tarball inexistant
- Correction: .gitignore étendu (tsbuildinfo, icônes générées)
- Synchronisation des versions de tous les packages en 1.1.0

### v1.1.0
- Ajout du package desktop Electron (AppImage, deb, rpm, tar.gz)
- Ajout du package mobile Capacitor (Android, iOS)
- Pipeline CI/CD complet (GitHub Actions)
- Landing page avec curl one-liner
- Correctifs de build pour api-zod, api-client-react, api-server, media-converter

### v1.0.0
- Première release officielle
- Architecture complète API + Frontend + Desktop + Mobile
- Installation automatique cross-platform

</details>
