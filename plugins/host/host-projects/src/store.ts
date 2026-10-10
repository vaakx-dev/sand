import { errorMessage, mergeProjects, serial } from '@sand/kit'
import { projectsPath, readProjectsFile, writeProjectsFile } from '@sand/kit/fs'
import type { Project } from './contract'
import { migrateProjects } from './migrate'

const loadProjects = async (home: string, device: string) => {
  const saved = await readProjectsFile(home)
  return { projects: saved ?? (await migrateProjects(home, device)), migrated: !saved }
}

const loadFailed = (home: string, error: unknown) =>
  new Error(
    `Could not load projects from ${projectsPath(home)}: ${errorMessage(error)}. The file is left as it is and project changes are not saved until sand restarts.`,
    { cause: error },
  )

export const projectStore = async (home: string, device: string, report: (error: unknown) => void) => {
  const loaded = await loadProjects(home, device).catch(error => {
    report(loadFailed(home, error))
    return undefined
  })
  let projects = mergeProjects(loaded?.projects ?? [], [])
  const queue = serial()
  const save = (next: Project[]) => {
    projects = next
    return loaded ? queue(() => writeProjectsFile(home, projects)) : Promise.resolve()
  }
  if (loaded?.migrated) await save(projects)
  return {
    all: () => projects,
    get: (id: string) => projects.find(project => project.id === id),
    save,
    put: (project: Project) => save(mergeProjects(projects.filter(other => other.id !== project.id), [project])),
  }
}

export type ProjectStore = Awaited<ReturnType<typeof projectStore>>
