import { routeKind, routeRank, routeUsable } from '@sand/kit'
import { routes, type StoredRoute } from './book'
import type { Route } from './select'
import { originOf } from './url'

export const latencySlack = 20

const byRank = (a: StoredRoute, b: StoredRoute) =>
  routeRank(a.kind) - routeRank(b.kind) || (a.latency ?? Infinity) - (b.latency ?? Infinity)

const healthy = (route: StoredRoute) => route.latency !== undefined && !(route.failed && route.failed > (route.seen ?? 0))

export const candidates = (seeds: string[], host: string | undefined): string[] => {
  const known = [...routes(host)].sort(byRank).map(route => route.url)
  const urls = [...seeds.map(originOf), ...known].filter(url => url !== undefined)
  return [...new Set(urls)].filter(url => routeUsable(url))
}

const restBase = 60_000
const restMax = 60 * 60_000

const resting = (route: StoredRoute, now: number) =>
  route.misses !== undefined && route.failed !== undefined && now - route.failed < Math.min(restMax, restBase * 2 ** (route.misses - 1))

export const worthProbing = (urls: string[], host: string, current: string) => {
  const now = Date.now()
  const down = new Set(routes(host).filter(route => route.url !== current && resting(route, now)).map(route => route.url))
  return urls.filter(url => !down.has(url))
}

export const onSlowerRoute = (current: Route, urls: string[], host: string) => {
  if (urls.some(url => url !== current.url && routeRank(routeKind(url)) < routeRank(current.kind))) return true
  const known = routes(host).filter(route => urls.includes(route.url) && healthy(route))
  const mine = known.find(route => route.url === current.url)?.latency ?? Math.round(current.latency)
  return known.some(route => route.url !== current.url && (route.latency ?? Infinity) + latencySlack < mine)
}
