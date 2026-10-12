import type { NotifyAction } from '@sand/toasts/contract'
import type { WireEvent } from '@sand/protocol'
import { isRecord } from '@sand/kit'
import type { Context } from 'drydock'
import { noticeType } from '../../names'
import { onAlertOpen, pageVisible, showAlert } from '../integrations/alerts'
import type { Access } from './access'

interface Arrived {
  session: string
  title: string
  entry: string
  text: string
}

const arrivedOf = (event: WireEvent): Arrived | undefined => {
  if (event.name !== 'session.entry') return undefined
  const [{ $session }, entry] = event.args
  if (entry.type !== noticeType || !isRecord(entry.data) || typeof entry.data.text !== 'string') return undefined
  return { session: $session.id, title: $session.title ?? 'sand', entry: entry.id, text: entry.data.text }
}

export const alertNotices = (ctx: Context<'threads'>, access: Access) => {
  const open = (session: string) => void ctx.threads.select(session)

  const actionFor = (notice: Arrived, elsewhere: boolean): NotifyAction | undefined => {
    if (elsewhere) return { label: 'Open', run: () => open(notice.session) }
    return access.state.get() === 'default' ? { label: 'Alert me when away', run: access.ask } : undefined
  }

  const toast = (notice: Arrived) => {
    const elsewhere = ctx.threads.current()?.id !== notice.session
    ctx.notify?.push(elsewhere ? `${notice.title}: ${notice.text}` : notice.text, { action: actionFor(notice, elsewhere) })
  }

  const arrive = (event: WireEvent) => {
    const notice = arrivedOf(event)
    if (!notice) return
    if (pageVisible() || access.state.get() !== 'granted') return toast(notice)
    const alert = { title: notice.title, body: notice.text, tag: notice.entry, session: notice.session, url: ctx.threads.link(notice.session) }
    void showAlert(alert).catch(() => toast(notice))
  }

  ctx.on('wire.event', arrive)
  ctx.on('machines.event', (_device, event) => arrive(event))
  ctx.effect(() => onAlertOpen(open))
}
