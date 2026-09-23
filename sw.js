/* 초등노트 — 서비스워커 v9
   HTML(페이지)은 네트워크 우선 → 새 배포가 바로 반영, 오프라인이면 캐시 사용.
   아이콘·학년 콘텐츠 등 정적 파일은 캐시 우선(=새 학년 파일 추가/수정 시 이 버전을 올려야 반영). */
const CACHE = 'riwon-math-v20';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png',
  './grades/g1.js', './grades/g3-time.js', './daily.js', './expr.js', './coach.js', './ui.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 서버 API(다른 주소)는 절대 캐시하지 않는다 — 캐시하면 기록·숙제·리포트 상태가 첫 응답에 멈춤(9/24 사고)
  if (url.origin !== location.origin) return;
  const isPage = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', cp));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // 앱 코드(.js·manifest)는 네트워크 우선 → 배포 뒤 새로고침 한 번이면 새 코드. 오프라인이면 캐시.
  if (url.origin === location.origin && /\.(js|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const cp = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp));
      return resp;
    }))
  );
});
