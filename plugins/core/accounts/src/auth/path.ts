import { homedir } from 'node:os'
import { join } from 'node:path'

export const authPath = async (home: string) => {
  const own = join(home, 'auth.json')
  return (await Bun.file(own).exists()) ? own : join(homedir(), '.sand', 'auth.json')
}
