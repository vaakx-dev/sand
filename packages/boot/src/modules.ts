import { packageExports } from '@sand/util/fs'
import { join } from 'node:path'

const external = ['drydock', 'zod']

export const sharedModules = async (builtins: string, addons: string[]) => ({
  ...Object.fromEntries(external.map(name => [name, Bun.resolveSync(name, import.meta.dir)])),
  ...(await packageExports(builtins, join(builtins, '..', 'packages'), ...addons)),
})
