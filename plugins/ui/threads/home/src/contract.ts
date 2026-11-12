import { pcHello } from '@sand/devices-contract'
import type { ShellRow } from '@sand/ui-shell/contract'
import { threadChange, type Threads } from '@sand/web-client/contract'
import { sig, untrack, type Child } from '@vaakx-dev/vrui'
import { service, type Context, type Dispose } from 'drydock'

export interface RowThread {
  id: string
  cwd: string
  device: string
}

export interface RowPart {
  id: string
  order?: number
  render(thread: RowThread): Child
}

export interface ThreadRows {
  part(part: RowPart): Dispose
  row(thread: string): ShellRow | undefined
}

export const threadRows = service<ThreadRows>('threadRows')

const keyOf = ({ cwd, device }: RowThread) => `${device}\0${cwd}`

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
  ctx.on(pcHello, pc => {
    for (const folder of asked.values()) if (folder.device === pc) fetch(folder)
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
