import type {} from '@sand/composer-card/contract'
import { copyWithNotice, shownPanel } from '@sand/kit/web'
import type {} from '@sand/markdown/contract'
import type { Thread } from '@sand/web-client/contract'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import type { Changes, FileChange } from '../changes/collect'
import { collectTree } from '../changes/tree'
import { matchFile } from '../changes/lines'
import { familyLoader } from './family'
import { viewedFiles, type ViewedMarks } from './files/viewed'
import { remoteFiles } from './remote'
import { familyKey, familyOf, sourceOf } from './sources'
import { keepUnchanged } from './unchanged'
import { changesView, type Highlighter, type Reveal } from './view'

export default definePlugin({
  name: 'panel-changes',
  description: 'Edits: files the agent edited or wrote in the current thread, with per-file diffs and +/− counts',
  inject: ['threads', 'kit'],
  uses: {
    panels: 'draws its own plain panel',
    commands: 'no /changes command',
    wire: 'the hidden Edits badge counts only the loaded part of the thread',
    notify: 'copying a file path from the file menu is not confirmed',
    markdown: 'diffs show without syntax colours',
    composer: 'Quote in reply copies the selected lines instead',
  },
  apply(ctx) {
    const closed = sig((ctx.hot.data.closed ??= {}) as Record<string, boolean>)
    const changes = sig<Changes | undefined>(undefined)
    const empty = sig('')
    const turn = sig<number | undefined>(undefined)
    const revealed = sig<Reveal | undefined>(undefined)
    const highlight = sig<Highlighter | undefined>(undefined)
    let quoteInReply: ((text: string) => void) | undefined
    let key: string | undefined
    let badge = 0
    let hiddenFiles: string[] = []
    const completeFamily = familyLoader(ctx)

    const viewed = viewedFiles(
      (ctx.hot.data.viewed ??= {}) as ViewedMarks,
      marks => (ctx.hot.data.viewed = marks),
      () => ctx.threads.current()?.id,
    )

    const setClosed = (fileKey: string, value?: boolean) => {
      const { [fileKey]: _, ...rest } = closed.get()
      const next = value === undefined ? rest : { ...rest, [fileKey]: value }
      ctx.hot.data.closed = next
      closed.set(next)
    }

    const isClosed = (file: FileChange) => closed.get()[file.key] ?? viewed.has(file)

    const toggle = (file: FileChange) => setClosed(file.key, !isClosed(file))

    const markViewed = (file: FileChange) => {
      setClosed(file.key)
      viewed.toggle(file)
      revealed.set({ key: file.key })
    }

    const revealFile = (file: FileChange) => {
      if (isClosed(file)) toggle(file)
      revealed.set({ key: file.key })
    }

    const copy = (text: string, what: string) => copyWithNotice(ctx.notify, text, what)

    const quote = (text: string) => (quoteInReply ? quoteInReply(text) : copy(text, 'lines'))

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
      empty.set(thread ? 'No edits yet' : 'No thread selected')
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
      if (file) revealFile(file)
    }

    const control = shownPanel(
      ctx,
      { id: 'changes', title: 'Edits', icon: 'compare', order: 10 },
      () => changesView(ctx.kit, { changes, empty, turn, revealed, viewed, highlight, isClosed, toggle, markViewed, reveal: revealFile, quote, copy }),
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
    ctx.watch('markdown', markdown => {
      highlight.set(markdown?.highlight)
      return () => highlight.set(undefined)
    })
    ctx.watch('composer', composer => {
      quoteInReply = composer && (text => composer.quote(text))
    })
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
