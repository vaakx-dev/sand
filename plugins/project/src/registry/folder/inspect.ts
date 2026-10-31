import type { GitRunner } from '@sand/git/contract'
import { basename, resolve } from 'node:path'
import { readProjectToml } from './toml'

export interface FolderFacts {
  name: string
  setup?: string
  remote?: string
}

export const inspectFolder = async (path: string, git: GitRunner | undefined): Promise<FolderFacts> => {
  const [toml, remote] = await Promise.all([readProjectToml(path), git?.remoteUrl(path)])
  return {
    name: toml.name ?? (basename(resolve(path)) || path),
    ...(toml.setup ? { setup: toml.setup } : {}),
    ...(remote ? { remote } : {}),
  }
}
