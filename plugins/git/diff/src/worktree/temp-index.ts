import type { GitRunner } from '@sand/git/contract'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readOut } from '../git'
import type { Repo } from '../scope/repo'
import { listUntracked, literalPaths } from './untracked'

export type GitEnv = Record<string, string>

export interface WorktreeRead<T> {
  value: T
  truncated: boolean
}

const addIntent = ['-c', 'core.splitIndex=false', 'add', '--intent-to-add', '--pathspec-from-file=-', '--pathspec-file-nul']

const copyIndex = async (from: string, to: string) => {
  const index = Bun.file(from)
  if (await index.exists()) await Bun.write(to, index)
}

export const withUntracked = async <T>(git: GitRunner, repo: Repo, paths: string[], work: (env: GitEnv) => Promise<T>): Promise<WorktreeRead<T>> => {
  const untracked = await listUntracked(git, repo.root, paths)
  if (!untracked.paths.length) return { value: await work(literalPaths), truncated: untracked.truncated }
  const temp = join(tmpdir(), `sand-git-diff-${crypto.randomUUID()}.index`)
  const env = { ...literalPaths, GIT_INDEX_FILE: temp }
  try {
    await copyIndex(repo.index, temp)
    await readOut(git, repo.root, addIntent, { env, input: untracked.paths.join('\0') })
    return { value: await work(env), truncated: untracked.truncated }
  } finally {
    await Promise.all([rm(temp, { force: true }), rm(`${temp}.lock`, { force: true })])
  }
}
