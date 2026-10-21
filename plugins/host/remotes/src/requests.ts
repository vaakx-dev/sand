import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { pcsList, pcsRemove, remotesAdd, remotesInvite, remotesList, remotesRemove, type PcList } from './contract'
import type { Checks } from './link/check'
import type { RemotesService } from './service'

const fresh = 30_000

export const remoteRequests = (hub: Hub, remotes: RemotesService, checks: Checks, pcs: () => PcList): (() => Dispose)[] => [
  () => hub.handle(remotesList, () => remotes.list()),
  () =>
    hub.handle(remotesAdd, async ({ link }) => {
      const added = await remotes.add(link)
      void checks.one(added.id)
      return added
    }),
  () => hub.handle(remotesRemove, ({ remote }) => remotes.remove(remote)),
  () => hub.handle(remotesInvite, ({ remote }) => remotes.invite(remote)),
  () =>
    hub.handle(pcsList, () => {
      if (checks.stale(fresh)) void checks.round()
      return pcs()
    }),
  () =>
    hub.handle(pcsRemove, async ({ pc }) => {
      await remotes.remove(pc)
      return pcs()
    }),
]
