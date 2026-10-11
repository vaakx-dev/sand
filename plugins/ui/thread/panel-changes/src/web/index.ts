import { copyWithNotice, effect, shownPanel, sig, untrack } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import type { Changes } from '../changes/collect'
import { collectTree } from '../changes/tree'
import { matchFile } from '../changes/lines'
import { familyLoader } from './family'
import { remoteFiles } from './remote'
import { familyKey, familyOf, sourceOf } from './sources'
import { keepUnchanged } from './unchanged'
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
    let hiddenFiles: string[] = []
    const completeFamily = familyLoader(ctx)

    const toggle = (id: string) => {
      const next = { ...closed.get(), [id]: !closed.get()[id] }
      ctx.hot.data.closed = next
      closed.set(next)
    }

    const copy = (text: string, what: string) => copyWithNotice(ctx.notify, text, what)

    const showBadge = () => {
      const thread = ctx.threads.current()
      const open = control.shown()
      const local = open ? (changes.get()?.files ?? []).map(file => file.key) : hiddenFiles
      const stored = thread && !open && turn.get() === undefined ? remote.of(thread.id) : undefined
      const count = stored ? new Set([...stored, ...local]).size : local.length
      if (count === badge) return
      badge = count
      control.update({ badge: count || undefined })
    }

    const remote = remoteFiles(ctx, showBadge)
    ctx.effect(() => remote.stop)

    const collectShown = (thread: Thread) => changes.set(keepUnchanged(changes.get(), collectTree(sourceOf(ctx, thread), { turn: turn.get() })))

    const paint = () => {
      const thread = ctx.threads.current()
      empty.set(thread ? 'No edits yet.' : 'No thread selected.')
      const family = thread ? familyOf(ctx, thread) : []
      const members = familyKey(family)
      const open = control.shown()
      if (thread && open) completeFamily(thread, family)
      else if (thread) remote.want(thread, members)
      const next = thread ? `${members}|${turn.get()}|${open}` : ''
      if (next !== key) {
        key = next
        if (!thread) changes.set(undefined)
        else if (open) collectShown(thread)
        else hiddenFiles = collectTree(sourceOf(ctx, thread), { turn: turn.get(), diffs: false }).files.map(file => file.key)
      }
      showBadge()
    }

    const reveal = (path: string) => {
      const thread = ctx.threads.current()
      if (thread) collectShown(thread)
      const file = matchFile(changes.get()?.files ?? [], path)
      if (!file) return
      if (closed.get()[file.key]) toggle(file.key)
      revealed.set({ key: file.key })
    }

    const control = shownPanel(
      ctx,
      { id: 'changes', title: 'Edits', icon: 'compare', order: 10 },
      body => changesView({ changes, empty, turn, closed, revealed, copy, scroller: body }, toggle),
      paint,
    )

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
