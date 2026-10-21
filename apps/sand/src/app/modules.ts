import { packageExports } from '@sand/util/fs'
import { join } from 'node:path'
import { builtins } from './loader'

const external = ['drydock', 'zod']

export const sharedModules = async () => ({
  ...Object.fromEntries(external.map(name => [name, Bun.resolveSync(name, import.meta.dir)])),
  ...(await packageExports(builtins, join(builtins, '..', 'packages'))),
})
