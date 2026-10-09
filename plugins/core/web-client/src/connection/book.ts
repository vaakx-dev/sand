import type { HostRoute, RouteKind } from '@sand/host-gateway/contract'
import { routeKind } from '@sand/kit'

export interface StoredRoute {
  url: string
  kind: RouteKind
  latency?: number
  seen?: number
  failed?: number
}

type Book = Record<string, StoredRoute[]>

const storageKey = 'sand.routes'
const homeKey = 'sand.home'
const limit = 16
const stale = 30 * 24 * 60 * 60 * 1000

export const originOf = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : undefined
  } catch {
    return undefined
  }
}

const valid = (value: unknown): value is StoredRoute =>
  typeof value === 'object' && value !== null && typeof (value as StoredRoute).url === 'string' && typeof (value as StoredRoute).kind === 'string'

const read = (): Book => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([host, list]) => [host, Array.isArray(list) ? list.filter(valid) : []]),
    )
  } catch {
    return {}
  }
}

const write = (book: Book) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(book))
  } catch {}
}

const update = (host: string, change: (list: StoredRoute[]) => StoredRoute[]) => {
  const book = read()
  book[host] = change(book[host] ?? [])
  write(book)
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

export const homeHost = (): string | undefined => {
  try {
    return localStorage.getItem(homeKey) ?? undefined
  } catch {
    return undefined
  }
}

export const setHomeHost = (id: string) => {
  try {
    localStorage.setItem(homeKey, id)
  } catch {}
}
