import { offlinePage } from './offline'

export const workerScript = `const offline = ${JSON.stringify(offlinePage)}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(offline, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }),
    ),
  )
})
`

export const workerRoute = () =>
  new Response(workerScript, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
