import type { Project, ProjectCopy, ProjectList } from '@sand/host-projects/contract'
import type { ProjectEntry, ProjectGroup, Thread } from '../contract'
import { isInside, liveProjects } from '@sand/kit'

export type Lists = Map<string, ProjectList>

interface Stat {
  threads: number
  updated: number
}

export const entryKey = (path: string, device: string) => `${device}\0${path}`

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

export const copyEntry = (lists: Lists, project: Project, device: string, copy: ProjectCopy, stats?: Map<string, Stat>): ProjectEntry => {
  const stat = stats?.get(entryKey(project.id, device))
  const missing = lists.get(device)?.missing.includes(project.id)
  return {
    project: project.id,
    name: project.name,
    path: copy.path,
    device,
    added: copy.added,
    ...(missing ? { missing } : {}),
    threads: stat?.threads ?? 0,
    updated: stat?.updated || copy.added,
  }
}

const groupOf = (lists: Lists, project: Project, stats: Map<string, Stat>): ProjectGroup => {
  const locations = Object.entries(project.copies)
    .map(([id, copy]) => copyEntry(lists, project, id, copy, stats))
    .sort((a, b) => b.updated - a.updated)
  return {
    id: project.id,
    name: project.name,
    ...(project.remote ? { remote: project.remote } : {}),
    ...(project.icon ? { icon: project.icon } : {}),
    hidden: Boolean(project.hidden),
    threads: locations.reduce((total, location) => total + location.threads, 0),
    updated: locations[0]?.updated ?? 0,
    locations,
  }
}

export const buildGroups = (lists: Lists, threads: Iterable<Thread>): ProjectGroup[] => {
  const stats = threadStats(threads)
  return liveProjects([...lists.values()])
    .map(project => groupOf(lists, project, stats))
    .sort((a, b) => b.updated - a.updated)
}

const fsRoot = /^([a-z]:)?[\\/]$/i

const holds = (folder: string, path: string, home: string) =>
  folder === path || (folder !== home && !fsRoot.test(folder) && isInside(path, folder))

export const groupAt = (groups: ProjectGroup[], path: string, device: string, home: string) => {
  let best: { group: ProjectGroup; length: number } | undefined
  for (const group of groups)
    for (const location of group.locations) {
      if (location.device !== device) continue
      if (!holds(location.path, path, home)) continue
      if (!best || location.path.length > best.length) best = { group, length: location.path.length }
    }
  return best?.group
}
