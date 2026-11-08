import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const gitEntry = async (dir: string) => stat(join(dir, '.git')).catch(() => undefined)

export const mayBeWorktree = async (cwd: string): Promise<boolean> => {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const found = await gitEntry(dir)
    if (found) return found.isFile()
    if (dirname(dir) === dir) return false
  }
}
