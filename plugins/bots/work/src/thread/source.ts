import { promptContent, userParts, type Entry } from '@sand/chats/contract'
import type { Row, Rows, Settled, Surface } from '@sand/transcript/contract'
import { threadChange, threadsChange, type Thread } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { WorkContext } from '../context'

type Pending = Thread['pending'][number]

export type SourceState = 'loading' | 'failed' | 'empty' | 'rows'

const captions = {
  queued: 'Queued for the next turn',
  held: 'Held — the turn stopped before this was sent',
}

const keyOf = (thread: Thread): unknown[] => [
  thread,
  thread.entries,
  thread.entries.size,
  thread.info.head,
  thread.tools,
  [...thread.tools.running].join('\n'),
  thread.tools.results.size,
]

const sameKey = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((value, index) => value === b[index])

const captionOf = ({ kind, held }: Pending) => {
  if (held) return captions.held
  return kind === 'queue' ? captions.queued : undefined
}

export const threadSource = (ctx: WorkContext, id: string) => {
  const { threads, transcriptParts: parts } = ctx
  const version = sig(0)
  const bump = () => version.update(value => value + 1)
  let cached: { key: unknown[]; settled: Settled } | undefined

  const read = <T>(pick: (thread: Thread | undefined) => T) =>
    derive(() => {
      version.get()
      return pick(threads.get(id))
    })

  const settledOf = (thread: Thread) => {
    const key = [...keyOf(thread), parts.version.get()]
    if (!cached || !sameKey(cached.key, key)) cached = { key, settled: parts.settled(thread, threads.path(id)) }
    return cached.settled
  }

  const pendingRows = (thread: Thread, rows: Rows, pending: Pending): Row[] => {
    const entry: Entry = { id: pending.id, session: id, parent: null, at: pending.at, type: 'message', data: null, seq: 0 }
    const caption = captionOf(pending)
    const remove = {
      id: 'remove',
      label: 'Remove',
      icon: 'x',
      group: 'remove',
      danger: true,
      run: () => ctx.turns.withdraw(thread.id, pending.id).catch(error => ctx.report(error)),
    }
    const note = caption ? () => ctx.kit.metaLine(caption) : undefined
    return parts
      .prompt(entry, userParts({ role: 'user', content: promptContent(pending.prompt) }))
      .flatMap(item => (item.kind === 'user' ? [rows.user({ ...item, key: `${pending.id}:${pending.kind}:${pending.held}` }, () => [remove], note)] : rows.item(item)))
  }

  const rowsOf = (surface: Omit<Surface, 'conversation' | 'cwd'>) =>
    derive((): Row[] => {
      version.get()
      const thread = threads.get(id)
      if (!thread || (!thread.loaded && !thread.entries.size)) return []
      const rows = parts.rows({ ...surface, conversation: id, cwd: thread.info.cwd })
      const said = parts.items(settledOf(thread), thread).flatMap(item => rows.item(item))
      return [...said, ...thread.pending.flatMap(pending => pendingRows(thread, rows, pending))]
    })

  const state = read((thread): SourceState => {
    if (!thread || (!thread.loaded && !thread.entries.size)) return thread?.failed ? 'failed' : 'loading'
    return thread.entries.size || thread.live.length || thread.pending.length ? 'rows' : 'empty'
  })

  const listen = () => {
    const stops = [
      ctx.on(threadChange, changed => {
        if (changed === id) bump()
      }),
      ctx.on(threadsChange, bump),
      threads.watch(id),
    ]
    bump()
    return () => {
      for (const stop of stops) void stop()
    }
  }

  return {
    id,
    read,
    rowsOf,
    state,
    title: read(thread => thread?.info.title.trim() || 'Thread'),
    running: read(thread => Boolean(thread?.running)),
    failure: read(thread => thread?.failed),
    older: () => threads.older(id),
    page: () => threads.page(id),
    retry: () => void threads.load(id),
    listen,
  }
}

export type ThreadSource = ReturnType<typeof threadSource>
