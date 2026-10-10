import { offlinePage } from './offline'

export const workerScript = `const offline = ${JSON.stringify(offlinePage)}
const store = 'sand-shell-v1'
const options = { ignoreVary: true }

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== store).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const isScript = url => url.origin === location.origin && url.pathname === '/app.js' && url.searchParams.has('build')
const isFresh = response => response.ok && response.type === 'basic' && /immutable/.test(response.headers.get('cache-control') || '')

const keepOnly = async (cache, url) => {
  const keys = await cache.keys()
  await Promise.all(keys.filter(key => new URL(key.url).pathname === '/app.js' && key.url !== url).map(key => cache.delete(key)))
}

const script = async request => {
  const cache = await caches.open(store)
  const hit = await cache.match(request, options)
  if (hit) return hit
  const response = await fetch(request)
  if (isFresh(response)) {
    await cache.put(request, response.clone())
    await keepOnly(cache, request.url)
  }
  return response
}

const offlineResponse = () =>
  new Response(offline, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })

const navigate = async request => {
  const cache = await caches.open(store)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic' && !response.redirected && new URL(request.url).pathname === '/') await cache.put('/', response.clone())
    return response
  } catch {
    return (await cache.match('/', options)) || offlineResponse()
  }
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  if (request.mode === 'navigate') return event.respondWith(navigate(request))
  if (isScript(new URL(request.url))) event.respondWith(script(request))
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
