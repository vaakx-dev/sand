import type { ProjectList } from '@sand/host-projects/contract'
import { eachSettled, findProject, liveProjects } from '@sand/kit'
import type { Pc } from './contract'
import type { Connections } from './connections'

export const createProjectLookup = (connections: Connections) => {
  const projects = (pc: Pc) => connections.call<ProjectList>({ type: 'projects.list' }, pc.id)

  return {
    projects,
    async project(ref: string) {
      const online = (await connections.list()).filter(pc => pc.online)
      const { values } = await eachSettled(online, projects)
      return findProject(liveProjects(values), ref)
    },
  }
}
