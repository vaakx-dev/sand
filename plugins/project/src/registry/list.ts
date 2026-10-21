import { samePath } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import type { Project, ProjectList, ProjectPlace } from '../contract'

export const localCopy = (project: Project, device: string) => {
  const copy = project.copies[device]
  return copy && !copy.removed && !project.deleted ? copy : undefined
}

export const projectAt = (projects: Project[], device: string, path: string) =>
  projects.find(project => {
    const copy = localCopy(project, device)
    return copy !== undefined && samePath(copy.path, path)
  })

export const removedCopyAt = (projects: Project[], device: string, path: string) =>
  projects.find(project => {
    const copy = project.copies[device]
    return !project.deleted && copy?.removed && samePath(copy.path, path)
  })

export const projectList = (projects: Project[], place: ProjectPlace): ProjectList => {
  const missing = projects.filter(project => {
    const copy = localCopy(project, place.device)
    return copy && !existsSync(copy.path)
  })
  return { ...place, projects, missing: missing.map(project => project.id) }
}
