import { type GitWorktree, pathKey } from '@sand/git/contract'
import type { GitRunner } from '@sand/git-runner/contract'
import type { WorktreeStatus } from '../contract'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { removeCheck, tipIn } from '../remove/check'

export const liveRecords = async (deps: WorktreeDeps) => {
  await deps.store.ready()
  return deps.store.all().filter(record => !record.removed)
}

const beyondBase = async (git: GitRunner, { path, base }: WorktreeRecord) => {
  if (!base || base === 'HEAD') return undefined
  const count = await git.maybe(path, ['rev-list', '--count', 'HEAD', '--not', base, '--'], { read: true })
  return count === undefined ? undefined : Number(count)
}

const treesByRepo = async (deps: WorktreeDeps, records: WorktreeRecord[]) => {
  const mains = new Map(records.map(record => [pathKey(record.main), record.main]))
  return new Map(await Promise.all([...mains].map(async ([key, main]) => [key, await deps.repos.worktrees(main)] as const)))
}

const statusOf = async (deps: WorktreeDeps, record: WorktreeRecord, trees: GitWorktree[]): Promise<WorktreeStatus> => {
  const tip = await tipIn(deps, record, trees)
  const [check, ahead] = await Promise.all([removeCheck(deps, record, tip), tip.exists ? beyondBase(deps.git, record) : undefined])
  const { branch } = tip
  return {
    path: record.path,
    main: record.main,
    ...(branch ? { branch } : {}),
    ...(record.base ? { base: record.base } : {}),
    check,
    ...(ahead === undefined ? {} : { ahead }),
  }
}

const statuses = async (deps: WorktreeDeps) => {
  const records = await liveRecords(deps)
  const trees = await treesByRepo(deps, records)
  return Promise.all(records.map(record => statusOf(deps, record, trees.get(pathKey(record.main)) ?? [])))
}

export const worktreeStatuses = (deps: WorktreeDeps) => deps.git.background(() => statuses(deps))
