import { gitMaybe, gitOk } from '@sand/git-runner/contract'
import { read } from './folder'

const timeoutMs = 120_000

export const pushBranch = async (cwd: string) => {
  const branch = await gitMaybe(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'], read)
  if (!branch) throw new Error("This folder isn't on a branch, so there's nothing to push.")
  const upstream = await gitMaybe(cwd, ['rev-parse', '--verify', '--quiet', '@{upstream}'], read)
  const args = upstream ? ['push', '--quiet'] : ['push', '--quiet', '--set-upstream', 'origin', branch]
  await gitOk(cwd, args, { timeoutMs, what: "Couldn't push" })
}
