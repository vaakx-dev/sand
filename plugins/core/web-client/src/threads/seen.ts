import type { Thread, Wire } from '../contract'
import { listen } from '@sand/dom'
import type { Context } from 'drydock'
import type { Store } from './store'

export const trackSeen = (ctx: Context, wire: Wire, store: Store) => {
  const mark = () => {
    const thread: Thread | undefined = store.current ? store.threads.get(store.current) : undefined
    if (!thread || document.visibilityState !== 'visible') return
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
  return mark
}
