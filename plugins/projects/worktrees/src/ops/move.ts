import type { MoveRequest, MoveResult } from '../contract'
import { plural } from '@sand/kit'
import { existsSync } from 'node:fs'
import { branchExists, changedCount, repoOf, within } from '../git/repo'
import { gitOk } from '../git/run'
import { addWorktree, carryChanges, markNamed, removeWorktree } from '../git/worktree'
import { fromTitle } from '../slug'
import { locate } from '../place'
import { readSetup } from '../setup/file'
import { setupSteps } from '../setup/plan'
import { runSteps, type Step } from '../setup/steps'
import { relocate } from './relocate'
import { forgetMarks } from './marks'
import { idle, openSession, type Ops } from './types'

const noSetup = { copy: [], run: [], autoSettle: true }

export const moveSession = async (ops: Ops, request: MoveRequest): Promise<MoveResult> => {
  const session = openSession(ops, request.session)
  idle(ops, session.id)
  const repo = await repoOf(session.cwd)
  if (!repo) throw new Error("This thread's folder isn't in a git repository")
  const branch = String(request.branch ?? '').trim()
  await gitOk(repo.root, ['check-ref-format', '--branch', branch])
  if (await branchExists(repo.root, branch)) throw new Error(`The branch ${branch} already exists`)
  const path = locate(ops.config.location, repo.main, repo.name, branch)
  if (existsSync(path)) throw new Error(`${path} already exists`)
  const base = String(request.base ?? '').trim() || repo.branch || 'HEAD'
  const changed = request.carry === false ? 0 : await changedCount(repo.root)
  const setup = request.setup === false ? noSetup : await readSetup([repo.main, repo.root], ops.config.auto_settle)
  const target = within(repo.root, session.cwd, path)
  const why = `This thread moved to a git worktree on branch ${branch}, based on ${base}.${changed ? ' The uncommitted changes moved with it.' : ''}`
  const switchThread = () => relocate(session, target, why)

  const create: Step = {
    label: `Create worktree on ${branch}`,
    async run() {
      await addWorktree(repo.root, branch, path, base)
      if (fromTitle(branch, session.title)) await markNamed(repo.root, branch)
      if (!changed) switchThread()
    },
  }
  const carry: Step = {
    label: `Move ${plural(changed, 'changed file')}`,
    async run() {
      try {
        await carryChanges(repo.root, path, `sand: move to ${branch}`)
      } catch (error) {
        await removeWorktree(repo.main, path, branch, true).catch(() => {})
        throw error
      }
      switchThread()
    },
  }
  const core = changed ? [create, carry] : [create]
  const outcome = await runSteps(session.id, [...core, ...setupSteps(setup, repo.main, path)], ops.publish)
  forgetMarks()
  ops.changed(repo.main)
  if (outcome.failed !== undefined && outcome.failed < core.length) throw new Error(outcome.error)
  return { path, branch }
}
