// ===== サービスワーカー（オフライン対応のキャッシュ係） =====
// アプリのファイルを端末に保存し、電波がなくても起動できるようにする。

// キャッシュ名。アプリを更新したら数字（v1 → v2 ...）を上げると、
// 古いキャッシュが破棄され、新しいファイルが読み込まれる。
const CACHE_NAME = "todo-app-v1";

// オフラインでも使えるように保存しておくファイル一覧
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// インストール時：上記ファイルをまとめてキャッシュに保存
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 有効化時：古いバージョンのキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 読み込み時：まずキャッシュを探し、なければネットから取得（取れたら保存）
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
