const CACHE_NAME = 'liquid-ai-v1';
const ASSETS = [
    './index.html',
    './manifest.json'
];

// Установка воркера и кэширование статики
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Активация и очистка старых кэшей
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Стратегия Network First с фоллбеком на Cache для статики
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Не кэшируем API-запросы нейросетей
    if (url.pathname.includes('/chat/completions') || event.request.method === 'POST') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Если запрос успешен и это наш origin, обновляем кэш
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Если нет интернета — отдаем из кэша
                return caches.match(event.request);
            })
    );
});