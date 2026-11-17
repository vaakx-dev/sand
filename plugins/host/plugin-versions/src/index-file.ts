import { readState, writePrivateJson } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { Version, VersionSource } from './contract'

export interface VersionIndex {
  targets: Record<string, Version[]>
  good: Record<string, string>
}

const sources = ['start', 'edit', 'customise', 'restore', 'sync', 'auto-restore'] as const satisfies readonly VersionSource[]

const version = z.object({
  id: z.string(),
  at: z.number(),
  hash: z.string(),
  source: z.enum(sources),
  note: z.string().optional().catch(undefined),
})

const versionList = z
  .array(z.unknown())
  .transform(items => items.flatMap(item => version.safeParse(item).data ?? []))
  .catch([])

const targets = z
  .record(z.string(), versionList)
  .transform(byTarget => Object.fromEntries(Object.entries(byTarget).filter(([, list]) => list.length)))
  .catch({})

const good = z
  .record(z.string(), z.unknown())
  .transform(value => Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
  .catch({})

const indexShape = z.object({ targets, good }).catch({ targets: {}, good: {} })

const indexPath = (root: string) => join(root, 'index.json')

const parseIndex = (data: unknown): VersionIndex => indexShape.parse(data)

export const readIndex = async (root: string): Promise<VersionIndex> => (await readState(indexPath(root), parseIndex)) ?? parseIndex(undefined)

export const writeIndex = (root: string, index: VersionIndex) => writePrivateJson(indexPath(root), index)
