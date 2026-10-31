import type { GitEnv, GitLayout, GitRunner } from '@sand/git/contract'
import { literalPaths, pathInput, pathspecFromInput } from '../stage/pathspec'

const patchLines = 4000
const patchChars = 40_000

export interface Preview {
  stat: string
  patch: string
  truncated: boolean
}

const stageInto = async (git: GitRunner, repo: GitLayout, env: GitEnv, paths?: string[]) => {
  if (!paths) return git.ok(repo.root, ['add', '-A'], { env })
  const born = await git.maybe(repo.root, ['rev-parse', '-q', '--verify', 'HEAD'], { read: true })
  await git.ok(repo.root, born ? ['read-tree', '-m', 'HEAD'] : ['read-tree', '--empty'], { env })
  return git.ok(repo.root, ['add', '-A', ...pathspecFromInput], { env, input: pathInput(paths) })
}

const readDiff = async (git: GitRunner, repo: GitLayout, env: GitEnv): Promise<Preview> => {
  const diff = ['diff', '--cached', '--no-color', '--no-ext-diff', '--find-renames']
  const [stat, patch] = await Promise.all([git.ok(repo.root, [...diff, '--stat'], { env }), git.lines(repo.root, diff, patchLines, { env })])
  const text = patch.lines.join('\n')
  return {
    stat,
    patch: text.slice(0, patchChars),
    truncated: patch.lines.length >= patchLines || text.length > patchChars,
  }
}

export const previewChanges = (git: GitRunner, repo: GitLayout, paths?: string[]): Promise<Preview> =>
  git.withTempIndex(repo.root, async index => {
    const env = { ...literalPaths, ...index }
    await stageInto(git, repo, env, paths)
    return readDiff(git, repo, env)
  })
