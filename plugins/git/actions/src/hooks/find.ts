import type { GitLayout, GitRunner } from '@sand/git/contract'
import { isMissing } from '@sand/util/fs'
import { stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

const hooksDir = async (git: GitRunner, repo: GitLayout) => {
  const configured = await git.maybe(repo.root, ['config', '--type=path', '--get', 'core.hooksPath'], { read: true })
  if (!configured) return join(repo.commonDir, 'hooks')
  return isAbsolute(configured) ? configured : join(repo.root, configured)
}

const runnable = async (path: string) => {
  try {
    const info = await stat(path)
    return info.isFile() && (process.platform === 'win32' || (info.mode & 0o111) !== 0)
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

export const findHooks = async (git: GitRunner, repo: GitLayout, names: string[]) => {
  const dir = await hooksDir(git, repo)
  const found = await Promise.all(names.map(async name => ((await runnable(join(dir, name))) ? name : undefined)))
  return found.filter((name): name is string => name !== undefined)
}

export const hookFailed = (names: string[], nothing: string) => `The ${names.join(' or ')} hook failed. Nothing was ${nothing}.`
