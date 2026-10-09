import { isQuietFolder, nearestRoot } from '@sand/host'
import type { Project } from '@sand/protocol'
import { join, resolve } from 'node:path'
import { linkOwners, readOldRecords } from './old'
import { type Seed, seedProject, within } from './seed'
import { threadFolders } from './threads'

export interface MigrateOptions {
  home: string
  device: string
}

interface Root {
  path: string
  repo: boolean
  added: number
}

const threadRoots = (home: string) => {
  const roots = new Map<string, Root>()
  for (const folder of threadFolders(home)) {
    if (typeof folder.cwd !== 'string' || !folder.cwd) continue
    const cwd = resolve(folder.cwd)
    const repo = nearestRoot(cwd)
    const path = repo ?? cwd
    const added = Number(folder.created) || 0
    const known = roots.get(path)
    roots.set(path, { path, repo: Boolean(repo), added: known ? Math.min(known.added, added) : added })
  }
  return [...roots.values()].sort((a, b) => a.path.length - b.path.length)
}

export const migrateProjects = async ({ home, device }: MigrateOptions): Promise<Project[]> => {
  const projects: Project[] = []
  try {
    const now = Date.now()
    const scratch = resolve(join(home, 'scratch'))
    const usable = (path: string) => !within(path, scratch) && !isQuietFolder(path)
    const paths = new Set<string>()
    const add = async (seed: Seed) => {
      projects.push(await seedProject(device, seed, now))
      paths.add(seed.path)
    }
    const records = (await readOldRecords(home)).filter(record => usable(record.path))
    const owners = linkOwners(records)
    for (const record of records) {
      if (paths.has(record.path)) continue
      await add({ ...record, id: record.link && owners.has(record) ? record.link : Bun.randomUUIDv7() })
    }
    const covered = (path: string) => [...paths].some(copy => within(path, copy))
    for (const root of threadRoots(home)) {
      if (!usable(root.path) || paths.has(root.path) || (!root.repo && covered(root.path))) continue
      await add({ id: Bun.randomUUIDv7(), path: root.path, added: root.added })
    }
  } catch {}
  return projects
}
