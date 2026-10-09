import type { Project, ProjectCopy, ProjectEntry, ProjectGroup, ProjectList, Thread } from '@sand/protocol'
import { isInside, mergeProjects } from '@sand/kit'
import { thisDevice } from '../remotes/route'

export type Lists = Map<string, ProjectList>

interface Stat {
  threads: number
  updated: number
}

export const entryKey = (path: string, device?: string) => `${device || thisDevice}\0${path}`

export const sameDevice = (a?: string, b?: string) => (a || thisDevice) === (b || thisDevice)

const homeId = (lists: Lists) => lists.get(thisDevice)?.device

export const realDevice = (lists: Lists, device?: string) => (device ? device : homeId(lists))

const webDevice = (lists: Lists, id: string) => (id === homeId(lists) ? undefined : id)

export const registry = (lists: Lists) =>
  [...lists.values()].reduce<Project[]>((all, list) => mergeProjects(all, list.projects), []).filter(project => !project.deleted)

const threadStats = (threads: Iterable<Thread>) => {
  const stats = new Map<string, Stat>()
  for (const thread of threads) {
    const { project, kind, updated } = thread.info
    if (!project || kind === 'agent') continue
    const key = entryKey(project, thread.device)
    const stat = stats.get(key) ?? { threads: 0, updated: 0 }
    stat.threads++
    stat.updated = Math.max(stat.updated, updated)
    stats.set(key, stat)
  }
  return stats
}

export const copyEntry = (lists: Lists, project: Project, id: string, copy: ProjectCopy, stats?: Map<string, Stat>): ProjectEntry => {
  const device = webDevice(lists, id)
  const stat = stats?.get(entryKey(project.id, device))
  const missing = lists.get(device ?? thisDevice)?.missing.includes(project.id)
  return {
    project: project.id,
    name: project.name,
    path: copy.path,
    ...(device ? { device } : {}),
    added: copy.added,
    ...(missing ? { missing } : {}),
    threads: stat?.threads ?? 0,
    updated: stat?.updated || copy.added,
  }
}

const groupOf = (lists: Lists, project: Project, stats: Map<string, Stat>): ProjectGroup => {
  const locations = Object.entries(project.copies)
    .filter(([, copy]) => !copy.removed)
    .map(([id, copy]) => copyEntry(lists, project, id, copy, stats))
    .sort((a, b) => b.updated - a.updated)
  return {
    id: project.id,
    name: project.name,
    ...(project.remote ? { remote: project.remote } : {}),
    hidden: Boolean(project.hidden),
    threads: locations.reduce((total, location) => total + location.threads, 0),
    updated: locations[0]?.updated ?? 0,
    locations,
  }
}

export const buildGroups = (lists: Lists, threads: Iterable<Thread>): ProjectGroup[] => {
  const stats = threadStats(threads)
  return registry(lists)
    .map(project => groupOf(lists, project, stats))
    .sort((a, b) => b.updated - a.updated)
}

const fsRoot = /^([a-z]:)?[\\/]$/i

const holds = (folder: string, path: string, home: string) =>
  folder === path || (folder !== home && !fsRoot.test(folder) && isInside(path, folder))

export const groupAt = (groups: ProjectGroup[], path: string, device: string | undefined, home: string) => {
  let best: { group: ProjectGroup; length: number } | undefined
  for (const group of groups)
    for (const location of group.locations) {
      if (!sameDevice(location.device, device)) continue
      if (!holds(location.path, path, home)) continue
      if (!best || location.path.length > best.length) best = { group, length: location.path.length }
    }
  return best?.group
}
