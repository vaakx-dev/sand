import { routeRank, routeUsable } from '@sand/kit'
import { originOf, routes, type StoredRoute } from './book'

const byRank = (a: StoredRoute, b: StoredRoute) =>
  routeRank(a.kind) - routeRank(b.kind) || (a.latency ?? Infinity) - (b.latency ?? Infinity)

export const candidates = (seeds: string[], host: string | undefined): string[] => {
  const known = [...routes(host)].sort(byRank).map(route => route.url)
  const urls = [...seeds.map(originOf), ...known].filter((url): url is string => url !== undefined)
  return [...new Set(urls)].filter(url => routeUsable(url))
}
