import { existsSync } from 'node:fs'
import { git } from '../run'

export const readLocals = async (cwd: string) => {
  if (!cwd || !existsSync(cwd)) return []
  const output = await git(['for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', 'refs/heads'], cwd)
  return (output ?? '').split('\n').map(line => line.trim()).filter(Boolean)
}
