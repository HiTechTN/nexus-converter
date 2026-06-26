/**
 * NEXUS CONVERTER — Preload Script
 * Pont sécurisé entre le renderer et le processus main Electron
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * API exposée au renderer (window.electronAPI)
 * Context isolation activée — le renderer n'a pas accès à Node.js
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // ─── Informations système ─────────────────────────────────────────────────
  platform: process.platform,
  arch: process.arch,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },

  // ─── API (port local du serveur backend) ────────────────────────────────────
  getApiUrl: (): string => `http://localhost:${process.env.PORT || "3099"}`,

  // ─── Dialogues natifs ────────────────────────────────────────────────────
  showOpenDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke("dialog:openFile", options),

  showSaveDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke("dialog:saveFile", options),

  // ─── Notifications ──────────────────────────────────────────────────────
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke("notification:show", title, body),

  // ─── Gestion des téléchargements ─────────────────────────────────────────
  onDownloadComplete: (callback: (filePath: string) => void) =>
    ipcRenderer.on("download:complete", (_event, filePath) => callback(filePath)),

  removeDownloadCompleteListener: () =>
    ipcRenderer.removeAllListeners("download:complete"),

  // ─── Fenêtre ──────────────────────────────────────────────────────────────
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),

  // ─── Auto-updater (future) ────────────────────────────────────────────────
  onUpdateAvailable: (callback: (info: { version: string; url: string }) => void) =>
    ipcRenderer.on("update:available", (_event, info) => callback(info)),

  checkForUpdates: () => ipcRenderer.invoke("update:check"),
});

// ─── Types exportables pour le renderer ───────────────────────────────────────
export interface ElectronAPI {
  platform: NodeJS.Platform;
  arch: string;
  versions: {
    node: string;
    electron: string;
    chrome: string;
  };
  getApiUrl: () => string;
  showOpenDialog: (options?: any) => Promise<any>;
  showSaveDialog: (options?: any) => Promise<any>;
  showNotification: (title: string, body: string) => Promise<void>;
  onDownloadComplete: (callback: (filePath: string) => void) => void;
  removeDownloadCompleteListener: () => void;
  isMaximized: () => Promise<boolean>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onUpdateAvailable: (callback: (info: { version: string; url: string }) => void) => void;
  checkForUpdates: () => Promise<any>;
}
