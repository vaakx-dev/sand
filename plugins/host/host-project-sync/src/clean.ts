import type { Project } from '@sand/host-projects/contract'
import { mergeProjects } from '@sand/kit'
import { parseProject } from '@sand/kit/fs'

export const cleanProjects = (value: unknown): Project[] => {
  if (!Array.isArray(value)) throw new Error('projects must be a list')
  return value.flatMap(item => parseProject(item) ?? [])
}

export const fingerprint = (projects: Project[]) => JSON.stringify(mergeProjects([], projects))
