import type { Project, ProjectCopy } from '@sand/protocol'
import { compare } from '../text/compare'

const normalCopy = (copy: ProjectCopy): ProjectCopy => ({
  path: copy.path,
  added: copy.added,
  updated: copy.updated,
  ...(copy.removed ? { removed: true } : {}),
})

const normalFields = (project: Project): Omit<Project, 'copies'> => ({
  id: project.id,
  name: project.name,
  ...(typeof project.remote === 'string' ? { remote: project.remote } : {}),
  updated: project.updated,
  ...(project.hidden ? { hidden: true } : {}),
  ...(project.deleted ? { deleted: true } : {}),
})

const newer = <T extends { updated: number }>(a: T, b: T, key: (value: T) => string) => {
  if (a.updated !== b.updated) return a.updated > b.updated ? a : b
  return key(a) >= key(b) ? a : b
}

const fieldsKey = (project: Project) => JSON.stringify(normalFields(project))
const copyKey = (copy: ProjectCopy) => JSON.stringify(normalCopy(copy))

const mergeProject = (a: Project, b: Project): Project => {
  const head = newer(a, b, fieldsKey)
  const devices = [...new Set([...Object.keys(a.copies), ...Object.keys(b.copies)])].sort(compare)
  const copies: Record<string, ProjectCopy> = {}
  for (const device of devices) {
    const x = a.copies[device]
    const y = b.copies[device]
    const copy = x && y ? newer(x, y, copyKey) : (x ?? y)
    if (copy) copies[device] = normalCopy(copy)
  }
  return { ...normalFields({ ...head, updated: Math.max(a.updated, b.updated) }), copies }
}

export const mergeProjects = (local: Project[], incoming: Project[]): Project[] => {
  const merged = new Map<string, Project>()
  for (const project of [...local, ...incoming]) {
    const known = merged.get(project.id)
    merged.set(project.id, mergeProject(known ?? project, project))
  }
  return [...merged.values()].sort((a, b) => compare(a.id, b.id))
}
