import type { ProjectList } from '@sand/project/contract'
import { z } from 'zod'

const list = z.looseObject({ home: z.string(), projects: z.array(z.unknown()), missing: z.array(z.unknown()) })

const kept = z.record(z.string(), z.unknown()).catch({})

export const keptLists = (value: unknown): [string, ProjectList][] =>
  Object.entries(kept.parse(value)).filter((entry): entry is [string, ProjectList] => list.safeParse(entry[1]).success)
