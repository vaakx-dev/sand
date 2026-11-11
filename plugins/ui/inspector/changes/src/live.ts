import { changesLive, type ChangesLive } from '@sand/changes/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { gitLive, type GitLive, repoOf } from '@sand/git/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

interface Counts {
  files: number
  add: number
  del: number
}

export const liveChanges = (ctx: Context) => {
  const git = sig<GitLive | undefined>(undefined)
  const threads = sig<ChangesLive | undefined>(undefined)
  ctx.watch(gitLive, found => git.set(found))
  ctx.watch(changesLive, found => threads.set(found))

  return ({ session, device, cwd }: Subject): Counts | undefined => {
    const local = cwd ? repoOf(git.get()?.status(device, cwd)) : undefined
    if (!local) return undefined
    const merging = threads.get()
    if (!local.worktree || !merging) return { files: local.fileCount, add: local.add, del: local.del }
    const changes = merging.get(session, device)
    return changes && { files: changes.files.length, add: changes.add, del: changes.del }
  }
}
