import { git } from '@sand/util/git'
import { skipped, walkFiles } from './walk'

const limit = 20_000

const lsFiles = (cwd: string, args: string[]) =>
  git(cwd, ['ls-files', '-z', ...args]).then(
    ({ code, out }) => (code === 0 ? out.split('\0').filter(Boolean) : undefined),
    () => undefined,
  )

// --cached still lists tracked files that were moved or deleted, so drop those.
const gitFiles = async (cwd: string) => {
  const [files, deleted] = await Promise.all([lsFiles(cwd, ['--cached', '--others', '--exclude-standard']), lsFiles(cwd, ['--deleted'])])
  if (!files) return undefined
  const gone = new Set(deleted)
  return files.filter(path => !gone.has(path))
}

const visible = (path: string) => !path.split('/').some(part => skipped.has(part))

export const listFiles = async (cwd: string) => ((await gitFiles(cwd)) ?? (await walkFiles(cwd, limit))).filter(visible).slice(0, limit)
