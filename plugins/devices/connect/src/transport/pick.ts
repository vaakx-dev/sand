import type { Route, Transport, Transports } from '@sand/devices-contract'

export const transportOf = (transports: Transports, route: Route): Transport => {
  if (route.via !== undefined) return transports.via(route.via)
  if (route.url !== undefined) return transports.direct(route.url)
  throw new Error(`route ${route.key} has no address`)
}
