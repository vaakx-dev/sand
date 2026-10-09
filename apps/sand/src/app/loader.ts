import { dirname, join, resolve } from 'node:path'

export const builtins = resolve(import.meta.dir, '..', '..', '..', '..', 'plugins')

export const loaderFolder = async (home: string, safe: boolean) => {
  const own = join(home, 'plugins', 'config-toml')
  if (!safe && (await Bun.file(join(own, 'package.json')).exists())) return own
  return dirname(Bun.resolveSync('@sand/config-toml/package.json', import.meta.dir))
}
