import type { RouteKind } from '@sand/host-gateway/contract'

const ranks: Record<RouteKind, number> = { local: 0, lan: 1, tailscale: 2 }

const unbracket = (hostname: string) => hostname.replace(/^\[|\]$/g, '').toLowerCase()

const parse = (url: string) => {
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

export const isTailscaleHost = (hostname: string) => {
  const host = unbracket(hostname).replace(/\.$/, '')
  if (host.endsWith('.ts.net')) return true
  if (host.startsWith('fd7a:115c:a1e0:')) return true
  const parts = ipv4(host)
  return parts?.[0] === 100 && (parts[1] ?? 0) >= 64 && (parts[1] ?? 0) <= 127
}

export const routeKind = (url: string): RouteKind => {
  const parsed = parse(url)
  if (!parsed) return 'lan'
  if (isLoopbackHost(parsed.hostname)) return 'local'
  if (isTailscaleHost(parsed.hostname)) return 'tailscale'
  return 'lan'
}

export const routeLabel = (kind: RouteKind, url?: string) => {
  if (kind === 'local') return 'this PC'
  if (kind === 'lan') return 'wifi'
  return url && parse(url)?.protocol === 'https:' ? 'Tailscale HTTPS' : 'Tailscale'
}

export const routeUsable = (url: string, page: { protocol: string } = location) => {
  const parsed = parse(url)
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) return false
  if (page.protocol !== 'https:') return true
  return parsed.protocol === 'https:' || isLoopbackHost(parsed.hostname)
}

export const routeRank = (kind: RouteKind) => ranks[kind]
