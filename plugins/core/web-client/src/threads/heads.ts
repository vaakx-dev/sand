import type { Context } from 'drydock'
import type { Store } from './store'

export const followHeads = (ctx: Context, store: Store, load: (id: string) => unknown) =>
  ctx.on('thread.change', id => {
    const thread = id === store.current ? store.threads.get(id) : undefined
    const head = thread?.info.head
    if (thread?.loaded && head && !thread.entries.has(head)) void load(id)
  })
