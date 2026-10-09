import { mergeProjects } from '@sand/kit'
import type { Project } from '@sand/protocol'
import { parseProject } from '@sand/host'

export const cleanProjects = (value: unknown): Project[] => {
  if (!Array.isArray(value)) throw new Error('projects must be a list')
  return value.flatMap(item => parseProject(item) ?? [])
}

export const fingerprint = (projects: Project[]) => JSON.stringify(mergeProjects([], projects))
