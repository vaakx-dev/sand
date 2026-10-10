import type { Models, Wire } from '../contract'
import type { Context } from 'drydock'
import type { JobService } from '../data/jobs'
import type { ProjectService } from '../data/projects'
import { isRelayEvent, relayEvents } from '../relay/events'
import { applyEvent } from '../threads/events'
import { applyHello } from '../threads/hello'
import type { ThreadService } from '../threads/service'
import type { Store } from '../threads/store'
import type { LinkHandlers } from './links'

interface Bridged {
  wire: Wire
  threads: ThreadService
  projects: ProjectService
  jobs: JobService
  models: Models
}

export const bridgeRemotes = (ctx: Context, store: Store, { wire, threads, projects, jobs, models }: Bridged): LinkHandlers => {
  const forget = (device: string) => {
    for (const thread of [...store.threads.values()]) if (thread.device === device) store.remove(thread.id)
    store.synced.delete(device)
    projects.forget(device)
  }

  return {
    since: device => store.synced.get(device),
    hello(device, hello) {
      applyHello(store, hello, device)
      void projects.refresh(device)
      jobs.hello(device, hello)
      const current = threads.current()
      if (current?.device === device) void threads.load(current.id)
    },
    event(device, event) {
      applyEvent(store, event, id => void threads.load(id), device)
      projects.event(device, event)
      jobs.event(device, event)
      if (isRelayEvent(event)) relayEvents(ctx, wire, threads, models, device)(event)
      ctx.emit('machines.event', device, event)
    },
    drop(device) {
      forget(device)
      jobs.forget(device)
    },
    keep(devices) {
      for (const device of store.devices()) if (!devices.has(device)) forget(device)
    },
    state: () => ctx.emit('machines.change'),
  }
}
