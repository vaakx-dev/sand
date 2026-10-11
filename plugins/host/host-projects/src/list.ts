import { samePath } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import type { Project, ProjectList, ProjectPlace } from './contract'

const liveCopies = (project: Project): Project => ({
  ...project,
  copies: Object.fromEntries(Object.entries(project.copies).filter(([, copy]) => !copy.removed)),
})

export const localCopy = (project: Project, device: string) => {
  const copy = project.copies[device]
  return copy && !copy.removed && !project.deleted ? copy : undefined
}

export const projectAt = (projects: Project[], device: string, path: string) =>
  projects.find(project => {
    const copy = localCopy(project, device)
    return copy !== undefined && samePath(copy.path, path)
  })

export const projectList = (projects: Project[], place: ProjectPlace): ProjectList => {
  const live = projects.filter(project => !project.deleted).map(liveCopies)
  const missing = live.filter(project => {
    const copy = project.copies[place.device]
    return copy && !existsSync(copy.path)
  })
  return { ...place, projects: live, missing: missing.map(project => project.id) }
}
