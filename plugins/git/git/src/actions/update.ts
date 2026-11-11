import { gitMaybe, gitOk } from '@sand/git-runner/contract'
import { fetchOrigin } from '../fetch/origin'
import { readDefaultBranch } from '../status/default-branch'
import { read } from './folder'

const conflicted = async (cwd: string) => (await gitOk(cwd, ['diff', '--name-only', '--diff-filter=U'], read)).split(/\r?\n/).filter(Boolean)

const mergeIn = async (cwd: string, branch: string) => {
  try {
    await gitOk(cwd, ['merge', '--no-edit', '--quiet', `refs/remotes/origin/${branch}`], { what: `Couldn't update from ${branch}` })
  } catch (error) {
    if (!(await gitMaybe(cwd, ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD'], read))) throw error
    const files = await conflicted(cwd)
    await gitOk(cwd, ['merge', '--abort'], { what: `${branch} conflicts with this branch, and the merge couldn't be undone; finish or abort it by hand` })
    throw new Error(`${branch} conflicts with this branch in ${files.join(', ')}. The merge was undone, so nothing changed.`)
  }
}

export const updateFromDefault = async (cwd: string) => {
  const branch = await readDefaultBranch(cwd)
  if (!branch) throw new Error("Couldn't tell which branch is the default.")
  const fetched = await fetchOrigin(cwd)
  if (!fetched) throw new Error('This repo has no origin to update from.')
  if (!fetched.ok) throw new Error(`Couldn't fetch origin: ${fetched.error}`)
  const before = await gitOk(cwd, ['rev-parse', 'HEAD'], read)
  await mergeIn(cwd, branch)
  return { updated: (await gitOk(cwd, ['rev-parse', 'HEAD'], read)) !== before }
}
