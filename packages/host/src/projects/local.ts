import type { Project } from '@sand/protocol'
import { readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { sandHome } from '../paths/home'
import { isQuietFolder, nearestRoot, samePath } from '../paths/roots'
import { parseProjectsFile, projectsPath } from './file'

export interface LocalProjects {
  device?: string
  projects: Project[]
}

export interface LocalCopy {
  project: string
  path: string
}

interface Cached {
  key: string
  local: LocalProjects
  copies: LocalCopy[]
}

const cache = new Map<string, Cached>()

const stamp = (path: string) => {
  try {
    const { mtimeMs, size } = statSync(path)
    return `${mtimeMs}:${size}`
  } catch {
    return '-'
  }
}

const readText = (path: string) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

const readDevice = (home: string) => {
  try {
    const { id } = JSON.parse(readText(join(home, 'device.json')) ?? '{}')
    return typeof id === 'string' && id ? id : undefined
  } catch {
    return undefined
  }
}

const copiesOf = ({ device, projects }: LocalProjects): LocalCopy[] => {
  if (!device) return []
  return projects
    .flatMap(project => {
      const copy = project.copies[device]
      return copy && !copy.removed ? [{ project: project.id, path: resolve(copy.path) }] : []
    })
    .sort((a, b) => b.path.length - a.path.length)
}

const load = (home: string): Cached => {
  const key = `${stamp(projectsPath(home))}|${stamp(join(home, 'device.json'))}`
  const cached = cache.get(home)
  if (cached?.key === key) return cached
  const text = readText(projectsPath(home))
  const projects = (text ? parseProjectsFile(text) : undefined) ?? []
  const local = { device: readDevice(home), projects: projects.filter(project => !project.deleted) }
  const next = { key, local, copies: copiesOf(local) }
  cache.set(home, next)
  return next
}

const contains = (folder: string, path: string) => {
  const rel = relative(folder, path)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

export const localProjects = (home = sandHome()): LocalProjects => load(home).local

export const localCopies = (home = sandHome()): LocalCopy[] => load(home).copies

export const projectOfFolder = (cwd: string, home = sandHome()): string | null => {
  if (!cwd) return null
  const path = resolve(cwd)
  if (contains(join(home, 'scratch'), path)) return null
  const copy = localCopies(home).find(copy => (isQuietFolder(copy.path) ? samePath(copy.path, path) : contains(copy.path, path)))
  if (!copy) return null
  return samePath(copy.path, path) || !nearestRoot(path, copy.path) ? copy.project : null
}

export const copyPath = (project: string, home = sandHome()): string | undefined =>
  localCopies(home).find(copy => copy.project === project)?.path
