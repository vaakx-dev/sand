import { routeKind, routeRank } from '@sand/kit'
import { routes, type StoredRoute } from './book'
import { latencySlack, type Route } from './select'

const healthy = (route: StoredRoute) => route.latency !== undefined && !(route.failed && route.failed > (route.seen ?? 0))

export const onSlowerRoute = (current: Route, urls: string[], host: string) => {
  if (urls.some(url => url !== current.url && routeRank(routeKind(url)) < routeRank(current.kind))) return true
  const known = routes(host).filter(route => urls.includes(route.url) && healthy(route))
  const mine = known.find(route => route.url === current.url)?.latency ?? Math.round(current.latency)
  return known.some(route => route.url !== current.url && (route.latency ?? Infinity) + latencySlack < mine)
}
