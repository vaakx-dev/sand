import { defaultHome } from '@sand/util/fs'
import { join } from 'node:path'

export const authPath = async (home: string) => {
  const own = join(home, 'auth.json')
  return (await Bun.file(own).exists()) ? own : join(defaultHome(), 'auth.json')
}
