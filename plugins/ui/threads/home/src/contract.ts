import { pcHello } from '@sand/devices-contract'
import type { ShellRow } from '@sand/ui-shell/contract'
import { threadChange, type Thread, type Threads } from '@sand/web-client/contract'
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

export interface FactsSpec<K, T> {
  key(source: K): string
  device(source: K): string
  touched(thread: Thread): string | undefined
  load(source: K): Promise<T>
}

export const threadFacts = <K, T>(ctx: Context, threads: Threads, { key, device, touched, load }: FactsSpec<K, T>) => {
  const facts = sig<ReadonlyMap<string, T>>(new Map())
  const asked = new Map<string, K>()
  const running = new Map<string, boolean>()
  const fetch = (source: K) => {
    const at = key(source)
    asked.set(at, source)
    const keep = (value: T | undefined) =>
      facts.update(current => {
        const next = new Map(current)
        if (value === undefined) next.delete(at)
        else next.set(at, value)
        return next
      })
    void load(source).then(keep, () => keep(undefined))
  }
  const askedFor = (thread: Thread) => {
    const at = touched(thread)
    return at === undefined ? undefined : asked.get(at)
  }
  ctx.on(threadChange, id => {
    const thread = threads.get(id)
    if (!thread) return
    const ended = running.get(id) && !thread.running
    running.set(id, thread.running)
    const source = askedFor(thread)
    if (ended && source) fetch(source)
  })
  ctx.on(pcHello, pc => {
    for (const source of asked.values()) if (device(source) === pc) fetch(source)
  })
  return {
    get(source: K) {
      if (!asked.has(key(source))) untrack(() => fetch(source))
      return facts.get().get(key(source))
    },
    reload: () => {
      for (const source of asked.values()) fetch(source)
    },
  }
}

const folderKey = ({ cwd, device }: Omit<RowThread, 'id'>) => `${device}\0${cwd}`

export const folderFacts = <T>(ctx: Context, threads: Threads, load: (folder: RowThread) => Promise<T>) =>
  threadFacts(ctx, threads, {
    key: folderKey,
    device: folder => folder.device,
    touched: thread => folderKey({ cwd: thread.info.cwd, device: thread.device }),
    load,
  })
