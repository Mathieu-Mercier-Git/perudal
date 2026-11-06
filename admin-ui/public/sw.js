// Service worker de Pérudal : il rend l'application installable sur téléphone (PWA).
// Volontairement, il ne met rien en cache : le jeu a besoin du serveur (API + WebSocket)
// et on évite ainsi de servir une ancienne version de l'interface après un déploiement.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Pas de respondWith : le navigateur traite la requête normalement, via le réseau.
});
