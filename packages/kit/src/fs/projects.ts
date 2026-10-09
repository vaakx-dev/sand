import type { Project, ProjectCopy } from '@sand/host-projects/contract'
import { join } from 'node:path'
import { replaceFile } from './replace'

type Fields = Record<string, unknown>

const isFields = (value: unknown): value is Fields => !!value && typeof value === 'object' && !Array.isArray(value)
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const projectsPath = (home: string) => join(home, 'projects.json')

const parseCopy = (value: unknown): ProjectCopy | undefined => {
  if (!isFields(value) || typeof value.path !== 'string' || !value.path || !isTime(value.added) || !isTime(value.updated)) return undefined
  return { path: value.path, added: value.added, updated: value.updated, ...(value.removed === true ? { removed: true } : {}) }
}

const parseCopies = (value: Fields) => {
  const copies: Record<string, ProjectCopy> = {}
  for (const [device, raw] of Object.entries(value)) {
    const copy = parseCopy(raw)
    if (device && copy) copies[device] = copy
  }
  return copies
}

export const parseProject = (value: unknown): Project | undefined => {
  if (!isFields(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') return undefined
  if (!isTime(value.updated) || !isFields(value.copies)) return undefined
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

export const parseProjectsFile = (text: string): Project[] | undefined => {
  try {
    const value: unknown = JSON.parse(text)
    if (!isFields(value) || value.version !== 2 || !Array.isArray(value.projects)) return undefined
    return value.projects.flatMap(entry => parseProject(entry) ?? [])
  } catch {
    return undefined
  }
}

export const readProjectsFile = async (home: string): Promise<Project[] | undefined> => {
  const file = Bun.file(projectsPath(home))
  if (!(await file.exists())) return undefined
  return parseProjectsFile(await file.text())
}

export const writeProjectsFile = async (home: string, projects: Project[]) => {
  const path = projectsPath(home)
  await Bun.write(`${path}.tmp`, `${JSON.stringify({ version: 2, projects }, null, 2)}\n`)
  await replaceFile(`${path}.tmp`, path)
}
