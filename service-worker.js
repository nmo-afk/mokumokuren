/* Mokumokuren mobile/desktop PWA: static offline shell only.
   Trakt, AniList, TMDB, OAuth, and cross-origin requests are NEVER cached. */
const CACHE_PREFIX = 'mokumokuren-shell-';
// The release builder replaces this marker with a hash of all shipped assets.
// Source-only local previews use a fixed marker; public releases are content-versioned.
const CACHE_NAME = CACHE_PREFIX + '__MOKUMOKUREN_SHELL_HASH__';
const STATIC_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/trakt-rebuild.css',
  '/manifest.webmanifest',
  '/assets/icon-512.png',
  '/assets/favicon-32.png',
  '/assets/favicon-180.png',
  '/assets/icon.svg',
  '/assets/trakt-icons.svg',
  '/assets/arctic-icons/arrow-trend-up.png',
  '/assets/arctic-icons/bars-progress.png',
  '/assets/arctic-icons/bookmark.png',
  '/assets/arctic-icons/bookmarks.png',
  '/assets/arctic-icons/calendar.png',
  '/assets/arctic-icons/check.png',
  '/assets/arctic-icons/chevron-right.png',
  '/assets/arctic-icons/circle-check.png',
  '/assets/arctic-icons/circle-info.png',
  '/assets/arctic-icons/circle-play.png',
  '/assets/arctic-icons/clock.png',
  '/assets/arctic-icons/compass.png',
  '/assets/arctic-icons/eye.png',
  '/assets/arctic-icons/film.png',
  '/assets/arctic-icons/filter.png',
  '/assets/arctic-icons/grid.png',
  '/assets/arctic-icons/heart.png',
  '/assets/arctic-icons/home.png',
  '/assets/arctic-icons/info.png',
  '/assets/arctic-icons/list-check.png',
  '/assets/arctic-icons/list.png',
  '/assets/arctic-icons/mask.png',
  '/assets/arctic-icons/minus.png',
  '/assets/arctic-icons/person.png',
  '/assets/arctic-icons/play.png',
  '/assets/arctic-icons/play2.png',
  '/assets/arctic-icons/plus.png',
  '/assets/arctic-icons/search.png',
  '/assets/arctic-icons/settings-basic.png',
  '/assets/arctic-icons/settings.png',
  '/assets/arctic-icons/shuffle.png',
  '/assets/arctic-icons/sidemenu.png',
  '/assets/arctic-icons/sliders.png',
  '/assets/arctic-icons/star.png',
  '/assets/arctic-icons/tv.png',
  '/assets/arctic-icons/tvguide.png',
  '/assets/arctic-icons/user.png',
  '/assets/arctic-icons/view-list.png',
  '/assets/arctic-icons/watched-hide.png',
  '/assets/arctic-icons/watched-show.png',
  '/assets/arctic-icons/watchlist.png',
  '/assets/arctic-icons/xmark.png',
  '/assets/ui-icons/arrow-trend-up.png',
  '/assets/ui-icons/bars-progress.png',
  '/assets/ui-icons/bookmark.png',
  '/assets/ui-icons/bookmarks.png',
  '/assets/ui-icons/calendar.png',
  '/assets/ui-icons/check.png',
  '/assets/ui-icons/chevron-right.png',
  '/assets/ui-icons/circle-check.png',
  '/assets/ui-icons/circle-info.png',
  '/assets/ui-icons/circle-play.png',
  '/assets/ui-icons/clock.png',
  '/assets/ui-icons/compass.png',
  '/assets/ui-icons/eye.png',
  '/assets/ui-icons/film.png',
  '/assets/ui-icons/filter.png',
  '/assets/ui-icons/grid.png',
  '/assets/ui-icons/heart.png',
  '/assets/ui-icons/home.png',
  '/assets/ui-icons/info.png',
  '/assets/ui-icons/list-check.png',
  '/assets/ui-icons/list.png',
  '/assets/ui-icons/mask.png',
  '/assets/ui-icons/minus.png',
  '/assets/ui-icons/person.png',
  '/assets/ui-icons/play.png',
  '/assets/ui-icons/play2.png',
  '/assets/ui-icons/plus.png',
  '/assets/ui-icons/search.png',
  '/assets/ui-icons/settings-basic.png',
  '/assets/ui-icons/settings.png',
  '/assets/ui-icons/shuffle.png',
  '/assets/ui-icons/sidemenu.png',
  '/assets/ui-icons/sliders.png',
  '/assets/ui-icons/star.png',
  '/assets/ui-icons/tv.png',
  '/assets/ui-icons/tvguide.png',
  '/assets/ui-icons/user.png',
  '/assets/ui-icons/view-list.png',
  '/assets/ui-icons/watched-hide.png',
  '/assets/ui-icons/watched-show.png',
  '/assets/ui-icons/watchlist.png',
  '/assets/ui-icons/xmark.png'
];
const STATIC_PATHS = new Set(STATIC_SHELL);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Abort activation if the entire static shell cannot be retrieved.
    await cache.addAll(STATIC_SHELL);
    // Updates remain waiting until the user chooses to reload, avoiding a mix
    // of old HTML and new JS/CSS while an open tab is in use.
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') {
    // Sent only from the visible 'Reload to update' user action.
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  // Auth callbacks and API routes must always hit the network. In particular,
  // never store responses containing personal lists, tokens or query credentials.
  if (path.startsWith('/api/') || path.startsWith('/.netlify/') ||
      path === '/callback' || path.startsWith('/callback/') ||
      path === '/local-login.html' || path === '/service-worker.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      // Keep HTML and its unversioned JS/CSS in the same release until the
      // waiting update is accepted. A newer network HTML can require newer JS.
      const cached = await caches.match('/index.html', {cacheName: CACHE_NAME});
      return cached || fetch(request);
    })());
    return;
  }

  if (STATIC_PATHS.has(path)) {
    event.respondWith((async () => {
      const cached = await caches.match(path, {cacheName: CACHE_NAME});
      return cached || fetch(request);
    })());
  }
});
