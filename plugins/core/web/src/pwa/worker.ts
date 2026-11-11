import { ASSETS, type Bundle } from '../bundle/build'
import { offlinePage } from './offline'

const workerScript = (assets: string[]) => `const offline = ${JSON.stringify(offlinePage)}
const assets = ${JSON.stringify(assets)}
const store = 'sand-shell-v2'
const options = { ignoreVary: true }

const isAsset = url => url.origin === location.origin && url.pathname.startsWith(${JSON.stringify(ASSETS)})
const isFresh = response => response.ok && response.type === 'basic' && /immutable/.test(response.headers.get('cache-control') || '')

const precache = async () => {
  const cache = await caches.open(store)
  const kept = new Set((await cache.keys()).map(key => new URL(key.url).pathname))
  await cache.addAll(assets.filter(asset => !kept.has(asset)))
}

const prune = async () => {
  const cache = await caches.open(store)
  const wanted = new Set(assets)
  const stale = (await cache.keys()).filter(key => isAsset(new URL(key.url)) && !wanted.has(new URL(key.url).pathname))
  await Promise.all(stale.map(key => cache.delete(key)))
}

self.addEventListener('install', event => event.waitUntil(precache().then(() => self.skipWaiting())))

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== store).map(key => caches.delete(key))))
      .then(prune)
      .then(() => self.clients.claim()),
  )
})

const asset = async request => {
  const cache = await caches.open(store)
  const hit = await cache.match(request, options)
  if (hit) return hit
  const response = await fetch(request)
  if (isFresh(response)) await cache.put(request, response.clone())
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
  if (isAsset(new URL(request.url))) event.respondWith(asset(request))
})

const pages = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true })

const watched = async () => (await pages()).some(page => page.visibilityState === 'visible' && page.focused)

const showPush = async notice => {
  if (await watched()) return
  await self.registration.showNotification(notice.title, { body: notice.body, tag: notice.tag, icon: '/icons/192x192.png', data: notice })
}

self.addEventListener('push', event => {
  event.waitUntil(showPush(event.data ? event.data.json() : { title: 'sand' }))
})

const addressOf = notice => {
  if (notice.thread) return '/?session=' + encodeURIComponent(notice.thread)
  return notice.bot ? '/?bot=' + encodeURIComponent(notice.bot) : '/'
}

const openNotice = async notice => {
  const [page] = await pages()
  if (!page) return self.clients.openWindow(addressOf(notice))
  page.postMessage({ notice })
  return page.focus()
}

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(openNotice(event.notification.data || {}))
})
`

export const workerResponse = ({ assets }: Bundle) =>
  new Response(workerScript([...assets.keys()]), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
