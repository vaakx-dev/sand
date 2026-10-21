import type { ContextUsage } from '@sand/compaction/contract'
import type { SettingsState } from '@sand/model/contract'
import type { SessionInfo, SessionSummary } from '@sand/chats/contract'
import type { QueueState } from '@sand/steering/contract'
import { type DraftTarget, type Thread, threadChange, threadsChange } from '../contract'
import type { Context } from 'drydock'
import { nextFrame } from '../detached'

const listKey = ({ info, device, running, started }: Thread) =>
  JSON.stringify([
    running ? 0 : info.updated,
    info.project,
    info.title,
    info.messages,
    info.cwd,
    info.kind,
    info.parent,
    info.seen,
    info.pinned,
    info.settled,
    info.snoozed,
    info.position,
    device,
    running,
    started,
  ])

const blank = (info: SessionSummary, device: string): Thread => ({
  id: info.id,
  device,
  info,
  entries: new Map(),
  loaded: false,
  running: false,
  live: [],
  tools: { running: new Set(), results: new Map(), logs: new Map() },
  queued: [],
  version: 0,
})

interface StoreWatcher {
  changed(id: string): void
  removed(id: string): void
}

export class Store {
  readonly threads = new Map<string, Thread>()
  private watchers = new Set<StoreWatcher>()
  current: string | undefined
  draft: DraftTarget | undefined
  readonly settings = new Map<string, SettingsState>()
  readonly synced = new Map<string, string>()
  private starts = new Map<string, (() => void)[]>()
  private dirty = new Set<string>()
  private listed = false
  private keys = new WeakMap<Thread, string>()
  private frame: (() => void) | undefined

  constructor(
    private ctx: Context,
    private home: string,
  ) {}

  currentThread() {
    return this.current ? this.threads.get(this.current) : undefined
  }

  here() {
    return this.home
  }

  device() {
    return (this.current ? this.currentThread()?.device : this.draft?.device) ?? this.here()
  }

  deviceOf(id: string) {
    return this.threads.get(id)?.device ?? this.here()
  }

  devices() {
    return new Set([...this.threads.values()].map(thread => thread.device))
  }

  upsert(info: SessionInfo & Partial<SessionSummary>, device: string) {
    const existing = this.threads.get(info.id)
    if (existing) {
      const differs = Object.entries(info).some(([key, value]) => JSON.stringify(existing.info[key as keyof SessionSummary]) !== JSON.stringify(value))
      if (!differs) return existing
      existing.info = { ...existing.info, ...info }
      this.changed(info.id)
      return existing
    }
    const thread = blank({ updated: info.created, messages: 0, ...info }, device)
    this.threads.set(info.id, thread)
    this.changed(info.id, true)
    return thread
  }

  queue(id: string, { steers }: QueueState) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.queued = steers
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

  watch(watcher: StoreWatcher) {
    this.watchers.add(watcher)
    return () => void this.watchers.delete(watcher)
  }

  remove(id: string) {
    if (!this.threads.delete(id)) return
    this.dirty.delete(id)
    for (const watcher of this.watchers) watcher.removed(id)
    this.changed(undefined, true)
  }

  changed(id?: string, list = false) {
    const thread = id ? this.threads.get(id) : undefined
    if (thread) {
      thread.version++
      this.dirty.add(thread.id)
      for (const watcher of this.watchers) watcher.changed(thread.id)
    }
    this.listed ||= list
    this.frame ??= nextFrame(() => this.flush())
  }

  dispose() {
    this.frame?.()
  }

  private relisted(id: string) {
    const thread = this.threads.get(id)
    if (!thread) return false
    const key = listKey(thread)
    const changed = this.keys.get(thread) !== key
    this.keys.set(thread, key)
    return changed
  }

  private flush() {
    this.frame = undefined
    const ids = [...this.dirty]
    const listed = ids.map(id => this.relisted(id)).includes(true) || this.listed
    this.dirty.clear()
    this.listed = false
    for (const id of ids) this.ctx.emit(threadChange, id)
    if (listed) this.ctx.emit(threadsChange)
  }
}
