import type { ProjectEntry, ProjectGroup } from '@sand/protocol'
import { thisDevice } from '../remotes/route'

export const entryKey = (path: string, device?: string) => `${device ?? thisDevice}\0${path}`

const build = (id: string, link: string | undefined, entries: ProjectEntry[]): ProjectGroup => {
  const [latest, ...rest] = [...entries].sort((a, b) => b.updated - a.updated)
  const locations = latest ? [latest, ...rest] : []
  return {
    id,
    name: latest?.name ?? '',
    link,
    hidden: locations.every(location => location.hidden),
    threads: locations.reduce((total, location) => total + location.threads, 0),
    updated: latest?.updated ?? 0,
    locations,
  }
}

export const groupEntries = (entries: ProjectEntry[]): ProjectGroup[] => {
  const linked = new Map<string, ProjectEntry[]>()
  const groups: ProjectGroup[] = []
  for (const entry of entries) {
    if (!entry.link) {
      groups.push(build(entryKey(entry.path, entry.device), undefined, [entry]))
      continue
    }
    const members = linked.get(entry.link) ?? []
    members.push(entry)
    linked.set(entry.link, members)
  }
  for (const [link, members] of linked) groups.push(build(link, link, members))
  return groups.sort((a, b) => b.updated - a.updated)
}
