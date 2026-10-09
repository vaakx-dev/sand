import { join } from 'node:path'
import { exists } from '../folder/stat'

const nodeInstall = async (folder: string) => {
  const has = (name: string) => exists(join(folder, name))
  if ((await has('bun.lock')) || (await has('bun.lockb'))) return 'bun install'
  if (await has('pnpm-lock.yaml')) return 'pnpm install'
  if (await has('yarn.lock')) return 'yarn install'
  return 'npm install'
}

const projectSetup = async (folder: string) => {
  try {
    const { setup } = Bun.TOML.parse(await Bun.file(join(folder, '.sand', 'project.toml')).text()) as { setup?: unknown }
    return typeof setup === 'string' && setup.trim() ? setup.trim() : undefined
  } catch {
    return undefined
  }
}

export const suggestedSetup = async (folder: string) => {
  const configured = await projectSetup(folder)
  if (configured) return configured
  if (await exists(join(folder, 'Cargo.toml'))) return 'cargo fetch'
  if (await exists(join(folder, 'package.json'))) return nodeInstall(folder)
  if (await exists(join(folder, 'go.mod'))) return 'go mod download'
  return undefined
}
