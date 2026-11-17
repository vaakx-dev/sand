import { readState, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { Project, ProjectCopy, ProjectIcon } from '../contract'
import { isIconHash, isIconType } from '../icons/paths'

export const projectsPath = (home: string) => join(home, 'projects.json')

const flag = z.literal(true).optional().catch(undefined)

const copy = z
  .object({ path: z.string().min(1), added: z.number(), updated: z.number(), removed: flag })
  .transform(({ path, added, updated, removed }): ProjectCopy => ({ path, added, updated, ...(removed ? { removed } : {}) }))

const copies = z
  .record(z.string(), z.unknown())
  .transform(byDevice => {
    const parsed: Record<string, ProjectCopy> = {}
    for (const [device, raw] of Object.entries(byDevice)) {
      const found = copy.safeParse(raw).data
      if (device && found) parsed[device] = found
    }
    return parsed
  })

const icon = z
  .object({
    shape: z.number().int().positive().optional().catch(undefined),
    hue: z.number().min(0).lt(360).optional().catch(undefined),
  })
  .transform(({ shape, hue }): ProjectIcon | undefined => {
    const parsed = { ...(shape === undefined ? {} : { shape }), ...(hue === undefined ? {} : { hue }) }
    return Object.keys(parsed).length ? parsed : undefined
  })
  .catch(undefined)

const iconFile = z
  .object({
    hash: z.string().refine(isIconHash),
    type: z.string().refine(isIconType),
    updated: z.number(),
  })
  .optional()
  .catch(undefined)

const project = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    remote: z.string().optional(),
    icon,
    iconFile,
    copies,
    updated: z.number(),
    pinned: flag,
    archived: flag,
    deleted: flag,
  })
  .transform(
    ({ id, name, remote, icon: look, iconFile: file, copies: byDevice, updated, pinned, archived, deleted }): Project => ({
      id,
      name,
      ...(remote === undefined ? {} : { remote }),
      ...(look ? { icon: look } : {}),
      ...(file ? { iconFile: file } : {}),
      copies: byDevice,
      updated,
      ...(pinned ? { pinned } : {}),
      ...(archived ? { archived } : {}),
      ...(deleted ? { deleted } : {}),
    }),
  )

const projectsFile = z.object({ version: z.literal(2), projects: z.array(z.unknown()) })

export const parseProject = (value: unknown): Project | undefined => project.safeParse(value).data

const projectsOf = (value: unknown): Project[] | undefined => projectsFile.safeParse(value).data?.projects.flatMap(entry => parseProject(entry) ?? [])

export const parseProjectsFile = (text: string): Project[] | undefined => {
  try {
    return projectsOf(JSON.parse(text))
  } catch {
    return undefined
  }
}

export const readProjectsFile = async (home: string): Promise<Project[]> => (await readState(projectsPath(home), projectsOf)) ?? []

export const writeProjectsFile = (home: string, projects: Project[]) =>
  writeAtomic(projectsPath(home), `${JSON.stringify({ version: 2, projects }, null, 2)}\n`)
