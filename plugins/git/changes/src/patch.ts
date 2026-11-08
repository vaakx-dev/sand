import type { InputOf } from '@sand/host-hub/contract'
import type { changesPatch } from './contract'
import type { ChangesDeps } from './deps'
import { workOf } from './read'

export const patchOf = async (deps: ChangesDeps, { session, path, from }: InputOf<typeof changesPatch>) => {
  const merged = deps.merged.get(session)
  if (merged) return deps.diffs.patch({ cwd: merged.main, scope: { kind: 'commit', commit: merged.commit }, path, from })
  const work = await workOf(deps, deps.sessions.require(session).cwd)
  if (!work) throw new Error("This thread doesn't have its own worktree, so it has no changes to show.")
  return deps.diffs.patch({ cwd: work.root, scope: { kind: 'all', base: work.fork }, path, from })
}
