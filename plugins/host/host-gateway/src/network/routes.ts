import type { TailscaleState } from '@sand/host-tailscale/contract'
import { routeKind } from '@sand/kit'
import type { HostRoute } from '../contract'
import { isLoopbackUrl } from './addresses'

export interface RoutesInput {
  urls: string[]
  lan: boolean
  port: number
  tailscale?: TailscaleState
}

const tailnet = (url: string): HostRoute => ({ url, kind: 'tailscale' })

const unique = (routes: HostRoute[]) => {
  const seen = new Set<string>()
  return routes.filter(route => !seen.has(route.url) && seen.add(route.url))
}

const tailnetHttp = ({ lan, port, tailscale }: RoutesInput) => {
  if (!lan || !tailscale?.running) return { ips: [], names: [] }
  return {
    ips: tailscale.ip ? [tailnet(`http://${tailscale.ip}:${port}`)] : [],
    names: tailscale.name ? [tailnet(`http://${tailscale.name}:${port}`)] : [],
  }
}

export const hostRoutes = (input: RoutesInput): HostRoute[] => {
  const listed = input.urls.filter(url => !isLoopbackUrl(url)).map(url => ({ url, kind: routeKind(url) }))
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
