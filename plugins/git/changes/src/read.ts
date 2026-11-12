import type { DiffList } from '@sand/git-diff/contract'
import type { ThreadChanges } from './contract'
import type { ChangesDeps } from './deps'
import { type Branches, branchesOf, combine, forkPoint, snapshot } from './git'

export interface Work {
  root: string
  main: string
  target?: string
  tip?: string
  fork: string
}

const forkRefs = ({ upstreams }: Branches, target: string | undefined, defaultBranch: string | undefined) => {
  const own = target ? [`refs/heads/${target}`, upstreams.get(`refs/heads/${target}`)] : []
  const base = defaultBranch ? [`refs/remotes/origin/${defaultBranch}`, `refs/heads/${defaultBranch}`] : []
  return [...own, ...base].filter(ref => ref !== undefined)
}

export const workOf = async ({ git, repos }: ChangesDeps, cwd: string): Promise<Work | undefined> => {
  const layout = await repos.layout(cwd)
  if (!layout?.worktree) return undefined
  const [branches, defaultBranch] = await Promise.all([branchesOf(git, layout.main), repos.defaultBranch(layout.main)])
  const target = branches.current
  const commits = forkRefs(branches, target, defaultBranch).flatMap(ref => branches.commits.get(ref) ?? [])
  const fork = await forkPoint(git, layout.root, commits)
  const tip = target && branches.commits.get(`refs/heads/${target}`)
  return fork ? { root: layout.root, main: layout.main, target, ...(tip && { tip }), fork } : undefined
}

export const diffOf = (deps: ChangesDeps, work: Work) => deps.diffs.list(work.root, { kind: 'since', commit: work.fork })

const clash = (paths: string[]) => `These files changed in the project too and don't merge cleanly: ${paths.join(', ')}`

const conflictsOf = async ({ git }: ChangesDeps, { root, main, tip, fork }: Work) => {
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
