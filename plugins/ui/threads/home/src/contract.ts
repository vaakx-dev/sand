import type { ProjectLook } from '@sand/project/contract'
import { pcHello } from '@sand/devices-contract'
import { folderName } from '@sand/util'
import { projects, threadChange, type Threads } from '@sand/web-client/contract'
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
}

export const threadRows = service<ThreadRows>('threadRows')

export interface ProjectInfo {
  name: string
  key: string
  icon?: ProjectLook
  quick?: boolean
}

export type ProjectLookup = (cwd: string, device: string, project?: string | null) => ProjectInfo

export const quickName = 'Quick thread'

export const quick = (device: string): ProjectInfo => ({ name: quickName, key: `${device}\0quick`, icon: { quick: true }, quick: true })

export const findGroup = (ctx: Context, cwd: string, device: string, project?: string | null) =>
  (project && ctx.get(projects)?.get(project)) || ctx.get(projects)?.group(cwd, device)

export const projectLookup =
  (ctx: Context): ProjectLookup =>
  (cwd, device, project) => {
    if (!cwd) return quick(device)
    const group = findGroup(ctx, cwd, device, project)
    if (group) return { name: group.name || folderName(cwd), key: group.id, icon: ctx.get(projects)?.groupIcon(group) }
    return { name: folderName(cwd), key: `${device}\0${cwd}`, icon: ctx.get(projects)?.icon(cwd, device) }
  }

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
