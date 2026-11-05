import { pageLinkKeys, type PublishedRoute, type ShareLink } from '@sand/devices-contract'
import { trimSlash } from '@sand/util'

type LinkKey = keyof typeof pageLinkKeys

const ranks: Record<PublishedRoute['kind'], number> = { tailscale: 2, lan: 1, local: 3 }

const rank = (route: PublishedRoute) => (route.kind === 'tailscale' && route.url.startsWith('https:') ? 0 : ranks[route.kind])

const byRank = (a: PublishedRoute, b: PublishedRoute) => rank(a) - rank(b)

const awayRoutes = (routes: PublishedRoute[]) => routes.filter(route => route.kind !== 'local').sort(byRank)

export const pageLink = (base: string, key: LinkKey, value: string) => `${trimSlash(base)}/#${pageLinkKeys[key]}=${encodeURIComponent(value)}`

export const shareLinks = (routes: PublishedRoute[], key: LinkKey, value: string): ShareLink[] =>
  awayRoutes(routes).map(route => ({ route, url: pageLink(route.url, key, value) }))

export const endpointLinks = (routes: PublishedRoute[], path: string): ShareLink[] =>
  routes.toSorted(byRank).map(route => ({ route, url: `${trimSlash(route.url)}${path}` }))

export const tokenOf = (link: string) => {
  try {
    const hash = new URL(link).hash.replace(/^#/, '')
    return new URLSearchParams(hash).get(pageLinkKeys.pair) || undefined
  } catch {
    return undefined
  }
}

export const baseOf = (link: string) => {
  const url = new URL(link)
  return trimSlash(`${url.origin}${url.pathname}`)
}
