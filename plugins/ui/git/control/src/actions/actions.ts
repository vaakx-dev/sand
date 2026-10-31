import { repoOf } from '@sand/git/contract'
import { askAgent } from '../agent/ask'
import type { AgentPrompt } from '../agent/prompts'
import type { GitBaseAction, GitCommitRequest } from '../contract'
import type { ControlContext } from '../inject'
import { committedTitle, initTitle, pulledTitle, pushedTitle, pushFailedLead, switchedTitle } from '../results/titles'
import type { Runs } from '../runs/runs'
import type { StatusModel } from '../status/follow'
import { askBranchName, confirmDefaultPush } from './guard'
import { type Recovery, reportFailure, settle, type Target } from './settle'

export const createActions = (ctx: ControlContext, model: StatusModel, runs: Runs) => {
  const git = ctx.gitActions

  const target = (): Target | undefined => {
    const place = model.place.get()
    const status = model.status.get()
    return place && status ? { place, thread: model.thread.get(), status } : undefined
  }

  const recovery = (at: Target, retry: () => Promise<unknown>): Recovery => ({
    retry: () => void retry(),
    pullThenPush: () => void pullThenPush(at),
  })

  const push = async (at: Target): Promise<boolean> => {
    const { cwd, device } = at.place
    const result = await runs.perform(at.place, 'push', 'push', run => git.push({ cwd, run }, device))
    return settle(ctx, at, 'push', result, recovery(at, () => push(at)), pushedTitle) !== undefined
  }

  const pull = async (at: Target): Promise<boolean> => {
    const { cwd, device } = at.place
    const result = await runs.perform(at.place, 'pull', 'pull', run => git.pull({ cwd, run }, device))
    return settle(ctx, at, 'pull', result, recovery(at, () => pull(at)), pulledTitle) !== undefined
  }

  const pullThenPush = async (at: Target) => (await pull(at)) && push(at)

  const switchTo = async (branch: string, create: boolean, at: Target): Promise<boolean> => {
    const { cwd, device } = at.place
    const result = await runs.perform(at.place, 'switch', 'switch', run => git.switch({ cwd, run, branch, create }, device))
    return settle(ctx, at, 'switch', result, recovery(at, () => switchTo(branch, create, at)), switchedTitle) !== undefined
  }

  const init = async (at: Target): Promise<boolean> => {
    const { cwd, device } = at.place
    const result = await runs.perform(at.place, 'init', 'init', run => git.init({ cwd, run }, device))
    const started = settle(ctx, at, 'init', result, recovery(at, () => init(at)), initTitle) !== undefined
    if (started) ctx.gitStatus.rewatch(at.place)
    return started
  }

  const passGuard = async (at: Target) => {
    const local = repoOf(at.status)
    if (!local?.isDefault || !local.branch) return true
    const choice = await confirmDefaultPush(ctx, local.branch)
    if (choice !== 'branch') return choice === 'push'
    const name = await askBranchName(ctx)
    return name ? switchTo(name, true, at) : false
  }

  const guardedPush = async (at: Target) => (await passGuard(at)) && push(at)

  const committed = async (request: GitCommitRequest, at: Target) => {
    if (request.push && !(await passGuard(at))) return undefined
    const { cwd, device } = at.place
    const message = request.message?.trim() || undefined
    const input = { cwd, paths: request.paths, message, push: request.push, session: at.thread }
    const result = await runs.perform(at.place, 'commit', message ? 'stage' : 'message', run => git.commit({ ...input, run }, device))
    const done = settle(ctx, at, 'commit', result, recovery(at, () => commit(request, at)), made => (made.pushFailure ? undefined : committedTitle(made)))
    if (done?.pushFailure) reportFailure(ctx, at, 'push', done.pushFailure, recovery(at, () => push(at)), pushFailedLead(done))
    return done
  }

  const commit = async (request: GitCommitRequest, at: Target): Promise<boolean> => (await committed(request, at)) !== undefined

  const commitFully = async (request: GitCommitRequest, at: Target): Promise<boolean> => {
    const done = await committed(request, at)
    return done !== undefined && !done.pushFailure
  }

  const writeMessage = async (paths: string[] | undefined, at: Target): Promise<string | undefined> => {
    const { cwd, device } = at.place
    const result = await runs.perform(at.place, 'message', 'message', run => git.message({ cwd, run, paths, session: at.thread }, device))
    return settle(ctx, at, 'message', result, recovery(at, () => writeMessage(paths, at)))?.message
  }

  const run = (next: GitBaseAction, at: Target) => {
    if (next.id === 'commit') return commit({ push: false }, at)
    if (next.id === 'commit-push') return commit({ push: true }, at)
    if (next.id === 'push') return guardedPush(at)
    if (next.id === 'pull') return pull(at)
    return Promise.resolve(false)
  }

  const withTarget =
    <A extends unknown[], R>(act: (...args: [...A, Target]) => Promise<R>) =>
    (...args: A) => {
      const at = target()
      return at ? act(...args, at) : Promise.resolve(undefined)
    }

  return {
    target,
    run: withTarget(run),
    commit: withTarget(commit),
    commitFully: withTarget(commitFully),
    push: withTarget(guardedPush),
    pull: withTarget(pull),
    switchTo: withTarget(switchTo),
    init: withTarget(init),
    writeMessage: withTarget(writeMessage),
    ask: (prompt: AgentPrompt) => askAgent(ctx, model.thread.get(), prompt),
  }
}

export type Actions = ReturnType<typeof createActions>
