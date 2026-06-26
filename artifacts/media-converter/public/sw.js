/* ═══════════════════════════════════════════════════════════════════════════════
   NEXUS CONVERTER — Service Worker (PWA)
   ═══════════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = "nexus-converter-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/vite.svg",
  "/images/bg-geometric.svg",
  "/manifest.json",
];

// ─── Installation : pré-cache des assets statiques ──────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activer immédiatement sans attendre la fermeture de l'onglet
  self.skipWaiting();
});

// ─── Activation : nettoyage des anciens caches ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Prendre le contrôle de tous les clients
  self.clients.claim();
});

// ─── Stratégie de cache ─────────────────────────────────────────────────────
// Network First pour l'API, Cache First pour les assets statiques
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API : Network Only (pas de cache pour les données dynamiques)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Assets statiques (vite inclut des hash dans les noms)
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // Cache First, puis fallback réseau
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Mettre en cache la réponse si valide
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages (navigation) : Network First, fallback cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/index.html");
          });
        })
    );
    return;
  }
});
