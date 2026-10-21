import type { CliPlace } from '@sand/config/contract'
import { join, resolve } from 'node:path'

export const builtins = resolve(import.meta.dir, '..', '..', '..', '..', 'plugins')

interface LoaderOptions {
  home: string
  safe: boolean
  place: CliPlace
}

export const runsUserPlugins = ({ safe, place }: LoaderOptions) => !safe && place !== 'host'

export const loaderFolder = async (options: LoaderOptions) => {
  const own = join(options.home, 'plugins', 'config')
  if (runsUserPlugins(options) && (await Bun.file(join(own, 'package.json')).exists())) return own
  return join(builtins, 'core', 'config')
}
