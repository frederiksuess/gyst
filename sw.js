// GYST service worker — app shell offline, fonts cached on first use.
const VERSION = 'gyst-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // App shell: serve from cache, refresh in the background.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const fresh = fetch(e.request).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(e.request, r.clone())); return r; }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }
  // Fonts: cache first, then network.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(e.request, r.clone())); return r; })));
  }
});

// Reminder notifications: open the task when tapped.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL('./', self.registration.scope).href + ((e.notification.data && e.notification.data.url) || '');
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if (c.url.startsWith(self.registration.scope)) { if (c.navigate) c.navigate(target); return c.focus(); } }
    return clients.openWindow(target);
  }));
});

// Periodic background sync (Chrome, installed app only, interval chosen by the system): show overdue reminders.
self.addEventListener('periodicsync', e => { if (e.tag === 'gyst-reminders') e.waitUntil(checkReminders()); });

function kv(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('gyst', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const tx = r.result.transaction('kv', mode); fn(tx.objectStore('kv'), res, rej); };
  });
}
const kvGet = k => kv('readonly', (st, res, rej) => { const q = st.get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const kvSet = (k, v) => kv('readwrite', (st, res, rej) => { const q = st.put(v, k); q.onsuccess = () => res(); q.onerror = () => rej(q.error); });

async function checkReminders() {
  try {
    const raw = await kvGet('state'); if (!raw) return;
    const S = JSON.parse(raw); const notified = (await kvGet('notified')) || {};
    const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = Date.now(); let changed = false;
    for (const t of S.tasks || []) {
      if (!t.reminder || notified[t.id] === t.reminder) continue;
      const done = t.repeat ? t.completedOn === today : !!t.done; if (done) continue;
      const at = new Date(t.reminder).getTime(); if (isNaN(at) || at > now) continue;
      await self.registration.showNotification(t.title, { body: (t.description || '').split('\n')[0].slice(0, 120), tag: 'gyst-' + t.id, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: '#/tasks/' + t.id } });
      notified[t.id] = t.reminder; changed = true;
    }
    if (changed) await kvSet('notified', notified);
  } catch (e) { /* best effort */ }
}
