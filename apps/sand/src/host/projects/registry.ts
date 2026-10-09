import { isInside, mergeProjects, remoteKey } from '@sand/kit'
import { samePath } from '@sand/host'
import type { Project, ProjectFolder, ProjectPatch } from '@sand/protocol'
import { inspectFolder } from './folder/inspect'
import { existingFolder, localCopy, nextStamp } from './list'
import type { ProjectStore } from './store'

export const createRegistry = (store: ProjectStore, device: string, changed: () => void) => {
  const commit = async (project: Project) => {
    await store.put(project)
    changed()
    return store.get(project.id) ?? project
  }
  const copyAt = (path: string) =>
    store.all().find(project => {
      const copy = localCopy(project, device)
      return copy !== undefined && samePath(copy.path, path)
    })
  const known = (id: string) => {
    const project = store.get(id)
    if (!project || project.deleted) throw new Error('Unknown project')
    return project
  }
  const sameRemote = (remote: string | undefined, except?: string) => {
    const key = remote ? remoteKey(remote) : ''
    if (!key) return []
    const live = store.all().filter(project => !project.deleted && project.id !== except && project.remote)
    return live.filter(project => remoteKey(project.remote ?? '') === key).map(project => project.id)
  }

  const inspect = async (path: string): Promise<ProjectFolder> => {
    const full = await existingFolder(path)
    const facts = await inspectFolder(full)
    const project = copyAt(full)?.id
    const holds = (id: string) => {
      const copy = localCopy(known(id), device)
      return Boolean(copy && isInside(full, copy.path))
    }
    const matches = sameRemote(facts.remote, project).filter(id => !holds(id))
    return { ...facts, path: full, ...(project ? { project } : {}), matches }
  }

  const add = async (path: string, id?: string): Promise<Project> => {
    const full = await existingFolder(path)
    if (id) known(id)
    const facts = await inspectFolder(full)
    const now = Date.now()
    const current = copyAt(full)
    if (!id) {
      if (current) return current
      const copy = { path: full, added: now, updated: now }
      const remote = facts.remote ? { remote: facts.remote } : {}
      return commit({ id: Bun.randomUUIDv7(), name: facts.name, ...remote, copies: { [device]: copy }, updated: now })
    }
    if (current && current.id !== id) throw new Error(`${full} is already a copy of ${current.name}`)
    if (current) return current
    const project = known(id)
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
    return commit(next)
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

  return { all: () => store.all(), inspect, add, update, remove, merge, known }
}

export type Registry = ReturnType<typeof createRegistry>
