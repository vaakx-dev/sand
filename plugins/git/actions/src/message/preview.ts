import type { GitRunner } from '@sand/git/contract'
import { uuid } from '@sand/util'
import { copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Repo } from '../run/repo'
import { literalPaths, pathInput, pathspecFromInput } from '../stage/pathspec'

const patchLines = 4000
const patchChars = 40_000

export interface Preview {
  stat: string
  patch: string
  truncated: boolean
}

const copyIndex = async (repo: Repo, to: string) => {
  const from = join(repo.gitDir, 'index')
  if (await Bun.file(from).exists()) await copyFile(from, to)
}

const stageInto = async (git: GitRunner, repo: Repo, env: Record<string, string>, paths?: string[]) => {
  if (!paths) return git.ok(repo.root, ['add', '-A'], { env })
  const born = await git.maybe(repo.root, ['rev-parse', '-q', '--verify', 'HEAD'], { read: true })
  await git.ok(repo.root, born ? ['read-tree', '-m', 'HEAD'] : ['read-tree', '--empty'], { env })
  return git.ok(repo.root, ['add', '-A', ...pathspecFromInput], { env, input: pathInput(paths) })
}

const readDiff = async (git: GitRunner, repo: Repo, env: Record<string, string>): Promise<Preview> => {
  const diff = ['diff', '--cached', '--no-color', '--no-ext-diff', '--find-renames']
  const [stat, patch] = await Promise.all([git.ok(repo.root, [...diff, '--stat'], { env }), git.lines(repo.root, diff, patchLines, { env })])
  const text = patch.lines.join('\n')
  return {
    stat,
    patch: text.slice(0, patchChars),
    truncated: patch.lines.length >= patchLines || text.length > patchChars,
  }
}

export const previewChanges = async (git: GitRunner, repo: Repo, paths?: string[]): Promise<Preview> => {
  const index = join(tmpdir(), `sand-index-${uuid()}`)
  const env = { ...literalPaths, GIT_INDEX_FILE: index }
  try {
    await copyIndex(repo, index)
    await stageInto(git, repo, env, paths)
    return await readDiff(git, repo, env)
  } finally {
    await Promise.all([rm(index, { force: true }), rm(`${index}.lock`, { force: true })])
  }
}
