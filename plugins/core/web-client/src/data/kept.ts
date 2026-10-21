import type { ProjectList } from '@sand/project/contract'
import { isRecord } from '@sand/util'

const isList = (value: unknown): value is ProjectList =>
  isRecord(value) &&
  typeof value.home === 'string' &&
  Array.isArray(value.projects) &&
  Array.isArray(value.missing)

export const keptLists = (value: unknown): [string, ProjectList][] =>
  isRecord(value) ? Object.entries(value).filter((entry): entry is [string, ProjectList] => isList(entry[1])) : []
