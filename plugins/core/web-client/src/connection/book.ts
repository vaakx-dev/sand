import type { HostRoute, RouteKind } from '@sand/host-gateway/contract'
import { isRecord, routeKind } from '@sand/kit'
import { loadRecord, loadText, saveJson, saveText } from '../integrations/storage'
import { originOf } from './url'

export interface StoredRoute {
  url: string
  kind: RouteKind
  latency?: number
  seen?: number
  failed?: number
}

type Book = Record<string, StoredRoute[]>

const routesKey = 'sand.routes'
const homeKey = 'sand.home'
const limit = 16
const stale = 30 * 24 * 60 * 60 * 1000

const isRoute = (value: unknown): value is StoredRoute =>
  isRecord(value) && typeof value.url === 'string' && typeof value.kind === 'string'

const read = (): Book =>
  Object.fromEntries(Object.entries(loadRecord(routesKey)).map(([host, list]) => [host, Array.isArray(list) ? list.filter(isRoute) : []]))

const update = (host: string, change: (list: StoredRoute[]) => StoredRoute[]) => {
  const book = read()
  book[host] = change(book[host] ?? [])
  saveJson(routesKey, book)
}

const entry = (list: StoredRoute[], url: string) => list.find(route => route.url === url)

export const routes = (host: string | undefined): StoredRoute[] => (host ? (read()[host] ?? []) : [])

export const learn = (host: string, urls: (string | HostRoute)[]) => {
  const now = Date.now()
  const fresh = new Set<string>()
  update(host, list => {
    const next = list.map(route => ({ ...route }))
    for (const item of urls) {
      const url = originOf(typeof item === 'string' ? item : item.url)
      if (!url) continue
      fresh.add(url)
      const kind = typeof item === 'string' ? routeKind(url) : item.kind
      const known = entry(next, url)
      if (known) Object.assign(known, { kind, seen: now })
      else next.push({ url, kind, seen: now })
    }
    return next
      .filter(route => fresh.has(route.url) || now - (route.seen ?? 0) < stale)
      .sort((a, b) => (b.seen ?? 0) - (a.seen ?? 0))
      .slice(0, limit)
  })
}

export const succeeded = (host: string, url: string, latency: number) => {
  const origin = originOf(url)
  if (!origin) return
  update(host, list => {
    const rest = list.filter(route => route.url !== origin)
    return [{ url: origin, kind: entry(list, origin)?.kind ?? routeKind(origin), latency: Math.round(latency), seen: Date.now() }, ...rest].slice(0, limit)
  })
}

export const failed = (host: string, url: string) => {
  const origin = originOf(url)
  if (!origin || !entry(routes(host), origin)) return
  update(host, list => list.map(route => (route.url === origin ? { ...route, failed: Date.now() } : route)))
}

export const homeHost = () => loadText(homeKey)

export const setHomeHost = (id: string) => saveText(homeKey, id)
