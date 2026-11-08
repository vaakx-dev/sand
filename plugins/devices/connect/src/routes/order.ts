import type { ConnectOptions, Route, RouteBlock, RouteEntry, RouteKind, RoutePrefs } from '@sand/devices-contract'
import { hostnameOf, isLoopbackHost } from './kind'

const kindRank: Record<RouteKind, number> = { local: 0, lan: 1, tailscale: 2, via: 3 }

const byKind = (a: Route, b: Route) => kindRank[a.kind] - kindRank[b.kind]

const userOrdered = (routes: Route[], order: string[]) => {
  const listed = [...new Set(order)].map(key => routes.find(route => route.key === key)).filter(route => route !== undefined)
  const keys = new Set(listed.map(route => route.key))
  let next = 0
  return routes.map(route => (keys.has(route.key) ? listed[next++]! : route))
}

const mixedContent = (route: Route, secure: boolean) =>
  secure && route.url !== undefined && route.url.startsWith('http:') && !isLoopbackHost(hostnameOf(route.url))

const blockOf = (route: Route, prefs: RoutePrefs, secure: boolean): RouteBlock | undefined => {
  if (prefs.disabled.includes(route.key)) return 'disabled'
  if (mixedContent(route, secure)) return 'blocked-https'
  return undefined
}

export type Reach = Pick<ConnectOptions, 'secure' | 'onPc'>

const reachable = (route: Route, reach: Reach) => reach.onPc || route.kind !== 'local'

export const orderRoutes = (routes: Route[], prefs: RoutePrefs, reach: Reach): RouteEntry[] =>
  userOrdered(routes.filter(route => reachable(route, reach)).sort(byKind), prefs.order).map((route, rank) => {
    const blocked = blockOf(route, prefs, reach.secure)
    return blocked ? { route, rank, usable: false, blocked } : { route, rank, usable: true }
  })
