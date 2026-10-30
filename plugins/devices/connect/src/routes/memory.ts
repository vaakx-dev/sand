import type { PcRoutes, RouteStore } from '@sand/devices-contract'

export const memoryRouteStore = (): RouteStore => {
  const saved = new Map<string, PcRoutes>()
  return {
    load: pc => saved.get(pc),
    save: (pc, routes) => void saved.set(pc, routes),
  }
}
