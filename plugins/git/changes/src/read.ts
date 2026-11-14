import type { DiffFile } from '@sand/git-diff/contract'
import type { Session } from '@sand/chats/contract'
import type { ThreadChanges } from './contract'
import type { ChangesDeps } from './deps'
import { type Branches, branchesOf, combine, forkPoint, type Pending, pendingOf } from './git'

export interface Work {
  root: string
  main: string
  target?: string
  tip?: string
  fork: string
  bases: string[]
}

export interface Split {
  pending: Pending
  files: DiffFile[]
  landed: DiffFile[]
}

type State = Pick<ThreadChanges, 'state' | 'reason' | 'clashes'>

const none: State = { state: 'none' }

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
  const bases = forkRefs(branches, target, defaultBranch).flatMap(ref => branches.commits.get(ref) ?? [])
  const fork = await forkPoint(git, layout.root, bases)
  const tip = target && branches.commits.get(`refs/heads/${target}`)
  return fork ? { root: layout.root, main: layout.main, target, ...(tip && { tip }), fork, bases } : undefined
}

export const counted = (files: DiffFile[]) => ({ add: files.reduce((sum, file) => sum + file.add, 0), del: files.reduce((sum, file) => sum + file.del, 0) })

export const splitOf = async (deps: ChangesDeps, work: Work): Promise<Split | undefined> => {
  const diff = await deps.diffs.list(work.root, { kind: 'since', commit: work.fork })
  if (!diff.files.length) return undefined
  const pending = await pendingOf(deps.git, work)
  const files = diff.files.filter(file => !pending.landed.has(file.path))
  const landed = diff.files.filter(file => pending.landed.has(file.path))
  return { pending, files, landed }
}

const clash = (paths: string[]) => `These files changed in the project too and don't merge cleanly: ${paths.join(', ')}`

const conflictsOf = async ({ git }: ChangesDeps, { main, tip, fork }: Work, { tree }: Pending) => {
  if (!tip) return []
  return (await combine(git, main, fork, tip, tree)).conflicts
}

const liveState = async (deps: ChangesDeps, session: Session, work: Work, split: Split): Promise<State> => {
  const attempt = deps.attempts.get(session.id)
  if (attempt) return attempt
  if (!split.files.length) return split.landed.length ? { state: 'merged' } : none
  if (session.archived !== null || deps.busy(session.id)) return none
  const conflicts = await conflictsOf(deps, work, split.pending)
  return conflicts.length ? { state: 'conflict', reason: clash(conflicts), clashes: conflicts } : { state: 'ready' }
}

const unchanged = { files: [], add: 0, del: 0, ...none }

const workChanges = async (deps: ChangesDeps, session: Session, work: Work | undefined) => {
  const split = work && (await splitOf(deps, work))
  if (!work || !split) return unchanged
  const state = await liveState(deps, session, work, split)
  const files = state.state === 'merged' ? split.landed : split.files
  return { files, ...counted(files), ...state }
}

export const readChanges = async (deps: ChangesDeps, id: string): Promise<ThreadChanges> => {
  const session = deps.sessions.require(id)
  const merged = deps.merged.get(id)
  if (merged) return { session: id, project: session.project, state: 'merged', files: merged.files, add: merged.add, del: merged.del, commit: merged.commit }
  return { session: id, project: session.project, ...(await workChanges(deps, session, await workOf(deps, session.cwd))) }
}
