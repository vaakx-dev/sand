import { join } from 'node:path'
import { exists } from '../folder/stat'

const nodeInstall = async (folder: string) => {
  const has = (name: string) => exists(join(folder, name))
  if ((await has('bun.lock')) || (await has('bun.lockb'))) return 'bun install'
  if (await has('pnpm-lock.yaml')) return 'pnpm install'
  if (await has('yarn.lock')) return 'yarn install'
  return 'npm install'
}

export const suggestedSetup = async (folder: string) => {
  if (await exists(join(folder, 'Cargo.toml'))) return 'cargo fetch'
  if (await exists(join(folder, 'package.json'))) return nodeInstall(folder)
  if (await exists(join(folder, 'go.mod'))) return 'go mod download'
  return undefined
}
