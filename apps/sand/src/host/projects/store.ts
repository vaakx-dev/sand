import { mergeProjects } from '@sand/kit'
import type { Project } from '@sand/protocol'
import { readProjectsFile, writeProjectsFile } from '@sand/host'
import { migrateProjects } from './migrate'

const load = async (home: string, device: string) => {
  const saved = await readProjectsFile(home)
  if (saved) return { projects: saved, migrated: false }
  return { projects: await migrateProjects({ home, device }), migrated: true }
}

export const projectStore = async (home: string, device: string) => {
  const { projects: loaded, migrated } = await load(home, device)
  let projects = mergeProjects(loaded, [])
  let saving: Promise<void> = Promise.resolve()
  const save = (next: Project[]) => {
    projects = next
    saving = saving.catch(() => {}).then(() => writeProjectsFile(home, projects))
    return saving
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
