import type { Session } from '@sand/chats/contract'
import { errorMessage, plural } from '@sand/util'
import type { ThreadChanges } from './contract'
import type { ChangesDeps } from './deps'
import { combine, commitAll, trackedChanges } from './git'
import { counted, splitOf, type Work, workOf } from './read'

const untitled = 'Work from a thread'

interface Squash {
  work: Work
  target: string
  tree: string
  title: string
}

const squash = async ({ git, report }: ChangesDeps, { work, target, tree, title }: Squash) => {
  const [tip] = await git.commits(work.root, [`refs/heads/${target}`])
  if (!tip) throw new Error(`Couldn't find the tip of ${target}.`)
  const combined = await combine(git, work.main, work.fork, tip, tree)
  if (combined.conflicts) return undefined
  const commit = await git.ok(work.main, ['commit-tree', combined.tree, '-p', tip, '-m', title], { what: "Couldn't make the merge commit" })
  await git.ok(work.main, ['merge', '--ff-only', '--quiet', commit], { what: "Couldn't bring the merged work into the project folder" })
  await git.ok(work.root, ['reset', '--hard', '--quiet', commit], { what: "The work is merged, but the thread's worktree couldn't catch up" }).catch(report)
  return commit
}

const attempt = async (deps: ChangesDeps, session: Session, work: Work, target: string, tree: string) => {
  const title = session.title.trim() || untitled
  try {
    await commitAll(deps.git, work.root, title)
    const commit = await squash(deps, { work, target, tree, title })
    deps.attempts.delete(session.id)
    return commit
  } catch (error) {
    deps.attempts.set(session.id, { state: 'failed', reason: errorMessage(error) })
    return undefined
  }
}

const mergeIn = async (deps: ChangesDeps, session: Session, work: Work, self: boolean) => {
  const { id } = session
  if (!self && deps.busy(id)) throw new Error('This thread is still working. Wait for it to finish, or stop it, then merge.')
  const { target } = work
  if (!target) throw new Error("The project folder isn't on a branch, so there's nothing to merge into.")
  const dirty = await trackedChanges(deps.git, work.main)
  if (dirty) throw new Error(`The project folder has uncommitted changes in ${plural(dirty, 'file')}. Commit them or put them aside, then merge again.`)
  const split = await splitOf(deps, work)
  if (!split?.files.length) throw new Error('This thread has nothing to merge.')
  const { files } = split
  const totals = counted(files)
  deps.attempts.set(id, { state: 'merging' })
  deps.show({ session: id, project: session.project, files, ...totals, state: 'merging' }).catch(deps.report)
  const commit = await attempt(deps, session, work, target, split.pending.tree)
  if (commit) {
    await deps.merged.put(id, { main: work.main, commit, files, ...totals, at: Date.now() }).catch(deps.report)
    await deps.settle(id).catch(deps.report)
  }
  return deps.changed(id)
}

export const mergeThread = async (deps: ChangesDeps, id: string, self: boolean): Promise<ThreadChanges> => {
  const session = deps.sessions.open(id)
  if (session?.kind !== 'thread') throw new Error(`There's no thread ${id} on this PC.`)
  if (deps.merged.get(id)) throw new Error('This thread is already merged.')
  const work = await workOf(deps, session.cwd)
  if (!work) throw new Error("This thread doesn't have its own worktree, so there's nothing to merge: its edits are already in its folder.")
  return deps.queue(work.main, () => mergeIn(deps, session, work, self))
}
