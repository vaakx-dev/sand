import { sharedModules } from '@sand/boot/modules'
import { share } from 'drydock'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

type Plugin = readonly [id: string, entry: string]

let shared: Promise<void> | undefined

const shareModules = (builtins: string) => (shared ??= sharedModules(builtins).then(share))

const runtimeEntry = async (dir: string) => {
  const manifest = await Bun.file(join(dir, 'package.json'))
    .json()
    .catch(() => undefined)
  const entry = manifest?.sand?.runtime
  return typeof entry === 'string' ? resolve(dir, entry) : undefined
}

export const userPlugins = async (builtins: string) => {
  const root = join(homedir(), '.sand', 'plugins')
  const folders = (await readdir(root, { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory() || entry.isSymbolicLink())
  const found = await Promise.all(folders.map(async ({ name }): Promise<Plugin[]> => {
    const entry = await runtimeEntry(join(root, name))
    return entry ? [[name, entry]] : []
  }))
  const plugins = found.flat()
  if (plugins.length) await shareModules(builtins)
  return plugins
}
