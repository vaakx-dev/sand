import { isInside } from '@sand/util'
import type { Project, ProjectFolder, ProjectIconFile, ProjectPatch } from '../contract'
import { mergeProjects, remoteKey } from '../projects'
import { gitRemote } from './folder/git'
import { inspectFolder } from './folder/inspect'
import { localCopy, projectAt, removedCopyAt } from './list'
import { existingFolder } from './paths'
import type { ProjectStore } from './store'

const nextStamp = (previous: number) => Math.max(Date.now(), previous + 1)

export const createRegistry = (store: ProjectStore, device: string, changed: () => void, pull: () => Promise<void>) => {
  const commit = async (project: Project) => {
    await store.put(project)
    changed()
    return store.get(project.id) ?? project
  }
  const copyAt = (path: string) => projectAt(store.all(), device, path)
  const known = (id: string) => {
    const project = store.get(id)
    if (!project || project.deleted) throw new Error('Unknown project')
    return project
  }
  const fetched = async (id: string) => {
    if (!store.get(id)) await pull()
    return known(id)
  }
  const sameRemote = (remote: string | undefined, except?: string) => {
    const key = remote ? remoteKey(remote) : ''
    if (!key) return []
    const matches = (project: Project) => !project.deleted && project.id !== except && !!project.remote && remoteKey(project.remote) === key
    return store.all().filter(matches).map(project => project.id)
  }

  const refreshRemote = async (project: Project, remote: string | undefined) => {
    if (!remote || remoteKey(remote) === remoteKey(project.remote ?? '')) return project
    return commit({ ...project, remote, updated: nextStamp(project.updated) })
  }
  const refresh = async () => {
    for (const listed of store.all()) {
      const copy = localCopy(listed, device)
      if (!copy) continue
      const remote = await gitRemote(copy.path)
      const project = store.get(listed.id)
      if (project && !project.deleted) await refreshRemote(project, remote)
    }
  }

  const inspect = async (path: string): Promise<ProjectFolder> => {
    const full = await existingFolder(path)
    const facts = await inspectFolder(full)
    const current = copyAt(full)
    if (current) await refreshRemote(current, facts.remote)
    const project = current?.id
    const holds = (id: string) => {
      const copy = localCopy(known(id), device)
      return Boolean(copy && isInside(full, copy.path))
    }
    const matches = sameRemote(facts.remote, project).filter(id => !holds(id))
    const restores = project ? undefined : removedCopyAt(store.all(), device, full)?.id
    return { ...facts, path: full, ...(project ? { project } : {}), ...(restores ? { restores } : {}), matches }
  }

  const add = async (path: string, id?: string): Promise<Project> => {
    const full = await existingFolder(path)
    if (id) await fetched(id)
    const facts = await inspectFolder(full)
    const now = Date.now()
    const current = copyAt(full)
    if (current && id && current.id !== id) throw new Error(`${full} is already a copy of ${current.name}`)
    if (current) return refreshRemote(current, facts.remote)
    const target = id ?? removedCopyAt(store.all(), device, full)?.id
    if (!target) {
      const copy = { path: full, added: now, updated: now }
      const remote = facts.remote ? { remote: facts.remote } : {}
      return commit({ id: Bun.randomUUIDv7(), name: facts.name, ...remote, copies: { [device]: copy }, updated: now })
    }
    const project = known(target)
    const previous = project.copies[device]
    const copy = { path: full, added: now, updated: nextStamp(previous?.updated ?? 0) }
    const remote = !project.remote && facts.remote ? { remote: facts.remote, updated: nextStamp(project.updated) } : {}
    return commit({ ...project, ...remote, copies: { ...project.copies, [device]: copy } })
  }

  const update = (id: string, patch: ProjectPatch) => {
    const project = known(id)
    const next: Project = { ...project, updated: nextStamp(project.updated) }
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) throw new Error('Give a name')
      next.name = name
    }
    if (patch.hidden !== undefined) next.hidden = patch.hidden
    if (patch.icon) next.icon = patch.icon
    if (patch.icon === null) delete next.icon
    return commit(next)
  }

  const setIconFile = (id: string, iconFile: ProjectIconFile) => {
    const project = known(id)
    return commit({ ...project, iconFile, updated: nextStamp(project.updated) })
  }

  const remove = async (id: string, from?: string) => {
    const project = store.get(id)
    if (!project || project.deleted) return
    if (!from) {
      await commit({ ...project, deleted: true, updated: nextStamp(project.updated) })
      return
    }
    const copy = project.copies[from]
    if (!copy || copy.removed) return
    await commit({ ...project, copies: { ...project.copies, [from]: { ...copy, removed: true, updated: nextStamp(copy.updated) } } })
  }

  const merge = async (incoming: Project[]) => {
    const next = mergeProjects(store.all(), incoming)
    if (JSON.stringify(next) === JSON.stringify(store.all())) return false
    await store.save(next)
    changed()
    return true
  }

  return { all: () => store.all(), inspect, add, update, setIconFile, remove, merge, refresh }
}

export type Registry = ReturnType<typeof createRegistry>
