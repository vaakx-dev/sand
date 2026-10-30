import { type Pcs, pcsChange } from '@sand/devices-contract'
import type { Context } from 'drydock'
import type { DeviceModels } from '../data/models'
import type { ProjectService } from '../data/projects'
import type { Store } from '../threads/store'

interface Owned {
  projects: ProjectService
  models: DeviceModels
}

export const forgetRemovedPcs = (ctx: Context, store: Store, pcs: Pcs, { projects, models }: Owned) => {
  const forget = (pc: string) => {
    for (const thread of [...store.threads.values()]) if (thread.device === pc) store.remove(thread.id)
    store.synced.delete(pc)
    projects.forget(pc)
    models.forget(pc)
  }

  ctx.on(pcsChange, () => {
    const known = new Set(pcs.list().map(pc => pc.id))
    for (const pc of store.devices()) if (!known.has(pc)) forget(pc)
  })
}
