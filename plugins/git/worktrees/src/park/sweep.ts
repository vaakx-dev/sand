import { errorMessage } from '@sand/util'
import { existsSync } from 'node:fs'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { dropKeptHead } from '../remove/kept-head'
import { dayMs, tidyWorktree } from './tidy'

const firstMs = 60_000
const everyMs = 60 * 60_000

const forget = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  if (existsSync(record.main)) await dropKeptHead(deps.git, record)
  await deps.store.delete(record.path)
}

const sweepRecord = async (deps: WorktreeDeps, record: WorktreeRecord, now: number) => {
  if (!record.removed) return tidyWorktree(deps, record, now)
  if (now - record.removed >= deps.keepDays.removed * dayMs) await forget(deps, record)
}

const sweepAll = async (deps: WorktreeDeps) => {
  await deps.store.ready()
  const now = Date.now()
  for (const record of deps.store.all()) {
    await sweepRecord(deps, record, now).catch(error => deps.report(new Error(`Couldn't clean up the worktree at ${record.path}: ${errorMessage(error)}`)))
  }
}

export const startSweep = (deps: WorktreeDeps, hold: () => () => void) => {
  let sweeping = false
  const run = async () => {
    if (sweeping) return
    sweeping = true
    const release = hold()
    try {
      await sweepAll(deps)
    } finally {
      sweeping = false
      release()
    }
  }
  const tick = () => void run().catch(deps.report)
  const first = setTimeout(tick, firstMs)
  const timer = setInterval(tick, everyMs)
  return () => {
    clearTimeout(first)
    clearInterval(timer)
  }
}
