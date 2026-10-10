import { branchExists } from './repo'
import { gitMaybe, gitOk } from './run'
import { applyStash, dropStash, stashAll } from './stash'

export const addWorktree = (repo: string, branch: string, path: string, base: string) => gitOk(repo, ['worktree', 'add', '-b', branch, path, base])

export const restoreWorktree = async (repo: string, branch: string, path: string, head: string) => {
  if (!branch) return gitOk(repo, ['worktree', 'add', '--detach', path, head])
  return (await branchExists(repo, branch)) ? gitOk(repo, ['worktree', 'add', path, branch]) : addWorktree(repo, branch, path, head)
}

export const removeWorktree = async (main: string, path: string, branch: string | null, force = false) => {
  await gitOk(main, ['worktree', 'remove', ...(force ? ['--force'] : []), path])
  if (branch) await gitMaybe(main, ['branch', '-D', branch])
}

const putBack = async (source: string, sha: string) => {
  try {
    await applyStash(source, sha)
  } catch {
    throw new Error(`Could not put the changes back. They are safe in git stash ${sha.slice(0, 7)}`)
  }
  await dropStash(source, sha)
}

export const carryChanges = async (source: string, target: string, message: string) => {
  const sha = await stashAll(source, message)
  if (!sha) return false
  try {
    await applyStash(target, sha)
  } catch (error) {
    await putBack(source, sha)
    throw error
  }
  await dropStash(source, sha)
  return true
}
