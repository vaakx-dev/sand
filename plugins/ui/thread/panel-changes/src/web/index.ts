import { asPanel, attach, copyText, effect, sig, untrack, watchShown, type Shown } from '@sand/dom'
import { definePlugin } from 'drydock'
import type { Changes } from '../changes/collect'
import { collectTree } from '../changes/tree'
import { matchFile } from '../changes/lines'
import { familyLoader } from './family'
import { remoteFiles } from './remote'
import { familyKey, familyOf, sourceOf } from './sources'
import { changesView, type Reveal } from './view'

export default definePlugin({
  name: 'panel-changes',
  description: 'Edits: files the agent edited or wrote in the current thread, with per-file diffs and +/− counts',
  inject: ['threads'],
  uses: {
    panels: 'draws its own plain panel',
    commands: 'no /changes command',
    wire: 'the hidden Edits badge counts only the loaded part of the thread',
    notify: 'copying a file path from the file menu is not confirmed',
  },
  apply(ctx) {
    const closed = sig((ctx.hot.data.closed ??= {}) as Record<string, boolean>)
    const changes = sig<Changes | undefined>(undefined)
    const empty = sig('')
    const turn = sig<number | undefined>(undefined)
    const revealed = sig<Reveal | undefined>(undefined)
    let key: string | undefined
    let badge = 0
    const shown = new Set<Shown>()
    const visible = () => [...shown].some(watch => watch.get())
    const completeFamily = familyLoader(ctx)

    const toggle = (id: string) => {
      const next = { ...closed.get(), [id]: !closed.get()[id] }
      ctx.hot.data.closed = next
      closed.set(next)
    }

    const copy = async (text: string, what: string) => {
      const copied = await copyText(text)
      ctx.notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
    }

    const showBadge = () => {
      const thread = ctx.threads.current()
      const local = changes.get()?.files ?? []
      const stored = thread && !visible() && turn.get() === undefined ? remote.of(thread.id) : undefined
      const count = stored ? new Set([...stored, ...local.map(file => file.key)]).size : local.length
      if (count !== badge) control.update({ badge: (badge = count) || undefined })
    }

    const remote = remoteFiles(ctx, showBadge)
    ctx.effect(() => remote.stop)

    const paint = () => {
      const thread = ctx.threads.current()
      empty.set(thread ? 'No edits yet.' : 'No thread selected.')
      const family = thread ? familyOf(ctx, thread) : []
      const members = familyKey(family)
      if (thread && visible()) completeFamily(thread, family)
      else if (thread) remote.want(thread, members)
      const next = thread ? `${members}|${turn.get()}` : ''
      if (next !== key) {
        key = next
        changes.set(thread ? collectTree(sourceOf(ctx, thread), turn.get()) : undefined)
      }
      showBadge()
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
      render(body) {
        const detach = attach(body, () => changesView({ changes, empty, turn, closed, revealed, copy }, toggle))
        const watch = watchShown(body, paint)
        shown.add(watch)
        return () => {
          watch.stop()
          shown.delete(watch)
          detach()
        }
      },
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
