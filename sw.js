// Alza questo numero a ogni pubblicazione: e' il cambiamento di questo file
// che fa accorgere il browser che c'e' una versione nuova, e quindi fa
// comparire l'avviso "Nuova versione disponibile" (vedi js/pwa-shell.js).
const CACHE_VERSION = 'jwcomitive-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Attenzione: se anche un solo file di questo elenco non esiste, cache.addAll()
// fallisce in blocco e il service worker non si installa affatto.
const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/dates.js',
  'js/state.js',
  'js/components.js',
  'js/share-card.js',
  'js/router.js',
  'js/views/mese.js',
  'js/views/case.js',
  'js/views/impostazioni.js',
  'js/pwa-shell.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.png',
  'icons/logo-1024.png',
];

// Niente skipWaiting() qui: la versione nuova resta "in attesa" finche' non e'
// l'utente a toccare "Aggiorna" nell'avviso, cosi' l'app non si ricarica sotto
// le dita mentre si sta compilando il mese. Il messaggio arriva da
// js/pwa-shell.js.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('jwcomitive-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // App shell: rete prima, cosi' chi e' online vede sempre l'ultima versione
    // pubblicata senza aspettare che il service worker si aggiorni da solo.
    // La cache resta come rete di scorta per quando manca la connessione.
    event.respondWith(
      fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
  } else {
    // I font di Google: prima la cache, cosi' anche offline i caratteri sono
    // quelli giusti, sia a schermo sia sulla locandina disegnata su canvas.
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
