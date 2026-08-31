/**
 * Service worker volontairement minimal.
 *
 * Sa seule raison d'être : satisfaire les critères d'installation d'Android,
 * pour que « Ajouter à l'écran d'accueil » produise une vraie fenêtre d'app
 * (WebAPK) et pas un simple raccourci vers le navigateur.
 *
 * Il ne met JAMAIS en cache de HTML, de réponse d'API, ni quoi que ce soit
 * d'authentifié : pas de risque de servir une page périmée après un déploiement,
 * ni la page d'un utilisateur à un autre. Uniquement les icônes, qui sont
 * publiques et immuables.
 */

const CACHE = "kaeyi-static-v3";

const PRECACHE = ["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!PRECACHE.includes(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
