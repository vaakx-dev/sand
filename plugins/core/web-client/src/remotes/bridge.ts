import type { RelayEvent } from '@sand/server/contract'
import type { Wire } from '../contract'
import type { Context } from 'drydock'
import type { createJobs } from '../data/jobs'
import type { createProjects } from '../data/projects'
import { isRelayEvent, relayEvents } from '../relay/events'
import { applyEvent } from '../threads/events'
import { applyHello } from '../threads/hello'
import type { createThreads } from '../threads/service'
import type { Store } from '../threads/store'
import type { LinkHandlers } from './links'
import { devicesOf, dropRemote } from './sessions'

export const bridgeRemotes = (
  ctx: Context,
  store: Store,
  wire: Wire,
  threads: ReturnType<typeof createThreads>,
  projects: ReturnType<typeof createProjects>,
  jobs: ReturnType<typeof createJobs>,
): LinkHandlers => {
  const relays = new Map<string, (event: RelayEvent) => void>()
  const relay = (device: string) => {
    const known = relays.get(device)
    if (known) return known
    const created = relayEvents(ctx, request => wire.call(request, device), threads, opened => threads.adopt(opened, device), device)
    relays.set(device, created)
    return created
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
      if (isRelayEvent(event)) relay(device)(event)
      ctx.emit('machines.event', device, event)
    },
    drop(device) {
      dropRemote(store, device)
      projects.forget(device)
      jobs.forget(device)
      relays.delete(device)
    },
    keep(devices) {
      for (const device of devicesOf(store)) {
        if (devices.has(device)) continue
        dropRemote(store, device)
        projects.forget(device)
      }
    },
    state: () => ctx.emit('machines.change'),
  }
}
