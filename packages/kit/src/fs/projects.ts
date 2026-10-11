import type { Project, ProjectCopy } from '@sand/protocol'
import { join } from 'node:path'
import { isRecord } from '../json/record'
import { writeAtomic } from './replace'

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const projectsPath = (home: string) => join(home, 'projects.json')

const parseCopy = (value: unknown): ProjectCopy | undefined => {
  if (!isRecord(value) || typeof value.path !== 'string' || !value.path || !isTime(value.added) || !isTime(value.updated)) return undefined
  return { path: value.path, added: value.added, updated: value.updated, ...(value.removed === true ? { removed: true } : {}) }
}

const parseCopies = (value: Record<string, unknown>) => {
  const copies: Record<string, ProjectCopy> = {}
  for (const [device, raw] of Object.entries(value)) {
    const copy = parseCopy(raw)
    if (device && copy) copies[device] = copy
  }
  return copies
}

export const parseProject = (value: unknown): Project | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') return undefined
  if (!isTime(value.updated) || !isRecord(value.copies)) return undefined
  if (value.remote !== undefined && typeof value.remote !== 'string') return undefined
  return {
    id: value.id,
    name: value.name,
    ...(typeof value.remote === 'string' ? { remote: value.remote } : {}),
    copies: parseCopies(value.copies),
    updated: value.updated,
    ...(value.hidden === true ? { hidden: true } : {}),
    ...(value.deleted === true ? { deleted: true } : {}),
  }
}

const projectsOf = (value: unknown): Project[] => {
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.projects)) throw new Error('Not a version 2 projects file')
  return value.projects.flatMap(entry => parseProject(entry) ?? [])
}

export const parseProjectsFile = (text: string): Project[] | undefined => {
  try {
    return projectsOf(JSON.parse(text))
  } catch {
    return undefined
  }
}

export const readProjectsFile = async (home: string): Promise<Project[]> => {
  const file = Bun.file(projectsPath(home))
  if (!(await file.exists())) return []
  return projectsOf(await file.json())
}

export const writeProjectsFile = (home: string, projects: Project[]) =>
  writeAtomic(projectsPath(home), `${JSON.stringify({ version: 2, projects }, null, 2)}\n`)
