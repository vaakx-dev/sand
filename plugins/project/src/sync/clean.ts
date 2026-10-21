import type { Project } from '../contract'
import { mergeProjects } from '../projects'
import { parseProject } from '../registry/file'

export const cleanProjects = (value: unknown): Project[] => {
  if (!Array.isArray(value)) throw new Error('projects must be a list')
  return value.flatMap(item => parseProject(item) ?? [])
}

export const fingerprint = (projects: Project[]) => JSON.stringify(mergeProjects([], projects))
