/* E-facture — service worker
   Garde l'application en mémoire pour qu'elle s'ouvre sans connexion.
   Les données (clients, factures…) ne passent JAMAIS par ici : elles restent
   dans le stockage du navigateur. */
const CACHE = "efacture-v2";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("efacture-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Réponse immédiate depuis la mémoire, puis mise à jour discrète en arrière-plan :
   une nouvelle version de l'application est prise en compte à l'ouverture suivante. */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      const refresh = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined));
      event.waitUntil(refresh.catch(() => undefined));
      return cached || refresh;
    })
  );
});
