import type { RouteKind } from '@sand/host-gateway/contract'

const unbracket = (hostname: string) => hostname.replace(/^\[|\]$/g, '').toLowerCase()

export const parseUrl = (url: string) => {
  try {
    return new URL(url)
  } catch {
    return
  }
}

const ipv4 = (hostname: string) => {
  const parts = hostname.split('.')
  if (parts.length !== 4 || !parts.every(part => /^\d{1,3}$/.test(part))) return
  const numbers = parts.map(Number)
  return numbers.every(part => part <= 255) ? numbers : undefined
}

export const isLoopbackHost = (hostname: string) => {
  const host = unbracket(hostname)
  return host === 'localhost' || host === '::1' || ipv4(host)?.[0] === 127
}

const isTailscaleHost = (hostname: string) => {
  const host = unbracket(hostname).replace(/\.$/, '')
  if (host.endsWith('.ts.net')) return true
  if (host.startsWith('fd7a:115c:a1e0:')) return true
  const [first, second = 0] = ipv4(host) ?? []
  return first === 100 && second >= 64 && second <= 127
}

export const routeKind = (url: string): RouteKind => {
  const parsed = parseUrl(url)
  if (!parsed) return 'lan'
  if (isLoopbackHost(parsed.hostname)) return 'local'
  if (isTailscaleHost(parsed.hostname)) return 'tailscale'
  return 'lan'
}
