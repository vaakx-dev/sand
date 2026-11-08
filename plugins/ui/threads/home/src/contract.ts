import { threadChange, type Threads } from '@sand/web-client/contract'
import { sig, untrack, type Child } from '@vaakx-dev/vrui'
import { service, type Context, type Dispose } from 'drydock'

/** The thread a row shows, as much as a part needs to look up its own facts. */
export interface RowThread {
  id: string
  cwd: string
  device: string
}

/**
 * Something a feature adds to the right of a thread row's second line, such as its branch or pull requests.
 * `render` runs in the row's scope each time the row redraws; read signals for anything that changes.
 * Return nothing when the thread has nothing to show. Parts sort by `order`.
 */
export interface RowPart {
  id: string
  order?: number
  render(thread: RowThread): Child
}

/** Thread rows in the sidebar and the phone home list. Provided by threads home, so absent with threads off. */
export interface ThreadRows {
  part(part: RowPart): Dispose
}

export const threadRows = service<ThreadRows>('threadRows')

const keyOf = ({ cwd, device }: RowThread) => `${device}\0${cwd}`

/**
 * Facts about a thread's folder that a row part shows, such as its branch. A folder is loaded the first time a
 * row asks for it, again when a turn in it ends, and on `reload`. A load that fails shows as nothing.
 */
export const folderFacts = <T>(ctx: Context, threads: Threads, load: (folder: RowThread) => Promise<T>) => {
  const facts = sig<ReadonlyMap<string, T>>(new Map())
  const asked = new Map<string, RowThread>()
  const running = new Map<string, boolean>()
  const fetch = (folder: RowThread) => {
    const key = keyOf(folder)
    asked.set(key, folder)
    const keep = (value: T | undefined) =>
      facts.update(current => {
        const next = new Map(current)
        if (value === undefined) next.delete(key)
        else next.set(key, value)
        return next
      })
    void load(folder).then(keep, () => keep(undefined))
  }
  ctx.on(threadChange, id => {
    const thread = threads.get(id)
    if (!thread) return
    const ended = running.get(id) && !thread.running
    running.set(id, thread.running)
    const folder = { id, cwd: thread.info.cwd, device: thread.device }
    if (ended && asked.has(keyOf(folder))) fetch(folder)
  })
  return {
    get(folder: RowThread) {
      if (!asked.has(keyOf(folder))) untrack(() => fetch(folder))
      return facts.get().get(keyOf(folder))
    },
    reload: () => {
      for (const folder of asked.values()) fetch(folder)
    },
  }
}
