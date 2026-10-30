import type { DirectRouteKind } from '@sand/devices-contract'

const tailscaleSuffix = '.ts.net'
const tailscaleV6Prefix = 'fd7a:115c:a1e0:'

const ipv4Parts = (host: string) => {
  const parts = host.split('.')
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part)) ? parts.map(Number) : undefined
}

const isTailscaleV4 = (host: string) => {
  const parts = ipv4Parts(host)
  return parts !== undefined && parts[0] === 100 && parts[1]! >= 64 && parts[1]! < 128
}

export const hostnameOf = (url: string) => new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase()

export const isLoopbackHost = (host: string) =>
  host === 'localhost' || host.endsWith('.localhost') || host === '::1' || ipv4Parts(host)?.[0] === 127

export const kindOfHost = (host: string): DirectRouteKind => {
  if (isLoopbackHost(host)) return 'local'
  if (host.endsWith(tailscaleSuffix) || host.startsWith(tailscaleV6Prefix) || isTailscaleV4(host)) return 'tailscale'
  return 'lan'
}

export const kindOfUrl = (url: string) => kindOfHost(hostnameOf(url))
