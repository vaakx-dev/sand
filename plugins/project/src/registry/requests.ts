import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { helloProjects, projectsInspect, projectsList, type ProjectList } from '../contract'
import type { Registry } from './registry'

interface ProjectRequests {
  hub: Hub
  registry: Registry
  list: () => ProjectList
}

export const projectRequests = ({ hub, registry, list }: ProjectRequests): (() => Dispose)[] => [
  () => hub.handle(projectsList, () => list()),
  () => hub.greet(helloProjects, () => list()),
  () => hub.handle(projectsInspect, ({ path }) => registry.inspect(path)),
]
