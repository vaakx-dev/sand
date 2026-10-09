import { basename, resolve } from 'node:path'
import { gitRemote } from './git'
import { readProjectToml } from './toml'

export interface FolderFacts {
  name: string
  setup?: string
  remote?: string
}

export const inspectFolder = async (path: string): Promise<FolderFacts> => {
  const [toml, remote] = await Promise.all([readProjectToml(path), gitRemote(path)])
  return {
    name: toml.name ?? (basename(resolve(path)) || path),
    ...(toml.setup ? { setup: toml.setup } : {}),
    ...(remote ? { remote } : {}),
  }
}
