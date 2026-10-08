import type { PickItem, PickTone, SessionSummary } from '@sand/protocol'
import { ago, tildeHome } from '@sand/kit'
import type { SessionsContext } from '../types'
import { thread } from './tree'
import type { View } from './view'

export const listed = (ctx: SessionsContext, view: View) => {
  const folders = new Set([ctx.ui.cwd(), ctx.cli.cwd, ctx.sessions.fallbackCwd])
  return ctx.sessions
    .list()
    .filter(info => info.head && info.kind !== 'agent')
    .filter(info => view.all || folders.has(info.cwd))
    .filter(info => !view.named || info.named)
}

const tone = (session: SessionSummary, current?: string): PickTone | undefined => {
  if (session.id === current) return 'accent'
  return session.named ? 'warning' : undefined
}

const detail = (session: SessionSummary, view: View) =>
  [view.ids && session.id, view.all && tildeHome(session.cwd), String(session.messages), ago(session.updated)].filter(Boolean).join(' ')

export const pickItems = (sessions: SessionSummary[], view: View, current?: string): PickItem<string>[] => {
  const rows = view.sort === 'threaded' ? thread(sessions) : sessions.map(session => ({ session, prefix: '' }))
  return rows.map(({ session, prefix }) => ({
    label: session.title ?? '(untitled)',
    detail: detail(session, view),
    prefix,
    search: `${session.id} ${session.cwd}`,
    tone: tone(session, current),
    value: session.id,
  }))
}
