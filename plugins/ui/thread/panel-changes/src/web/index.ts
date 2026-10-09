import { asPanel, attach, effect, sig, untrack } from '@sand/dom'
import { definePlugin } from 'drydock'
import type { Changes } from '../changes/collect'
import { collectTree } from '../changes/tree'
import { matchFile } from '../changes/lines'
import { familyKey, familyOf, sourceOf } from './sources'
import { changesView, type Reveal } from './view'

export default definePlugin({
  name: 'panel-changes',
  description: 'Edits: files the agent edited or wrote in the current thread, with per-file diffs and +/− counts',
  inject: ['threads'],
  uses: { panels: 'draws its own plain panel', commands: 'no /changes command' },
  apply(ctx) {
    const closed = sig((ctx.hot.data.closed ??= {}) as Record<string, boolean>)
    const changes = sig<Changes | undefined>(undefined)
    const empty = sig('')
    const turn = sig<number | undefined>(undefined)
    const revealed = sig<Reveal | undefined>(undefined)
    let key: string | undefined
    let badge = 0

    const toggle = (id: string) => {
      const next = { ...closed.get(), [id]: !closed.get()[id] }
      ctx.hot.data.closed = next
      closed.set(next)
    }

    const paint = () => {
      const thread = ctx.threads.current()
      empty.set(thread ? 'No edits yet.' : 'No thread selected.')
      const family = thread ? familyOf(ctx, thread) : []
      for (const member of family) if (!member.loaded && !member.failed) void ctx.threads.load(member.id)
      const next = thread ? `${familyKey(family)}|${turn.get()}` : ''
      if (next === key) return
      key = next
      changes.set(thread ? collectTree(sourceOf(ctx, thread), turn.get()) : undefined)
      const files = changes.get()?.files.length ?? 0
      if (files !== badge) control.update({ badge: (badge = files) || undefined })
    }

    const reveal = (path: string) => {
      const file = matchFile(changes.get()?.files ?? [], path)
      if (!file) return
      if (closed.get()[file.key]) toggle(file.key)
      revealed.set({ key: file.key })
    }

    const control = asPanel(ctx, {
      id: 'changes',
      title: 'Edits',
      icon: 'compare',
      order: 10,
      render: body => attach(body, () => changesView({ changes, empty, turn, closed, revealed }, toggle)),
    })

    ctx.on('thread.change', id => {
      const current = ctx.threads.current()
      if (current && familyOf(ctx, current).some(member => member.id === id)) paint()
    })
    ctx.on('threads.change', paint)
    ctx.on('thread.select', () => {
      turn.set(undefined)
      paint()
    })
    ctx.effect(() =>
      effect(() => {
        turn.get()
        untrack(paint)
      }),
    )
    ctx.watch('commands', commands =>
      commands?.add({
        name: 'changes',
        description: 'Show the files the agent edited in this thread',
        args: '[path]',
        run(args) {
          ctx.panels?.show('changes')
          const path = args.trim()
          if (path) reveal(path)
        },
      }),
    )
  },
})
