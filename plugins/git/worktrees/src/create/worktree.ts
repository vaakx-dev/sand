import { errorMessage } from '@sand/util'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { WorktreeDeps } from '../deps'
import type { WorktreeRecord } from '../records/schema'
import { branchExists } from '../repo/refs'
import { longGitMs } from '../repo/timeout'
import { planSteps } from '../setup/plan'
import { doneStep, freshSetup } from '../setup/state'
import { freePlace } from './place'
import { rolledBack } from './rollback'

export interface NewWorktree {
  main: string
  start: string
  base: string
  branch?: string
}

export interface BranchWorktree {
  main: string
  branch: string
  base?: string
}

interface Addition {
  main: string
  path: string
  args: string[]
  branch: string
  base?: string
  temp?: string
  adopted?: true
}

const addWorktree = async (deps: WorktreeDeps, addition: Addition): Promise<WorktreeRecord> => {
  const { main, path, args, branch, base, temp, adopted } = addition
  const plan = await planSteps(main)
  await mkdir(dirname(path), { recursive: true })
  await deps.git.ok(main, ['worktree', 'add', ...args], { timeoutMs: longGitMs, what: "Couldn't create the worktree" })
  const record: WorktreeRecord = {
    id: crypto.randomUUID(),
    path,
    main,
    branch,
    ...(base ? { base } : {}),
    sessions: [],
    created: Date.now(),
    ...(temp ? { temp } : {}),
    ...(adopted ? { adopted } : {}),
    setup: freshSetup(path, [doneStep('create', `Create ${path}`), ...plan]),
  }
  try {
    await deps.store.put(record)
  } catch (error) {
    throw await rolledBack(error, () => discardWorktree(deps, record))
  }
  return record
}

export const createWorktree = async (deps: WorktreeDeps, { main, start, base, branch }: NewWorktree): Promise<WorktreeRecord> => {
  const place = await freePlace(deps.git, deps.folder, main, deps.prefix)
  const name = branch ?? place.branch
  return addWorktree(deps, {
    main,
    path: place.path,
    args: ['--no-track', '-b', name, place.path, start],
    branch: name,
    base,
    ...(branch ? {} : { temp: name }),
  })
}

export const branchWorktree = async (deps: WorktreeDeps, { main, branch, base }: BranchWorktree): Promise<WorktreeRecord> => {
  if (!(await branchExists(deps.git, main, branch))) throw new Error(`There's no local branch called ${branch}.`)
  const place = await freePlace(deps.git, deps.folder, main, deps.prefix)
  return addWorktree(deps, {
    main,
    path: place.path,
    args: [place.path, branch],
    branch,
    ...(base ? { base } : {}),
    adopted: true,
  })
}

export const discardWorktree = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  const problems: string[] = []
  const attempt = (args: string[]) =>
    deps.git.run(record.main, args, { timeoutMs: longGitMs }).then(result => {
      if (result.code !== 0) problems.push(deps.git.classify(result, args).message)
    })
  await attempt(['worktree', 'remove', '--force', record.path])
  if (record.branch && !record.adopted) await attempt(['branch', '-D', record.branch])
  await deps.store.delete(record.path).catch(error => problems.push(errorMessage(error)))
  if (problems.length) throw new Error(`Couldn't clean up the new worktree at ${record.path}: ${problems.join('; ')}`)
}
