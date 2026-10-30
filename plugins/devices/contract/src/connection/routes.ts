export type RouteKind = 'local' | 'lan' | 'tailscale' | 'via'

export type DirectRouteKind = Exclude<RouteKind, 'via'>

export type RouteSource = 'published' | 'seed' | 'added'

export interface Route {
  key: string
  kind: RouteKind
  source: RouteSource
  url?: string
  via?: string
}

export interface PublishedRoute {
  url: string
  kind: DirectRouteKind
}

export interface RoutePrefs {
  order: string[]
  disabled: string[]
}

export interface PcRoutes {
  routes: Route[]
  prefs: RoutePrefs
}

export type RouteBlock = 'blocked-https' | 'disabled'

export interface RouteEntry {
  route: Route
  rank: number
  usable: boolean
  blocked?: RouteBlock
}
