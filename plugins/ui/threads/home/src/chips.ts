import type { Pulse } from '@sand/reactive'
import { duration } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import type { ChipItem, ChipScope, ChipSource, Shell } from '@sand/ui-shell/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { mergeTrouble, type Changes } from './changes'
import { attempt } from './items/failure'
import { visibleThreads } from './items/items'
import { inScope, openThread } from './owners'

export interface ChipParts {
  ctx: Context
  kit: Kit
  shell: Shell
  threads: Threads
  pulse: Pulse
  now(): number
  changes: Changes
}

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

const waiting = (parts: ChipParts): ChipSource => ({
  key: 'waiting',
  label: 'Waiting',
  title: 'Waiting for you',
  order: 10,
  status: 'waiting',
  items: scope =>
    scoped(parts, scope).flatMap(thread => {
      const note = thread.waiting?.title ?? mergeTrouble(parts.changes.get(thread.id))
      return note ? [item(parts, thread, { status: 'waiting', meta: note })] : []
    }),
})

const ready = (parts: ChipParts): ChipSource => ({
  key: 'ready',
  label: 'Ready',
  title: 'Ready to merge',
  order: 20,
  status: 'ready',
  items: scope =>
    scoped(parts, scope).flatMap(thread => {
      const change = parts.changes.get(thread.id)
      if (thread.running || (change?.state !== 'ready' && change?.state !== 'merging')) return []
      const merging = change.state === 'merging'
      return [
        item(parts, thread, {
          status: change.state,
          meta: parts.kit.lineStat(change.add, change.del),
          action: {
            label: merging ? 'Merging' : 'Merge',
            busy: () => merging,
            run: () => attempt(parts.ctx, "Couldn't merge", () => parts.changes.merge(thread)),
          },
        }),
      ]
    }),
})

const working = (parts: ChipParts): ChipSource => ({
  key: 'working',
  label: 'Working',
  title: 'Working',
  order: 30,
  status: 'running',
  items: scope =>
    scoped(parts, scope)
      .filter(thread => thread.running && !thread.waiting)
      .map(thread => item(parts, thread, { status: 'running', meta: () => duration(Math.max(0, parts.now() - (thread.started ?? parts.now()))) })),
})

export const chipSources = (parts: ChipParts) => [waiting(parts), ready(parts), working(parts)]
