import type { ProjectList } from '@sand/host-projects/contract'

const isList = (value: unknown): value is ProjectList => {
  if (!value || typeof value !== 'object') return false
  const list = value as Partial<ProjectList>
  return typeof list.scratch === 'string' && typeof list.home === 'string' && Array.isArray(list.projects) && Array.isArray(list.missing)
}

export const keptLists = (value: unknown): [string, ProjectList][] =>
  value && typeof value === 'object' ? Object.entries(value).filter((entry): entry is [string, ProjectList] => isList(entry[1])) : []
