import type { NetworkScope, PublishedRoute, TailscaleState } from '@sand/devices-contract'
import { urlFor } from './hosts'

export interface RouteInputs {
  scope: NetworkScope
  port: number
  lan: string[]
  tailscale?: TailscaleState
}

const unique = (routes: PublishedRoute[]) => routes.filter((route, index) => routes.findIndex(other => other.url === route.url) === index)

const tailnetRoutes = ({ scope, port, tailscale }: RouteInputs): PublishedRoute[] => {
  if (!tailscale?.running) return []
  const direct = scope === 'network'
  return [
    ...(tailscale.serving && tailscale.httpsUrl ? [tailscale.httpsUrl] : []),
    ...(direct && tailscale.ip ? [urlFor(tailscale.ip, port)] : []),
    ...(direct && tailscale.name ? [`http://${tailscale.name}:${port}`] : []),
  ].map(url => ({ url, kind: 'tailscale' }))
}

export const routesFor = (inputs: RouteInputs): PublishedRoute[] => {
  const lan = inputs.scope === 'network' ? inputs.lan.map(address => ({ url: urlFor(address, inputs.port), kind: 'lan' as const })) : []
  return unique([{ url: urlFor('127.0.0.1', inputs.port), kind: 'local' }, ...lan, ...tailnetRoutes(inputs)])
}
