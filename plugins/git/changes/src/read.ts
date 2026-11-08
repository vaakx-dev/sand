import type { GitBase } from '@sand/git/contract'
import type { DiffList } from '@sand/git-diff/contract'
import type { ThreadChanges } from './contract'
import type { ChangesDeps } from './deps'
import { branchOf, combine, commitOf, forkPoint, snapshot } from './git'

export interface Work {
  root: string
  main: string
  target?: string
  fork: string
}

const forkRefs = (target: string | undefined, base: GitBase | undefined) => [
  ...(target ? [`refs/heads/${target}`, `refs/heads/${target}@{upstream}`] : []),
  ...(base ? [base.ref, `refs/heads/${base.branch}`] : []),
]

export const workOf = async ({ git, repos }: ChangesDeps, cwd: string): Promise<Work | undefined> => {
  const layout = await repos.layout(cwd)
  if (!layout?.worktree) return undefined
  const [target, base] = await Promise.all([branchOf(git, layout.main), repos.base(layout.main)])
  const fork = await forkPoint(git, layout.root, forkRefs(target, base))
  return fork ? { root: layout.root, main: layout.main, target, fork } : undefined
}

export const diffOf = (deps: ChangesDeps, work: Work) => deps.diffs.list(work.root, { kind: 'all', base: work.fork })

const clash = (paths: string[]) => `These files changed in the project too and don't merge cleanly: ${paths.join(', ')}`

const conflictsOf = async ({ git }: ChangesDeps, { root, main, target, fork }: Work) => {
  const tip = target && (await commitOf(git, main, `refs/heads/${target}`))
  if (!tip) return []
  return (await combine(git, main, fork, tip, await snapshot(git, root))).conflicts ?? []
}

const counted = (diff: DiffList | undefined) => ({ files: diff?.files ?? [], add: diff?.add ?? 0, del: diff?.del ?? 0 })

const liveState = async (deps: ChangesDeps, id: string, work: Work | undefined, hasFiles: boolean): Promise<Pick<ThreadChanges, 'state' | 'reason'>> => {
  const attempt = deps.attempts.get(id)
  if (attempt) return attempt
  if (!work || !hasFiles || deps.busy(id)) return { state: 'none' }
  const conflicts = await conflictsOf(deps, work)
  return conflicts.length ? { state: 'conflict', reason: clash(conflicts) } : { state: 'ready' }
}

export const readChanges = async (deps: ChangesDeps, id: string): Promise<ThreadChanges> => {
  const session = deps.sessions.require(id)
  const merged = deps.merged.get(id)
  if (merged) return { session: id, project: session.project, state: 'merged', files: merged.files, add: merged.add, del: merged.del, commit: merged.commit }
  const work = await workOf(deps, session.cwd)
  const changes = counted(work && (await diffOf(deps, work)))
  return { session: id, project: session.project, ...changes, ...(await liveState(deps, id, work, changes.files.length > 0)) }
}
