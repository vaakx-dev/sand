import { sessionEntryWire, sessionRemoveWire, sessionUpdateWire, type WireSession } from '@sand/chats/contract'
import { contextChange } from '@sand/compaction/contract'
import { artifactSavedWire } from '@sand/html/contract'
import { applyLiveEvent, type EntryHead, liveSnapshot, llmEventWire, type Mark, sessionHeadWire, uiFocus } from '@sand/server/contract'
import {
  toolProgressWire,
  toolResultWire,
  toolStartWire,
  turnChangeWire,
  turnEndWire,
  turnPendingWire,
  turnStartWire,
} from '@sand/turns-contract/contract'
import type { Wire, WireListen } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import type { Thread } from '../contract'
import { stale } from './hello'
import { listenLegacy } from './legacy'
import { addLog, catchUp, clearTurn } from './live'
import type { Store } from './store'

const everyPc: WireListen = { from: 'all' }

const advance = (thread: Thread, entry: EntryHead) => {
  const updated = entry.type === 'system' ? thread.info.updated : Math.max(thread.info.updated, entry.at)
  thread.info = { ...thread.info, head: entry.id, updated }
  if (entry.type === 'message') thread.live = []
}

const follows = (last: Mark | undefined, mark: Mark) => (last?.turn === mark.turn ? mark.n === last.n + 1 : mark.n === 1)

const stop = (thread: Thread) => {
  thread.running = false
  clearTurn(thread)
  thread.step = undefined
}

export const listenThreads = (wire: Wire, store: Store, load: (id: string) => void) => {
  const thread = ({ $session }: WireSession, device: string) => store.upsert($session, device)
  const known = (id: string) => store.threads.get(id)
  const resyncing = new Set<string>()

  const resync = ({ id, device }: Thread) => {
    if (id !== store.current || resyncing.has(id)) return
    resyncing.add(id)
    void wire
      .call(uiFocus, { session: id }, device)
      .catch(() => {})
      .finally(() => resyncing.delete(id))
  }

  return joinDisposers(
    listenLegacy(wire, store),
    wire.on(turnPendingWire, ([id, pending]) => store.pending(id, pending), everyPc),
    wire.on(contextChange, ([id, usage]) => store.context(id, usage), everyPc),
    wire.on(sessionUpdateWire, (session, device) => store.changed(thread(session, device).id), everyPc),
    wire.on(sessionRemoveWire, id => store.remove(id), everyPc),
    wire.on(
      sessionEntryWire,
      ([session, entry], device) => {
        const found = thread(session, device)
        const open = found.id === store.current
        if (found.loaded || open) found.entries.set(entry.id, entry)
        advance(found, entry)
        if (!found.loaded && open) load(found.id)
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      sessionHeadWire,
      ([session, entry], device) => {
        const found = thread(session, device)
        stale(found)
        advance(found, entry)
        if (found.id === store.current) load(found.id)
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
        stop(found)
        found.ended = result
        store.changed(found.id)
      },
      everyPc,
    ),
    wire.on(
      turnChangeWire,
      ([session, info]) => {
        const found = known(session.$session.id)
        if (!found) return
        if (info.ended) stop(found)
        else {
          found.running = true
          found.started = info.started
          found.waiting = info.waiting
        }
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
      ([event, session, mark]) => {
        const found = known(session.$session.id)
        if (!found) return
        if (mark && !follows(found.mark, mark)) return resync(found)
        found.mark = mark
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
