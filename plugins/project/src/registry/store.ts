import { serial } from '@sand/util'
import type { Project } from '../contract'
import { mergeProjects } from '../projects'
import { readProjectsFile, writeProjectsFile } from './file'

export const projectStore = async (home: string) => {
  let projects = mergeProjects(await readProjectsFile(home), [])
  const queue = serial()
  const save = (next: Project[]) => {
    projects = next
    return queue(() => writeProjectsFile(home, projects))
  }
  return {
    all: () => projects,
    get: (id: string) => projects.find(project => project.id === id),
    save,
    put: (project: Project) => save(mergeProjects(projects.filter(other => other.id !== project.id), [project])),
  }
}

export type ProjectStore = Awaited<ReturnType<typeof projectStore>>
