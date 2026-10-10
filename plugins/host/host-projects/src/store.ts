import { mergeProjects, serial } from '@sand/kit'
import { readProjectsFile, writeProjectsFile } from '@sand/kit/fs'
import type { Project } from './contract'
import { migrateProjects } from './migrate'

const load = async (home: string, device: string) => {
  const saved = await readProjectsFile(home)
  if (saved) return { projects: saved, migrated: false }
  return { projects: await migrateProjects({ home, device }), migrated: true }
}

export const projectStore = async (home: string, device: string) => {
  const { projects: loaded, migrated } = await load(home, device)
  let projects = mergeProjects(loaded, [])
  const queue = serial()
  const save = (next: Project[]) => {
    projects = next
    return queue(() => writeProjectsFile(home, projects))
  }
  if (migrated) await save(projects)
  return {
    all: () => projects,
    get: (id: string) => projects.find(project => project.id === id),
    save,
    put: (project: Project) => save(mergeProjects(projects.filter(other => other.id !== project.id), [project])),
  }
}

export type ProjectStore = Awaited<ReturnType<typeof projectStore>>
