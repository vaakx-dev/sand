import type { Wire } from '../contract'
import { listen } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Store } from './store'

export const trackSeen = (ctx: Context, wire: Wire, store: Store) => {
  const mark = () => {
    const thread = store.currentThread()
    if (!thread || document.visibilityState !== 'visible' || wire.state() !== 'open') return
    const at = thread.info.updated
    if (at <= (thread.info.seen ?? thread.info.created)) return
    thread.info = { ...thread.info, seen: at }
    void wire.call({ type: 'session.seen', session: thread.id, at }).catch(() => {})
  }
  ctx.on('thread.select', mark)
  ctx.on('thread.change', id => {
    if (id === store.current) mark()
  })
  ctx.effect(() => listen(document, 'visibilitychange', mark))
}
