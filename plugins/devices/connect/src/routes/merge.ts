import type { Route, RouteSource } from '@sand/devices-contract'

const sourceWeight: Record<RouteSource, number> = { seed: 0, published: 1, added: 2 }

export const mergeRoutes = (...lists: Route[][]): Route[] => {
  const byKey = new Map<string, Route>()
  for (const route of lists.flat()) {
    const known = byKey.get(route.key)
    if (!known || sourceWeight[route.source] >= sourceWeight[known.source]) byKey.set(route.key, route)
  }
  return [...byKey.values()]
}

export const sameRoutes = (a: Route[], b: Route[]) =>
  a.length === b.length && a.every((route, index) => JSON.stringify(route) === JSON.stringify(b[index]))
