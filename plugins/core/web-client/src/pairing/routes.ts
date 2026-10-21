import { isLoopbackHost, parseUrl } from '@sand/host-remotes/pairing'
import type { RouteKind } from '@sand/host-gateway/contract'

const ranks: Record<RouteKind, number> = { local: 0, lan: 1, tailscale: 2 }

export const routeLabel = (kind: RouteKind, url?: string) => {
  if (kind === 'local') return 'this PC'
  if (kind === 'lan') return 'wifi'
  return url && parseUrl(url)?.protocol === 'https:' ? 'Tailscale HTTPS' : 'Tailscale'
}

export const routeUsable = (url: string, page: { protocol: string } = location) => {
  const parsed = parseUrl(url)
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) return false
  if (page.protocol !== 'https:') return true
  return parsed.protocol === 'https:' || isLoopbackHost(parsed.hostname)
}

export const routeRank = (kind: RouteKind) => ranks[kind]
