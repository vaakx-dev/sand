import type { GitRunner } from '@sand/git/contract'

const candidates = (branch: string) => [`refs/remotes/origin/${branch}`, `refs/remotes/upstream/${branch}`, `refs/heads/${branch}`]

export const baseRef = async (git: GitRunner, root: string, branch: string) => {
  const refs = candidates(branch)
  const out = await git.maybe(root, ['for-each-ref', '--format=%(refname)', ...refs], { read: true })
  const found = new Set(out?.split(/\r?\n/))
  return refs.find(ref => found.has(ref))
}
