import { errorMessage } from '@sand/util'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { WorktreeDeps } from '../deps'
import type { PlannedStep, WorktreeRecord } from '../records/schema'
import { gitStep, longGitMs } from '../repo/run'
import { planSteps } from '../setup/plan'
import { doneStep, freshSetup } from '../setup/state'
import { freePlace } from './place'
import { rolledBack } from './rollback'

export interface NewWorktree {
  main: string
  start: string
  base: string
  branch?: string
  steps: PlannedStep[]
}

export const createWorktree = async (deps: WorktreeDeps, { main, start, base, branch, steps }: NewWorktree): Promise<WorktreeRecord> => {
  const place = await freePlace(deps.git, deps.folder, main, deps.prefix)
  const name = branch ?? place.branch
  const plan = await planSteps(main)
  await mkdir(dirname(place.path), { recursive: true })
  await gitStep(deps.git, main, ['worktree', 'add', '--no-track', '-b', name, place.path, start], "Couldn't create the worktree", { timeoutMs: longGitMs })
  const record: WorktreeRecord = {
    id: crypto.randomUUID(),
    path: place.path,
    main,
    branch: name,
    base,
    sessions: [],
    created: Date.now(),
    ...(branch ? {} : { temp: name }),
    setup: freshSetup(place.path, [...steps, doneStep('create', `Create ${place.path}`), ...plan]),
  }
  try {
    await deps.store.put(record)
  } catch (error) {
    throw await rolledBack(error, () => discardWorktree(deps, record))
  }
  return record
}

export const discardWorktree = async (deps: WorktreeDeps, record: WorktreeRecord) => {
  const problems: string[] = []
  const attempt = (args: string[]) =>
    deps.git.run(record.main, args, { timeoutMs: longGitMs }).then(result => {
      if (result.code !== 0) problems.push(deps.git.classify(result, args).message)
    })
  await attempt(['worktree', 'remove', '--force', record.path])
  if (record.branch) await attempt(['branch', '-D', record.branch])
  await deps.store.delete(record.path).catch(error => problems.push(errorMessage(error)))
  if (problems.length) throw new Error(`Couldn't clean up the new worktree at ${record.path}: ${problems.join('; ')}`)
}
