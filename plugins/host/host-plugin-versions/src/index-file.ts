import { writePrivateJson } from '@sand/kit/fs'
import { join } from 'node:path'
import type { Version, VersionSource } from './contract'

export interface VersionIndex {
  targets: Record<string, Version[]>
  good: Record<string, string>
}

const sources = new Set<VersionSource>(['start', 'edit', 'customise', 'restore', 'sync', 'auto-restore'])

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

const parseVersion = (value: unknown): Version | undefined => {
  if (!isRecord(value)) return undefined
  const { id, at, hash, source, note } = value
  if (typeof id !== 'string' || typeof at !== 'number' || typeof hash !== 'string' || !sources.has(source as VersionSource)) return undefined
  return { id, at, hash, source: source as VersionSource, ...(typeof note === 'string' ? { note } : {}) }
}

const parseTargets = (value: unknown): Record<string, Version[]> => {
  if (!isRecord(value)) return {}
  const entries = Object.entries(value).map(([key, list]) => [key, (Array.isArray(list) ? list : []).map(parseVersion).filter(item => item !== undefined)] as const)
  return Object.fromEntries(entries.filter(([, list]) => list.length))
}

const parseGood = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

export const indexPath = (root: string) => join(root, 'index.json')

export const readIndex = async (root: string): Promise<VersionIndex> => {
  const data: unknown = await Bun.file(indexPath(root)).json().catch(() => undefined)
  if (!isRecord(data)) return { targets: {}, good: {} }
  return { targets: parseTargets(data.targets), good: parseGood(data.good) }
}

export const writeIndex = (root: string, index: VersionIndex) => writePrivateJson(indexPath(root), index)
