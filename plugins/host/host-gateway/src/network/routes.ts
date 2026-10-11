import type { TailscaleState } from '@sand/host-tailscale/contract'
import { routeKind } from '@sand/kit'
import type { HostRoute } from '../contract'

export interface RoutesInput {
  urls: string[]
  lan: boolean
  port: number
  tailscale?: TailscaleState
}

const tailnet = (url: string): HostRoute => ({ url, kind: 'tailscale' })

const unique = (routes: HostRoute[]) => routes.filter((route, index) => routes.findIndex(other => other.url === route.url) === index)

const tailnetHttp = ({ lan, port, tailscale }: RoutesInput) => {
  if (!lan || !tailscale?.running) return { ips: [], names: [] }
  return {
    ips: tailscale.ip ? [tailnet(`http://${tailscale.ip}:${port}`)] : [],
    names: tailscale.name ? [tailnet(`http://${tailscale.name}:${port}`)] : [],
  }
}

export const hostRoutes = (input: RoutesInput): HostRoute[] => {
  const listed = input.urls.map(url => ({ url, kind: routeKind(url) })).filter(route => route.kind !== 'local')
  const { ips, names } = tailnetHttp(input)
  const { serving, httpsUrl } = input.tailscale ?? {}
  return unique([
    ...listed.filter(route => route.kind !== 'tailscale'),
    ...listed.filter(route => route.kind === 'tailscale'),
    ...ips,
    ...names,
    ...(serving && httpsUrl ? [tailnet(httpsUrl)] : []),
  ])
}
