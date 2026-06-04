const CACHE_NAME = "cute-tile-garden-v12";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./assets/audio/bgm.wav",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/pwa-icon-192.png",
  "./assets/icons/pwa-icon-512.png",
  "./assets/animals/capybara.png",
  "./assets/animals/cat.png",
  "./assets/animals/chick.png",
  "./assets/animals/deer.png",
  "./assets/animals/duck.png",
  "./assets/animals/dwarf-rabbit.png",
  "./assets/animals/fox.png",
  "./assets/animals/frog.png",
  "./assets/animals/hedgehog.png",
  "./assets/animals/hippo.png",
  "./assets/animals/monkey.png",
  "./assets/animals/octopus.png",
  "./assets/animals/otter.png",
  "./assets/animals/owl.png",
  "./assets/animals/panda.png",
  "./assets/animals/penguin.png",
  "./assets/animals/pig.png",
  "./assets/animals/red-panda.png",
  "./assets/animals/seal.png",
  "./assets/animals/sheep.png",
  "./assets/animals/turtle.png",
  "./assets/meme-confuse-1.png",
  "./assets/meme-confuse-2.png",
  "./assets/meme-confuse-3.png",
  "./assets/meme-contact.png",
  "./assets/meme-fail-1.png",
  "./assets/meme-fail-2.png",
  "./assets/meme-fail-3.png",
  "./assets/meme-fail-angry.png",
  "./assets/meme-fail-sad.png",
  "./assets/meme-happy-1.png",
  "./assets/meme-happy-2.png",
  "./assets/meme-happy-3.png",
  "./assets/meme-happy-4.png",
  "./assets/meme-success.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }),
    ),
  );
});
