import { sessionEntryWire, sessionRemoveWire, sessionUpdateWire, type WireSession } from '@sand/chats/contract'
import { contextChange } from '@sand/compaction/contract'
import { artifactSavedWire } from '@sand/html/contract'
import { toolProgressWire, toolResultWire, toolStartWire, turnEndWire, turnStartWire } from '@sand/loop/contract'
import { liveSnapshot, llmEventWire } from '@sand/server/contract'
import { applyLiveEvent } from '@sand/server/live'
import { queueChange, turnSteerWire } from '@sand/steering/contract'
import { joinDisposers } from '@sand/util'
import type { Wire } from '../contract'
import { addLog, catchUp, clearTurn } from './live'
import type { Store } from './store'

const everyPc = { remotes: true }

export const listenThreads = (wire: Wire, store: Store, load: (id: string) => void) => {
  const thread = ({ $session }: WireSession, device: string) => store.upsert($session, device)
  const known = (id: string) => store.threads.get(id)

  return joinDisposers(
    wire.on(queueChange, ([id, state]) => store.queue(id, state), everyPc),
    wire.on(contextChange, ([id, usage]) => store.context(id, usage), everyPc),
    wire.on(sessionUpdateWire, (session, device) => store.changed(thread(session, device).id), everyPc),
    wire.on(sessionRemoveWire, id => store.remove(id), everyPc),
    wire.on(
      sessionEntryWire,
      ([session, entry], device) => {
        const found = thread(session, device)
        const open = found.id === store.current
        if (found.loaded || open) found.entries.set(entry.id, entry)
        const updated = entry.type === 'system' ? found.info.updated : Math.max(found.info.updated, entry.at)
        found.info = { ...found.info, head: entry.id, updated }
        if (entry.type === 'message') found.live = []
        if (!found.loaded && open) load(found.id)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      turnStartWire,
      ([session], device) => {
        const found = thread(session, device)
        found.running = true
        found.started ??= Date.now()
        found.ended = undefined
        store.started(found.id)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      turnEndWire,
      ([session, result], device) => {
        const found = thread(session, device)
        found.running = false
        clearTurn(found)
        found.step = undefined
        found.ended = result
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      turnSteerWire,
      ([session, , id], device) => {
        const found = thread(session, device)
        found.queued = found.queued.filter(steer => steer.id !== id)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      liveSnapshot,
      ([id, snapshot]) => {
        const found = known(id)
        if (!found) return
        catchUp(found, snapshot)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      llmEventWire,
      ([event, session]) => {
        const found = known(session.$session.id)
        if (!found) return
        found.live = applyLiveEvent(found.live, event)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      toolStartWire,
      ([call, session]) => {
        const found = known(session.$session.id)
        if (!found) return
        found.tools.running.add(call.id)
        found.step = call
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      toolProgressWire,
      ([call, text, session]) => {
        const found = known(session.$session.id)
        if (!found) return
        addLog(found, call.id, text)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      toolResultWire,
      ([result, call, session]) => {
        const found = known(session.$session.id)
        if (!found) return
        found.tools.running.delete(call.id)
        found.tools.logs.delete(call.id)
        found.tools.results.set(call.id, result)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(artifactSavedWire, ([session], device) => store.changed(thread(session, device).id), everyPc),
  )
}
