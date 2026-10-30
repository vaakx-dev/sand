import type { PublishedRoute } from '../connection/routes'

export const pageLinkKeys = {
  pair: 'pair',
  approve: 'approve',
} as const

export type PageLink = { kind: 'pair'; token: string } | { kind: 'approve'; request: string }

export interface ShareLink {
  route: PublishedRoute
  url: string
}

export type GrantKind = 'device' | 'pc' | 'handoff'

export interface PairLink {
  token: string
  kind: GrantKind
  expires: number
  links: ShareLink[]
}
