import { type GrantKind, type PairLink, pairCancel, pairHandoff, pairLink, type PublishedRoute, type Registry } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { GrantOptions, Grants } from './grants'
import { shareLinks } from './links'

export interface LinkDeps {
  grants: Grants
  routes(): PublishedRoute[]
}

export const createLink =
  ({ grants, routes }: LinkDeps) =>
  (kind: GrantKind, by: string, options?: GrantOptions): PairLink => {
    const { token, expires } = grants.create(kind, by, options)
    return { token, kind, expires, links: shareLinks(routes(), 'pair', token) }
  }

export const grantRequests = (hub: Hub, registry: Registry, grants: Grants, link: ReturnType<typeof createLink>): (() => Dispose)[] => [
  () => hub.handle(pairLink, ({ kind }, caller) => link(kind, caller.device)),
  () => hub.handle(pairCancel, ({ token }) => grants.cancel(token)),
  () =>
    hub.handle(pairHandoff, (_, caller) => {
      const device = registry.get(caller.device)
      if (!device || device.removed || device.kind === 'pc') throw new Error('Only a paired phone or browser can hand itself off')
      return link('handoff', device.id, { device: device.id })
    }),
]
