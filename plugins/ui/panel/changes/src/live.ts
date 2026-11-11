import { changesLive, type ChangesLive, changesPatch } from '@sand/changes/contract'
import type { Subject } from '@sand/ui-shell/contract'
import type { Wire } from '@sand/devices-contract'
import { type DiffFile, type DiffPatch, gitPatch } from '@sand/git-diff/contract'
import { gitLive, type GitLive, repoOf } from '@sand/git/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export interface Changes {
  files: DiffFile[]
  patch(file: DiffFile): Promise<DiffPatch>
}

export const liveChanges = (ctx: Context, link: Wire) => {
  const git = sig<GitLive | undefined>(undefined)
  const threads = sig<ChangesLive | undefined>(undefined)
  ctx.watch(gitLive, found => git.set(found))
  ctx.watch(changesLive, found => threads.set(found))

  return ({ session, device, cwd }: Subject): Changes | undefined => {
    if (!cwd) return undefined
    const local = repoOf(git.get()?.status(device, cwd))
    if (!local) return undefined
    const merging = threads.get()
    if (!local.worktree || !merging) {
      return { files: local.files, patch: ({ path, from }) => link.call(gitPatch, { cwd, scope: { kind: 'uncommitted' }, path, from }, device) }
    }
    const changes = merging.get(session, device)
    return changes && { files: changes.files, patch: ({ path, from }) => link.call(changesPatch, { session, path, from }, device) }
  }
}
