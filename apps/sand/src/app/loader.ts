import type { Context } from 'drydock'
import { dirname, join, resolve } from 'node:path'

export const builtins = resolve(import.meta.dir, '..', '..', '..', '..', 'plugins')

export const builtinLoader = () => dirname(Bun.resolveSync('@sand/config-toml/package.json', import.meta.dir))

export const loaderFolder = async (home: string, safe: boolean) => {
  const own = join(home, 'plugins', 'config-toml')
  if (!safe && (await Bun.file(join(own, 'package.json')).exists())) return own
  return builtinLoader()
}

export const loadPlugins = (ctx: Context, loader: string) =>
  ctx.load(loader, {
    modes_file: join(import.meta.dir, 'modes.ts'),
    resolve_from: import.meta.dir,
  })
