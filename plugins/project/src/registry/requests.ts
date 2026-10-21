import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { projectsAdd, projectsCreate, projectsInspect, projectsList, projectsRemove, projectsRoot, projectsUpdate, type ProjectList } from '../contract'
import { createFolder } from './folder/create'
import type { Registry } from './registry'
import type { ProjectRoot } from './root'

interface ProjectRequests {
  hub: Hub
  registry: Registry
  root: ProjectRoot
  list: () => ProjectList
  placeChanged: () => void
}

export const projectRequests = ({ hub, registry, root, list, placeChanged }: ProjectRequests): (() => Dispose)[] => [
  () => hub.handle(projectsList, () => list()),
  () => hub.handle(projectsInspect, ({ path }) => registry.inspect(path)),
  () => hub.handle(projectsAdd, ({ path, project }) => registry.add(path, project)),
  () => hub.handle(projectsUpdate, ({ project, patch }) => registry.update(project, patch)),
  () => hub.handle(projectsRemove, ({ project, device }) => registry.remove(project, device)),
  () =>
    hub.handle(projectsRoot, async ({ root: next }) => {
      await root.set(next)
      placeChanged()
      return list()
    }),
  () => hub.handle(projectsCreate, async ({ name }) => registry.add(await createFolder(root.get(), name))),
]
