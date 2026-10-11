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

export const onSlowerRoute = (current: Route, urls: string[], host: string) => {
  if (urls.some(url => url !== current.url && routeRank(routeKind(url)) < routeRank(current.kind))) return true
  const known = routes(host).filter(route => urls.includes(route.url) && healthy(route))
  const mine = known.find(route => route.url === current.url)?.latency ?? Math.round(current.latency)
  return known.some(route => route.url !== current.url && (route.latency ?? Infinity) + latencySlack < mine)
}
