import { folderName, isInside } from '@sand/kit'
import type { Project } from '@sand/protocol'
import { stat } from 'node:fs/promises'
import { type FolderFacts, inspectFolder } from '../folder/inspect'

export interface Seed {
  id: string
  path: string
  added: number
  name?: string
  hidden?: boolean
}

export const within = (path: string, folder: string) => path === folder || isInside(path, folder)

const isFolder = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

export const seedProject = async (device: string, seed: Seed, now: number): Promise<Project> => {
  const facts: FolderFacts = (await isFolder(seed.path)) ? await inspectFolder(seed.path) : { name: folderName(seed.path) }
  return {
    id: seed.id,
    name: seed.name ?? facts.name,
    ...(facts.remote ? { remote: facts.remote } : {}),
    copies: { [device]: { path: seed.path, added: seed.added, updated: seed.added || now } },
    updated: now,
    ...(seed.hidden ? { hidden: true } : {}),
  }
}
