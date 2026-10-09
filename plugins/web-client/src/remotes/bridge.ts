import type { RelayEvent, Wire } from '@sand/protocol'
import type { Context } from 'drydock'
import type { createProjects } from '../data/projects'
import { isRelayEvent, relayEvents } from '../relay/events'
import { applyEvent } from '../threads/events'
import type { createThreads } from '../threads/service'
import type { Store } from '../threads/store'
import type { LinkHandlers } from './links'
import { dropRemote, greetRemote } from './sessions'

export const bridgeRemotes = (
  ctx: Context,
  store: Store,
  wire: Wire,
  threads: ReturnType<typeof createThreads>,
  projects: ReturnType<typeof createProjects>,
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
    hello(device, hello) {
      greetRemote(store, device, hello)
      void projects.refresh(device)
      const current = threads.current()
      const reload = threads.list().filter(thread => thread.device === device && (thread.running || thread.id === current?.id))
      for (const thread of reload) void threads.load(thread.id)
    },
    event(device, event) {
      applyEvent(store, event, id => void threads.load(id), device)
      projects.event(device, event)
      if (isRelayEvent(event)) relay(device)(event)
    },
    drop(device) {
      dropRemote(store, device)
      projects.forget(device)
      relays.delete(device)
    },
    state: () => ctx.emit('machines.change'),
  }
}
