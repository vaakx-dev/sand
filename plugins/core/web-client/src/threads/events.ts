import type { WireEvent } from '@sand/protocol'
import type { WireSession } from '@sand/sessions-sqlite/contract'
import { applyLive } from './live'
import type { Store } from './store'

export const applyEvent = (store: Store, event: WireEvent, load: (id: string) => void, device?: string) => {
  switch (event.name) {
    case 'session.meta':
      return store.meta(event.args[0])
    case 'queue.change':
      return store.queue(...event.args)
    case 'context.change':
      return store.context(...event.args)
    case 'session.remove':
      return store.remove(event.args[0].$session.id)
  }
  const thread = ({ $session }: WireSession) => store.upsert($session, device)
  const changed = (id: string, list = true) => store.changed(id, list)
  switch (event.name) {
    case 'session.update':
      return changed(thread(event.args[0]).id)
    case 'session.entry': {
      const [session, entry] = event.args
      const found = thread(session)
      found.entries.set(entry.id, entry)
      found.info = { ...found.info, head: entry.id, updated: Math.max(found.info.updated, entry.at) }
      if (entry.type === 'message') found.live = []
      if (!found.loaded) load(found.id)
      return changed(found.id)
    }
    case 'turn.start': {
      const found = thread(event.args[0])
      found.running = true
      found.started ??= Date.now()
      found.ended = undefined
      store.started(found.id)
      return changed(found.id)
    }
    case 'turn.end': {
      const found = thread(event.args[0])
      found.running = false
      found.started = undefined
      found.queued = []
      found.live = []
      found.tools = { running: new Set(), results: new Map() }
      found.step = undefined
      found.ended = event.args[1]
      return changed(found.id)
    }
    case 'turn.steer': {
      const found = thread(event.args[0])
      found.queued = found.queued.filter(steer => steer.id !== event.args[2])
      return changed(found.id)
    }
    case 'llm.event': {
      const found = thread(event.args[1])
      applyLive(found, event.args[0])
      return changed(found.id, false)
    }
    case 'tool.start': {
      const found = thread(event.args[1])
      found.tools.running.add(event.args[0].id)
      found.step = event.args[0]
      return changed(found.id, false)
    }
    case 'tool.result': {
      const [result, call, session] = event.args
      const found = thread(session)
      found.tools.running.delete(call.id)
      found.tools.results.set(call.id, result)
      return changed(found.id, false)
    }
    case 'agent.start':
    case 'agent.end':
    case 'artifact.saved':
      return changed(thread(event.args[0]).id)
  }
}
