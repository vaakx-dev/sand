import type { Entry } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import { forkAt, forkedNote, labelData, moveOf, movedNote } from '../tree/moves'

export type TreeContext = Context<'ui' | 'sessions'>

export const jump = (ctx: TreeContext, session: Session, entry: Entry) => {
  if (entry.id === session.head) return ctx.ui.notify('Already at this point')
  const move = moveOf(entry)
  session.checkout(move.at)
  ctx.ui.open(session, move.draft)
  ctx.ui.notify(movedNote(move))
}

export const fork = async (ctx: TreeContext, session: Session, entry: Entry) => {
  const move = moveOf(entry)
  const forked = await forkAt(
    {
      head: session.head,
      path: () => session.path(),
      checkout: at => session.checkout(at),
      branch: at => ctx.sessions.branch(session, undefined, at),
    },
    move.at,
  )
  ctx.ui.open(forked, move.draft)
  ctx.ui.notify(forkedNote)
}

export const label = async (ctx: TreeContext, session: Session, entry: Entry, current?: string) => {
  const text = await ctx.ui.input('Label (empty to remove)', current ?? '')
  if (text === undefined) return false
  session.append('label', labelData(entry.id, text))
  return true
}
