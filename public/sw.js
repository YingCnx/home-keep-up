const CACHE_NAME = 'kubaan-v1'

// ไฟล์ที่ cache ไว้สำหรับ offline (app shell)
const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
]

// Install — cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate — ลบ cache เก่า
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  e.waitUntil(clients.claim())
})

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // ข้าม Supabase API calls (ต้องการ network เสมอ)
  if (url.hostname.includes('supabase.co')) return

  // ข้าม non-GET requests
  if (request.method !== 'GET') return

  e.respondWith(
    fetch(request)
      .then(response => {
        // cache response ใหม่ถ้าเป็น static asset
        if (response.ok && (
          url.pathname.match(/\.(png|jpg|svg|ico|webp|woff2?)$/) ||
          url.pathname === '/' ||
          url.pathname === '/login'
        )) {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned))
        }
        return response
      })
      .catch(() => {
        // ไม่มีเน็ต — ดึงจาก cache
        return caches.match(request).then(cached => {
          if (cached) return cached
          // ถ้า navigate ไปหน้าอื่นแล้วไม่มี cache — คืน offline page
          if (request.mode === 'navigate') return caches.match('/')
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// Push notification
self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Home Keep Up', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'reminder',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'))
})
