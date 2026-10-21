import type { Project, ProjectCopy, ProjectList } from '@sand/project/contract'
import { liveProjects } from '@sand/project/projects'
import { isInside } from '@sand/util'
import type { ProjectEntry, ProjectGroup, Thread } from '../contract'

export type Lists = Map<string, ProjectList>

export const entryKey = (path: string, device: string) => `${device}\0${path}`

const chatTimes = (threads: Iterable<Thread>) => {
  const times = new Map<string, number>()
  for (const { info, device } of threads) if (info.project) times.set(entryKey(info.project, device), info.updated)
  return times
}

export const copyEntry = (lists: Lists, project: Project, device: string, copy: ProjectCopy, times?: Map<string, number>): ProjectEntry => {
  const missing = lists.get(device)?.missing.includes(project.id)
  return {
    project: project.id,
    name: project.name,
    path: copy.path,
    device,
    added: copy.added,
    ...(missing ? { missing } : {}),
    updated: times?.get(entryKey(project.id, device)) || copy.added,
  }
}

const groupOf = (lists: Lists, project: Project, times: Map<string, number>): ProjectGroup => {
  const locations = Object.entries(project.copies)
    .map(([id, copy]) => copyEntry(lists, project, id, copy, times))
    .sort((a, b) => b.updated - a.updated)
  return {
    id: project.id,
    name: project.name,
    ...(project.remote ? { remote: project.remote } : {}),
    ...(project.icon ? { icon: project.icon } : {}),
    ...(project.iconFile ? { iconFile: project.iconFile } : {}),
    hidden: Boolean(project.hidden),
    updated: locations[0]?.updated ?? 0,
    locations,
  }
}

export const buildGroups = (lists: Lists, threads: Iterable<Thread>): ProjectGroup[] => {
  const times = chatTimes(threads)
  return liveProjects([...lists.values()])
    .map(project => groupOf(lists, project, times))
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
