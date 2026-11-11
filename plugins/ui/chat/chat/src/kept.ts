import { collectScope, disposeAll, div, list, mount, onIdle, onMount, scoped, sig, untrack, type Disposer } from '@vaakx-dev/vrui'
import type { ChatView } from './controller'

interface Kept {
  id: string
  chat: ChatView
  scope: Disposer[]
}

const keptChats = 5

const holder = (chat: ChatView, leave: () => void) => {
  const node = div({ class: 'contents' }, chat.node)
  onMount(node, () => chat.show())
  scoped(() => {
    chat.hide()
    leave()
  })
  return node
}

export const keptViews = (build: (id: string) => ChatView) => {
  const kept = new Map<string, Kept>()
  const preparing = new Map<string, () => void>()
  const parked = sig<Kept[]>([])
  const unmount = mount(
    document.body,
    list(
      parked,
      entry => entry.id,
      entry => div({ class: 'contents' }, untrack(() => entry.get().chat.node)),
      div({ class: 'hidden' }),
    ),
  )

  const isParked = (entry: Kept) => untrack(() => parked.get()).includes(entry)
  const park = (entry: Kept) => parked.update(all => [...all, entry])
  const unpark = (entry: Kept) => parked.update(all => all.filter(other => other !== entry))

  const drop = (entry: Kept) => {
    kept.delete(entry.id)
    unpark(entry)
    disposeAll(entry.scope)
  }

  const dropOldestParked = () => {
    const oldest = [...kept.values()].find(isParked)
    if (oldest) drop(oldest)
  }

  const keep = (id: string) => {
    const { value, scope } = collectScope(() => build(id))
    const entry = { id, chat: value, scope }
    kept.set(id, entry)
    if (kept.size > keptChats) dropOldestParked()
    return entry
  }

  const reuse = (entry: Kept) => {
    kept.delete(entry.id)
    kept.set(entry.id, entry)
    unpark(entry)
    return entry
  }

  const view = (id: string) => {
    const found = kept.get(id)
    if (found && !isParked(found)) return holder(build(id), () => {})
    const entry = found ? reuse(found) : keep(id)
    return holder(entry.chat, () => park(entry))
  }

  const prepareNow = (id: string) => {
    if (kept.has(id) || kept.size >= keptChats) return
    const entry = keep(id)
    park(entry)
    entry.chat.prepare()
  }

  const prepare = (id: string) => {
    if (kept.has(id) || preparing.has(id)) return
    const stop = collectScope(() =>
      onIdle(() => {
        preparing.delete(id)
        prepareNow(id)
      }),
    ).value
    preparing.set(id, stop)
  }

  const clear = () => {
    for (const stop of preparing.values()) stop()
    preparing.clear()
    for (const entry of [...kept.values()]) drop(entry)
    unmount()
  }

  return { view, prepare, clear }
}
