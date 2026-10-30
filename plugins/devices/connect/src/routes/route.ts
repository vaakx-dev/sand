import type { DirectRouteKind, PublishedRoute, Route, RouteSource } from '@sand/devices-contract'
import { kindOfUrl } from './kind'

export const originOf = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : undefined
  } catch {
    return undefined
  }
}

export const directRoute = (url: string, source: RouteSource, kind?: DirectRouteKind): Route | undefined => {
  const origin = originOf(url)
  return origin ? { key: origin, kind: kind ?? kindOfUrl(origin), source, url: origin } : undefined
}

export const viaRoute = (pc: string, source: RouteSource = 'seed'): Route => ({ key: `via:${pc}`, kind: 'via', source, via: pc })

export const publishedRoutes = (published: PublishedRoute[]) =>
  published.map(route => directRoute(route.url, 'published', route.kind)).filter(route => route !== undefined)
