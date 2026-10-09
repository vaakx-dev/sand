import { isQuietFolder, nearestRoot, parseProjectsFile, projectsPath, samePath } from '@sand/kit/fs'
import { readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { LocalCopy, LocalProjects } from './contract'

interface Cached {
  key: string
  local: LocalProjects
  copies: LocalCopy[]
}

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

const contains = (folder: string, path: string) => {
  const rel = relative(folder, path)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

export const localFiles = (home: string) => {
  let cached: Cached | undefined

  const load = (): Cached => {
    const key = `${stamp(projectsPath(home))}|${stamp(join(home, 'device.json'))}`
    if (cached?.key === key) return cached
    const text = readText(projectsPath(home))
    const projects = (text ? parseProjectsFile(text) : undefined) ?? []
    const local = { device: readDevice(home), projects: projects.filter(project => !project.deleted) }
    cached = { key, local, copies: copiesOf(local) }
    return cached
  }

  const copies = () => load().copies

  const ofFolder = (cwd: string): string | null => {
    if (!cwd) return null
    const path = resolve(cwd)
    if (contains(join(home, 'scratch'), path)) return null
    const copy = copies().find(copy => (isQuietFolder(copy.path) ? samePath(copy.path, path) : contains(copy.path, path)))
    if (!copy) return null
    return samePath(copy.path, path) || !nearestRoot(path, copy.path) ? copy.project : null
  }

  return { local: () => load().local, copies, ofFolder }
}
