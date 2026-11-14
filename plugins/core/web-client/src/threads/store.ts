import type { ContextUsage } from '@sand/compaction/contract'
import type { SettingsState } from '@sand/model/contract'
import type { SessionInfo, SessionSummary } from '@sand/chats/contract'
import type { PendingItem } from '@sand/turns-contract/contract'
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
    info.archived,
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
  turn: false,
  jobs: new Map(),
  live: [],
  tools: { running: new Set(), results: new Map(), logs: new Map() },
  pending: [],
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
  known = false
  private keys = new WeakMap<Thread, string>()
  private children = new Map<string, Set<string>>()
  private frame: (() => void) | undefined

  constructor(
    private ctx: Context,
    private home: string,
  ) {}

  readonly watched = new Map<string, number>()

  currentThread() {
    return this.current ? this.threads.get(this.current) : undefined
  }

  open(id: string) {
    return id === this.current || this.watched.has(id)
  }

  watchedOn(device: string) {
    return [...this.watched.keys()].filter(id => this.deviceOf(id) === device)
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
    if (info.parent) this.children.set(info.parent, (this.children.get(info.parent) ?? new Set()).add(info.id))
    this.changed(info.id, true)
    return thread
  }

  know() {
    if (this.known) return
    this.known = true
    this.changed(undefined, true)
  }

  pending(id: string, items: PendingItem[]) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.pending = items
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
    const thread = this.threads.get(id)
    if (!thread || !this.threads.delete(id)) return
    if (thread.info.parent) this.children.get(thread.info.parent)?.delete(id)
    this.dirty.delete(id)
    for (const watcher of this.watchers) watcher.removed(id)
    this.changed(undefined, true)
  }

  changed(id?: string, list = false) {
    const thread = id ? this.threads.get(id) : undefined
    if (thread) {
      const was = thread.running
      thread.running = thread.turn || thread.jobs.size > 0 || this.runningChild(thread.id)
      thread.version++
      this.dirty.add(thread.id)
      for (const watcher of this.watchers) watcher.changed(thread.id)
      if (thread.running !== was && thread.info.parent) this.changed(thread.info.parent)
    }
    this.listed ||= list
    this.frame ??= nextFrame(() => this.flush())
  }

  dispose() {
    this.frame?.()
  }

  private runningChild(id: string) {
    for (const child of this.children.get(id) ?? []) if (this.threads.get(child)?.running) return true
    return false
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
