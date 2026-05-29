const CACHE_VERSION = 'onstage-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (url.pathname === '/shows.json') {
		event.respondWith(networkFirst(request));
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(() =>
				caches.match(request).then((cached) => cached || caches.match('/'))
			)
		);
		return;
	}

	event.respondWith(staleWhileRevalidate(request));
});

function networkFirst(request) {
	return fetch(request)
		.then((response) => {
			if (response && response.ok) {
				const copy = response.clone();
				caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
			}
			return response;
		})
		.catch(() => caches.match(request));
}

function staleWhileRevalidate(request) {
	return caches.open(CACHE_VERSION).then((cache) =>
		cache.match(request).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response && response.ok) cache.put(request, response.clone());
					return response;
				})
				.catch(() => cached);
			return cached || network;
		})
	);
}
