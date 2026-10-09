import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { ProjectList } from './contract'
import { fullPath } from './list'
import { cloneFolder, createFolder } from './make'
import type { Registry } from './registry'
import type { ProjectRoot } from './root'

export interface ProjectRequests {
  hub: Hub
  registry: Registry
  root: ProjectRoot
  list: () => ProjectList
  placeChanged: () => void
}

export const projectRequests = ({ hub, registry, root, list, placeChanged }: ProjectRequests): (() => Dispose)[] => [
  () => hub.handle('projects.list', () => list()),
  () => hub.handle('projects.inspect', ({ path }) => registry.inspect(path)),
  () => hub.handle('projects.add', ({ path, project }) => registry.add(path, project)),
  () => hub.handle('projects.update', ({ project, patch }) => registry.update(project, patch)),
  () => hub.handle('projects.remove', ({ project, device }) => registry.remove(project, device)),
  () =>
    hub.handle('projects.root', async ({ root: next }) => {
      await root.set(next)
      placeChanged()
      return list()
    }),
  () => hub.handle('projects.create', async ({ name }) => registry.add(await createFolder(root.get(), name))),
  () =>
    hub.handle('projects.clone', async ({ url, into, job, project }) => {
      if (project) registry.known(project)
      const progress = (text: string) => {
        if (job) hub.broadcast({ name: 'projects.progress', args: [{ job, text }] })
      }
      return registry.add(await cloneFolder(url, fullPath(into), progress), project)
    }),
]
