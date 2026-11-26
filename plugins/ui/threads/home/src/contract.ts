import { pcHello } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { MenuAction, ShellRow } from '@sand/ui-shell/contract'
import { threadChange, type DraftTarget, type Thread, type Threads } from '@sand/web-client/contract'
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
  settleDays(): number | undefined
}

export interface Place {
  path: string
  device: string
}

export interface NewThreads {
  place(): Place
  open(): DraftTarget
}

const LISTED_KINDS = new Set<Thread['info']['kind']>(['thread', 'quick'])

export const listedThread = (thread: Thread) => LISTED_KINDS.has(thread.info.kind)

export { listGroups, settles, type ListEntry } from './groups'
export { snoozeAction, snoozedUntil, isBack } from './snooze/actions'
export { wakeTimer } from './snooze/wake'

export const threadRows = service<ThreadRows>('threadRows')
export const newThreads = service<NewThreads>('newThreads')

export const copyPathAction = (kit: Kit, path: string): MenuAction => ({ id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'folder', run: () => kit.copyText(path) })

type Folder = Omit<RowThread, 'id'>

const folderKey = ({ cwd, device }: Folder) => `${device}\0${cwd}`

export const folderFacts = <T>(ctx: Context, threads: Threads, load: (folder: Folder) => Promise<T>) => {
  const facts = sig<ReadonlyMap<string, T>>(new Map())
  const asked = new Map<string, Folder>()
  const running = new Map<string, boolean>()
  const fetch = (source: Folder) => {
    const at = folderKey(source)
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
  const askedFor = (thread: Thread) => asked.get(folderKey({ cwd: thread.info.cwd, device: thread.device }))
  ctx.on(threadChange, id => {
    const thread = threads.get(id)
    if (!thread) return
    const ended = running.get(id) && !thread.running
    running.set(id, thread.running)
    const source = askedFor(thread)
    if (ended && source) fetch(source)
  })
  ctx.on(pcHello, pc => {
    for (const source of asked.values()) if (source.device === pc) fetch(source)
  })
  return {
    get(source: Folder) {
      if (!asked.has(folderKey(source))) untrack(() => fetch(source))
      return facts.get().get(folderKey(source))
    },
    reload: () => {
      for (const source of asked.values()) fetch(source)
    },
  }
}
