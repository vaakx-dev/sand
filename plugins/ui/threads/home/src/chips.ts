import type { Pulse } from '@sand/reactive'
import { duration } from '@sand/util'
import type { ChipItem, ChipScope, ChipSource, Shell } from '@sand/ui-shell/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { visibleThreads } from './items/items'
import { inScope, openThread } from './owners'

export interface ChipParts {
  ctx: Context
  shell: Shell
  threads: Threads
  pulse: Pulse
  now(): number
}

const startOf = (thread: Thread) => thread.started ?? (thread.jobs.size ? Math.min(...thread.jobs.values()) : undefined)

const titleOf = (thread: Thread) => thread.info.title || 'Untitled thread'

const scoped = ({ ctx, threads, pulse }: ChipParts, scope: ChipScope) => {
  pulse.version.get()
  return visibleThreads(threads.list()).filter(thread => inScope(ctx, scope, thread.id))
}

const item = (parts: ChipParts, thread: Thread, rest: Omit<ChipItem, 'id' | 'label' | 'open'>): ChipItem => ({
  id: thread.id,
  label: titleOf(thread),
  open: () => openThread(parts.ctx, parts.shell, thread.id),
  ...rest,
})

const working = (parts: ChipParts): ChipSource => ({
  key: 'working',
  label: 'running',
  title: 'Running',
  order: 30,
  status: 'running',
  items: scope =>
    scoped(parts, scope)
      .filter(thread => thread.running && !thread.waiting)
      .map(thread => item(parts, thread, { status: 'running', meta: () => duration(Math.max(0, parts.now() - (startOf(thread) ?? parts.now()))) })),
})

export const chipSources = (parts: ChipParts) => [working(parts)]
