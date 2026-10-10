import { isRecord } from '@sand/kit'
import { join } from 'node:path'
import { exists } from '../folder/stat'

const has = (folder: string, name: string) => exists(join(folder, name))

const nodeInstall = async (folder: string) => {
  if ((await has(folder, 'bun.lock')) || (await has(folder, 'bun.lockb'))) return 'bun install'
  if (await has(folder, 'pnpm-lock.yaml')) return 'pnpm install'
  if (await has(folder, 'yarn.lock')) return 'yarn install'
  return 'npm install'
}

const projectSetup = async (folder: string) => {
  try {
    const parsed = Bun.TOML.parse(await Bun.file(join(folder, '.sand', 'project.toml')).text())
    const setup = isRecord(parsed) ? parsed.setup : undefined
    return typeof setup === 'string' && setup.trim() ? setup.trim() : undefined
  } catch {
    return undefined
  }
}

export const suggestedSetup = async (folder: string) => {
  const configured = await projectSetup(folder)
  if (configured) return configured
  if (await has(folder, 'Cargo.toml')) return 'cargo fetch'
  if (await has(folder, 'package.json')) return nodeInstall(folder)
  if (await has(folder, 'go.mod')) return 'go mod download'
  return undefined
}
