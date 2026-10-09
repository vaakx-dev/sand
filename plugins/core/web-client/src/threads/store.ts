import type { ContextUsage } from '@sand/compaction/contract'
import type { Entry } from '@sand/messages'
import type { SettingsState } from '@sand/model/contract'
import type { SessionInfo, SessionMetaUpdate, SessionSummary } from '@sand/sessions-sqlite/contract'
import type { QueueState } from '@sand/steering/contract'
import type { DraftTarget, Thread } from '../contract'
import type { Context } from 'drydock'
import { nextFrame } from './frame'

const blank = (info: SessionSummary): Thread => ({
  id: info.id,
  info,
  entries: new Map(),
  loaded: false,
  running: false,
  unread: false,
  live: [],
  tools: { running: new Set(), results: new Map() },
  queued: [],
  followUps: [],
  version: 0,
})

export const walk = (entries: Map<string, Entry>, head: string | null) => {
  const path: Entry[] = []
  const seen = new Set<string>()
  for (let entry = head ? entries.get(head) : undefined; entry && !seen.has(entry.id); entry = entries.get(entry.parent ?? '')) {
    seen.add(entry.id)
    path.push(entry)
  }
  return path.reverse()
}

export class Store {
  readonly threads = new Map<string, Thread>()
  current: string | undefined
  draft: DraftTarget | undefined
  idle = false
  readonly settings = new Map<string, SettingsState>()
  private starts = new Map<string, (() => void)[]>()
  private dirty = new Set<string>()
  private listed = false
  private frame: (() => void) | undefined

  constructor(private ctx: Context) {}

  device() {
    return this.current ? this.threads.get(this.current)?.device : this.draft?.device
  }

  upsert(info: SessionInfo & Partial<SessionSummary>, device?: string) {
    const existing = this.threads.get(info.id)
    if (existing) {
      const differs = Object.entries(info).some(([key, value]) => existing.info[key as keyof SessionSummary] !== value)
      if (!differs) return existing
      existing.info = { ...existing.info, ...info }
      this.changed(info.id, true)
      return existing
    }
    const thread = blank({ updated: info.created, messages: 0, named: false, ...info })
    if (device) thread.device = device
    this.threads.set(info.id, thread)
    this.changed(info.id, true)
    return thread
  }

  queue(id: string, { steers, followUps }: QueueState) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.queued = steers
    thread.followUps = followUps
    this.changed(id)
  }

  context(id: string, usage: ContextUsage | undefined) {
    const thread = this.threads.get(id)
    if (!thread || !usage) return
    thread.context = usage
    this.changed(id)
  }

  whenStarted(id: string) {
    return new Promise<void>(resolve => this.starts.set(id, [...(this.starts.get(id) ?? []), resolve]))
  }

  started(id: string) {
    for (const resolve of this.starts.get(id) ?? []) resolve()
    this.starts.delete(id)
  }

  meta({ id, ...meta }: SessionMetaUpdate) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.info = { ...thread.info, ...meta }
    this.changed(id, true)
  }

  remove(id: string) {
    this.threads.delete(id)
    this.dirty.delete(id)
    this.changed(undefined, true)
  }

  changed(id?: string, list = false) {
    const thread = id ? this.threads.get(id) : undefined
    if (thread) {
      thread.unread = thread.id !== this.current && thread.info.updated > (thread.info.seen ?? thread.info.created)
      thread.version++
      this.dirty.add(thread.id)
    }
    this.listed ||= list
    this.frame ??= nextFrame(() => this.flush())
  }

  dispose() {
    this.frame?.()
  }

  private flush() {
    this.frame = undefined
    const ids = [...this.dirty]
    const listed = this.listed
    this.dirty.clear()
    this.listed = false
    for (const id of ids) this.ctx.emit('thread.change', id)
    if (listed) this.ctx.emit('threads.change')
  }
}
