import type { Route } from '@sand/devices-contract'

export const headStart = 500
export const callTimeout = 30_000
export const quietAfter = 10_000
export const upgradeEvery = 60_000
export const drainMax = 30_000
export const steadyAfter = 30_000
export const backoffMax = 30_000
export const backoffBase = 1000

const nearby = (route: Route) => route.kind === 'local' || route.kind === 'lan'

export const probeTimeout = (route: Route) => (nearby(route) ? 3000 : 8000)

export const pingTimeout = (route: Route) => (nearby(route) ? 3000 : 10_000)
