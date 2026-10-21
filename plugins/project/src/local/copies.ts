import { isRecord } from '@sand/util'
import { isQuietFolder, isWithin, nearestRoot, samePath } from '@sand/util/fs'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { LocalCopy, Project } from '../contract'
import { parseProjectsFile, projectsPath } from '../registry/file'

interface Cached {
  key: string
  projects: Project[]
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
    const saved: unknown = JSON.parse(readText(join(home, 'device.json')) ?? '{}')
    return isRecord(saved) && typeof saved.id === 'string' && saved.id ? saved.id : undefined
  } catch {
    return undefined
  }
}

const copiesOf = (projects: Project[], device: string | undefined): LocalCopy[] => {
  if (!device) return []
  return projects
    .flatMap(project => {
      const copy = project.copies[device]
      return copy && !copy.removed ? [{ project: project.id, path: resolve(copy.path) }] : []
    })
    .sort((a, b) => b.path.length - a.path.length)
}

export const localCopies = (home: string) => {
  let cached: Cached | undefined

  const load = (): Cached => {
    const key = `${stamp(projectsPath(home))}|${stamp(join(home, 'device.json'))}`
    if (cached?.key === key) return cached
    const text = readText(projectsPath(home))
    const projects = ((text ? parseProjectsFile(text) : undefined) ?? []).filter(project => !project.deleted)
    cached = { key, projects, copies: copiesOf(projects, readDevice(home)) }
    return cached
  }

  const copies = () => load().copies

  const ofFolder = (cwd: string): string | null => {
    if (!cwd) return null
    const path = resolve(cwd)
    const copy = copies().find(copy => (isQuietFolder(copy.path) ? samePath(copy.path, path) : isWithin(path, copy.path)))
    if (!copy) return null
    return samePath(copy.path, path) || !nearestRoot(path, copy.path) ? copy.project : null
  }

  return { projects: () => load().projects, copies, ofFolder }
}

export type LocalCopies = ReturnType<typeof localCopies>
