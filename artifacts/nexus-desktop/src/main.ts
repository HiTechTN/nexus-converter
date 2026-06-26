/**
 * NEXUS CONVERTER — Desktop Application (Electron Main Process)
 *
 * Démarre le serveur API localement et affiche l'interface web
 * dans une fenêtre Electron native.
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } from "electron";
import { fork, type ChildProcess } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { createServer } from "http";

// ─── Path helpers ────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

/** Résout le chemin des ressources selon le contexte (dev vs packaged) */
function resourcePath(...segments: string[]): string {
  if (isDev) {
    return join(__dirname, "..", "..", "media-converter", ...segments);
  }
  return join(process.resourcesPath, ...segments);
}

/** Résout le chemin du serveur API */
function apiServerPath(): string {
  if (isDev) {
    return join(__dirname, "..", "..", "api-server", "dist", "index.js");
  }
  return join(process.resourcesPath, "api-server", "index.js");
}

/** Résout le chemin du frontend (renderer) */
function rendererPath(): string {
  return resourcePath("dist", "index.html");
}

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let apiProcess: ChildProcess | null = null;
const API_PORT = parseInt(process.env.PORT || "3099", 10); // port local par défaut
let isQuitting = false;

// ─── Serveur API ─────────────────────────────────────────────────────────────

function startApiServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = apiServerPath();

    if (!existsSync(serverPath)) {
      console.warn(`[NEXUS] API server not found at: ${serverPath}`);
      console.warn("[NEXUS] Starting in frontend-only mode (API unavailable)");
      resolve();
      return;
    }

    console.log(`[NEXUS] Starting API server on port ${API_PORT}...`);

    apiProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: String(API_PORT),
        TMP_DIR: join(app.getPath("userData"), "tmp"),
        NODE_ENV: isDev ? "development" : "production",
      },
      stdio: "pipe",
    });

    apiProcess.stdout?.on("data", (data: Buffer) => {
      console.log(`[API] ${data.toString().trim()}`);
    });

    apiProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[API:ERR] ${data.toString().trim()}`);
    });

    apiProcess.on("error", (err) => {
      console.error("[NEXUS] Failed to start API server:", err);
      reject(err);
    });

    apiProcess.on("exit", (code) => {
      console.log(`[NEXUS] API server exited with code ${code}`);
      apiProcess = null;
    });

    // Attendre que le serveur soit prêt
    waitForApi(API_PORT, 30)
      .then(() => {
        console.log("[NEXUS] API server ready");
        resolve();
      })
      .catch(reject);
  });
}

function stopApiServer(): void {
  if (apiProcess) {
    console.log("[NEXUS] Stopping API server...");
    apiProcess.kill("SIGTERM");
    // Force kill après 5s
    setTimeout(() => {
      if (apiProcess) {
        apiProcess.kill("SIGKILL");
        apiProcess = null;
      }
    }, 5000);
  }
}

/** Attends que le serveur API réponde aux health checks */
async function waitForApi(port: number, maxRetries: number): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/healthz`);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API server did not start within ${maxRetries * 500}ms`);
}

// ─── Fenêtre principale ──────────────────────────────────────────────────────

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "NEXUS Converter",
    icon: resourcePath("public", "icons", "icon-512.png"),
    backgroundColor: "#0a0a1a",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Charger le frontend
  const frontendPath = rendererPath();
  if (isDev && existsSync(frontendPath)) {
    // En dev avec build pré-existant : charger les fichiers statiques
    mainWindow.loadFile(frontendPath);
  } else if (!isDev && existsSync(frontendPath)) {
    // En production : charger les fichiers statiques
    mainWindow.loadFile(frontendPath);
  } else {
    // Fallback: serveur de dev ou message d'erreur
    mainWindow.loadURL(`http://localhost:${API_PORT}`);
  }

  // Afficher quand prêt
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Gérer les liens externes
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── System Tray ─────────────────────────────────────────────────────────────

function createTray(): void {
  const iconPath = resourcePath("public", "icons", "icon-192.png");
  if (!existsSync(iconPath)) return;

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Afficher NEXUS Converter",
      click: () => mainWindow?.show(),
    },
    { type: "separator" },
    {
      label: "API Dashboard",
      click: () => {
        if (apiProcess) {
          shell.openExternal(`http://localhost:${API_PORT}/api/healthz`);
        }
      },
    },
    { type: "separator" },
    {
      label: "Quitter",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("NEXUS Converter");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow?.show());
}

// ─── Menu ────────────────────────────────────────────────────────────────────

function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "NEXUS",
      submenu: [
        { role: "about", label: "À propos de NEXUS Converter" },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Fichier",
      submenu: [
        {
          label: "Ouvrir le dossier de téléchargements",
          click: () => {
            const downloadsPath = join(app.getPath("userData"), "downloads");
            shell.openPath(downloadsPath);
          },
        },
        { type: "separator" },
        { label: "Fermer", role: "close" },
      ],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
        { role: "selectAll", label: "Tout sélectionner" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Actualiser" },
        { role: "forceReload", label: "Actualiser forcé" },
        { role: "toggleDevTools", label: "Outils de développement" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom 100%" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "Documentation",
          click: () => shell.openExternal("https://github.com/HiTechTN/nexus-converter"),
        },
        {
          label: "Signaler un bug",
          click: () => shell.openExternal("https://github.com/HiTechTN/nexus-converter/issues"),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── Application Lifecycle ───────────────────────────────────────────────────

app.whenReady().then(async () => {
  createAppMenu();

  try {
    await startApiServer();
  } catch (err) {
    console.error("[NEXUS] Failed to start API server:", err);
    // Lancer quand même l'interface (mode dégradé)
  }

  createMainWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopApiServer();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on("will-quit", () => {
  stopApiServer();
});
