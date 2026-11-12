import { helloDelta, helloSessions, helloSync } from '@sand/server/contract'
import { helloJobs } from '@sand/jobs/contract'
import { helloTurns, type TurnInfo } from '@sand/turns-contract/contract'
import type { Thread } from '../contract'
import type { HelloRead } from '../greeted'
import { clearTurn } from './live'
import type { Store } from './store'

export const stale = (thread: Thread) => {
  if (thread.info.head && thread.entries.has(thread.info.head)) thread.cursor = thread.info.head
  thread.loaded = false
}

type Running = Partial<Pick<TurnInfo, 'started' | 'waiting'>>

const runningOf = (read: HelloRead): Map<string, Running> => new Map(Object.entries(read(helloTurns) ?? {}))

export const applyHello = (store: Store, read: HelloRead, device: string) => {
  const sessions = read(helloSessions) ?? []
  const owned = () => [...store.threads.values()].filter(thread => thread.device === device)
  for (const thread of owned()) stale(thread)
  if (!read(helloDelta)) {
    const known = new Set(sessions.map(info => info.id))
    for (const thread of owned()) if (!known.has(thread.id)) store.remove(thread.id)
  }
  for (const info of sessions) store.upsert(info, device)
  const running = runningOf(read)
  const jobs = Map.groupBy((read(helloJobs) ?? []).filter(job => job.status === 'running'), job => job.parent)
  for (const thread of owned()) {
    thread.jobs = new Map(jobs.get(thread.id)?.map(job => [job.id, job.started]))
    const turn = running.get(thread.id)
    thread.turn = turn !== undefined
    if (!turn) clearTurn(thread)
    else {
      thread.started ??= turn.started
      thread.waiting = turn.waiting
    }
    store.changed(thread.id)
  }
  const sync = read(helloSync)
  if (sync) store.synced.set(device, sync)
  else store.synced.delete(device)
}
