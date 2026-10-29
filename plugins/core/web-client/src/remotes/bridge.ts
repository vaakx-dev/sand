import type { Context } from 'drydock'
import { machinesChange } from '../contract'
import type { DeviceModels } from '../data/models'
import type { ProjectService } from '../data/projects'
import { applyHello } from '../threads/hello'
import type { ThreadService } from '../threads/service'
import type { Store } from '../threads/store'
import { type HelloRead, type Hellos, readField } from '../wire/hellos'
import type { Listeners } from '../wire/listeners'
import type { LinkHandlers } from './links'

interface Bridged {
  threads: ThreadService
  projects: ProjectService
  models: DeviceModels
  listeners: Listeners
  hellos: Hellos
}

export const bridgeRemotes = (ctx: Context, store: Store, { threads, projects, models, listeners, hellos }: Bridged): LinkHandlers => {
  const forget = (device: string) => {
    for (const thread of [...store.threads.values()]) if (thread.device === device) store.remove(thread.id)
    store.synced.delete(device)
    hellos.drop(device)
    projects.forget(device)
    models.forget(device)
  }

  return {
    since: device => store.synced.get(device),
    hello(device, values) {
      hellos.set(device, values)
      const read: HelloRead = field => readField(values, field)
      applyHello(store, read, device)
      models.hello(device, read)
      void projects.refresh(device)
      threads.refocus(device)
      const current = threads.current()
      if (current?.device === device) void threads.load(current.id)
    },
    event: (device, heard) => listeners.dispatch(heard, device, true),
    drop: forget,
    keep(devices) {
      for (const device of store.devices()) if (device !== store.here() && !devices.has(device)) forget(device)
    },
    state: () => ctx.emit(machinesChange),
  }
}
