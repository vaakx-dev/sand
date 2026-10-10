import { mergeProjects, serial } from '@sand/kit'
import { readProjectsFile, writeProjectsFile } from '@sand/kit/fs'
import type { Project } from './contract'
import { migrateProjects } from './migrate'

export const projectStore = async (home: string, device: string) => {
  const saved = await readProjectsFile(home)
  let projects = mergeProjects(saved ?? (await migrateProjects(home, device)), [])
  const queue = serial()
  const save = (next: Project[]) => {
    projects = next
    return queue(() => writeProjectsFile(home, projects))
  }
  if (!saved) await save(projects)
  return {
    all: () => projects,
    get: (id: string) => projects.find(project => project.id === id),
    save,
    put: (project: Project) => save(mergeProjects(projects.filter(other => other.id !== project.id), [project])),
  }
}

export type ProjectStore = Awaited<ReturnType<typeof projectStore>>
