import type { GitEnv, GitRunner } from '@sand/git/contract'

const maxUntracked = 3000

const addIntent = ['-c', 'core.splitIndex=false', 'add', '--intent-to-add', '--pathspec-from-file=-', '--pathspec-file-nul']

export const literalPaths = { GIT_LITERAL_PATHSPECS: '1' }

export interface WorktreeRead<T> {
  value: T
  truncated: boolean
  untracked: string[]
}

const listUntracked = async (git: GitRunner, root: string, paths: string[]) => {
  const out = await git.output(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths], { env: literalPaths, read: true })
  const found = out.split('\0').filter(path => path && !path.endsWith('/'))
  return { paths: found.slice(0, maxUntracked), truncated: found.length > maxUntracked }
}

export const withUntracked = async <T>(git: GitRunner, root: string, paths: string[], work: (env: GitEnv) => Promise<T>): Promise<WorktreeRead<T>> => {
  const untracked = await listUntracked(git, root, paths)
  const { paths: found, truncated } = untracked
  if (!found.length) return { value: await work(literalPaths), truncated, untracked: found }
  const value = await git.withTempIndex(root, async index => {
    const env = { ...literalPaths, ...index }
    await git.output(root, addIntent, { env, input: found.join('\0'), read: true })
    return work(env)
  })
  return { value, truncated, untracked: found }
}
