import type { Hub } from '@sand/host-hub/contract'
import type { PcList } from './contract'
import type { Dispose } from 'drydock'
import type { Checks } from './link/check'
import type { RemotesService } from './service'

const fresh = 30_000

const text = (value: unknown) => {
  if (typeof value !== 'string' || !value) throw new Error('pc must be a PC id')
  return value
}

export const remoteRequests = (hub: Hub, remotes: RemotesService, checks: Checks, pcs: () => PcList): (() => Dispose)[] => [
  () => hub.handle('remotes.list', () => remotes.list()),
  () =>
    hub.handle('remotes.add', async ({ link }) => {
      const added = await remotes.add(link)
      void checks.one(added.id)
      return added
    }),
  () => hub.handle('remotes.remove', ({ remote }) => remotes.remove(text(remote))),
  () => hub.handle('remotes.invite', ({ remote }) => remotes.invite(remote)),
  () =>
    hub.handle('pcs.list', () => {
      if (checks.stale(fresh)) void checks.round()
      return pcs()
    }),
  () => hub.handle('pcs.remove', async ({ pc }) => {
    await remotes.remove(text(pc))
    return pcs()
  }),
]
