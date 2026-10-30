import { pageLinkKeys, type PublishedRoute, type ShareLink } from '@sand/devices-contract'
import { trimSlash } from '@sand/util'

type LinkKey = keyof typeof pageLinkKeys

const rank = (route: PublishedRoute) => {
  if (route.kind === 'tailscale' && route.url.startsWith('https:')) return 0
  return route.kind === 'lan' ? 1 : 2
}

const awayRoutes = (routes: PublishedRoute[]) => routes.filter(route => route.kind !== 'local').sort((a, b) => rank(a) - rank(b))

export const pageLink = (base: string, key: LinkKey, value: string) => `${trimSlash(base)}/#${pageLinkKeys[key]}=${encodeURIComponent(value)}`

export const shareLinks = (routes: PublishedRoute[], key: LinkKey, value: string): ShareLink[] =>
  awayRoutes(routes).map(route => ({ route, url: pageLink(route.url, key, value) }))

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
