import { expandHome } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import type { Project, ProjectList, ProjectPlace } from './contract'

const liveCopies = (project: Project): Project => ({
  ...project,
  copies: Object.fromEntries(Object.entries(project.copies).filter(([, copy]) => !copy.removed)),
})

const liveProjects = (projects: Project[]) => projects.filter(project => !project.deleted).map(liveCopies)

export const localCopy = (project: Project, device: string) => {
  const copy = project.copies[device]
  return copy && !copy.removed && !project.deleted ? copy : undefined
}

export const projectList = (projects: Project[], place: ProjectPlace): ProjectList => {
  const live = liveProjects(projects)
  const missing = live.filter(project => {
    const copy = project.copies[place.device]
    return copy && !existsSync(copy.path)
  })
  return { ...place, projects: live, missing: missing.map(project => project.id) }
}

export const fullPath = (path: string) => {
  const clean = path.trim()
  if (!clean.startsWith('~') && !isAbsolute(clean)) throw new Error('Give a full path')
  return expandHome(clean)
}

export const existingFolder = async (path: string) => {
  const full = fullPath(path)
  const info = await stat(full).catch(() => undefined)
  if (!info?.isDirectory()) throw new Error(`${full} is not a folder`)
  return full
}

export const nextStamp = (previous: number) => Math.max(Date.now(), previous + 1)
