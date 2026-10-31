import type { GitRunner } from '@sand/git/contract'
import { skipped, walkFiles } from './walk'

const limit = 20_000

const lsFiles = (git: GitRunner, cwd: string, args: string[]) =>
  git.run(cwd, ['ls-files', '-z', ...args], { read: true }).then(
    ({ code, out }) => (code === 0 ? out.split('\0').filter(Boolean) : undefined),
    () => undefined,
  )

const gitFiles = async (git: GitRunner | undefined, cwd: string) => {
  if (!git) return undefined
  const [files, deleted] = await Promise.all([lsFiles(git, cwd, ['--cached', '--others', '--exclude-standard']), lsFiles(git, cwd, ['--deleted'])])
  if (!files) return undefined
  const gone = new Set(deleted)
  return files.filter(path => !gone.has(path))
}

const visible = (path: string) => !path.split('/').some(part => skipped.has(part))

export const listFiles = async (git: GitRunner | undefined, cwd: string) =>
  ((await gitFiles(git, cwd)) ?? (await walkFiles(cwd, limit))).filter(visible).slice(0, limit)
