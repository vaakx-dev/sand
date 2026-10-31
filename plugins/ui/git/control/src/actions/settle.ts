import { pcs } from '@sand/devices-contract'
import type { GitAction, GitActionFailure, GitActionResult } from '@sand/git-actions/contract'
import { type GitPlace, type GitStatus, placeKey } from '@sand/git/contract'
import { askAgent, canAsk } from '../agent/ask'
import type { ControlContext } from '../inject'
import { upstreamName } from '../next/facts'
import { failureSteps } from '../results/steps'

export interface Target {
  place: GitPlace
  thread?: string
  status: GitStatus
}

export interface Recovery {
  retry(): void
  pullThenPush(): void
}

const toastId = (place: GitPlace) => `git-control:${placeKey(place)}`

export const failed = <T>(result: GitActionResult<T>): result is GitActionFailure => result.ok === false

export const settle = <T>(
  ctx: ControlContext,
  at: Target,
  action: GitAction,
  result: GitActionResult<T> | undefined,
  recovery: Recovery,
  success?: (done: T) => string | undefined,
): T | undefined => {
  if (!result) return undefined
  if (failed(result)) {
    reportFailure(ctx, at, action, result, recovery)
    return undefined
  }
  const title = success?.(result)
  if (title) ctx.toasts.show({ id: toastId(at.place), tone: 'success', title })
  return result
}

export const reportFailure = (ctx: ControlContext, at: Target, action: GitAction, failure: GitActionFailure, recovery: Recovery, lead?: string) => {
  const remote = at.status.remote
  const note = failureSteps(failure, {
    action,
    pc: ctx.get(pcs)?.name(at.place.device) ?? 'this PC',
    upstream: remote ? upstreamName(remote) : 'the remote',
    retry: recovery.retry,
    pullThenPush: recovery.pullThenPush,
    ask: canAsk(ctx, at.thread) ? prompt => askAgent(ctx, at.thread, prompt) : undefined,
  })
  ctx.toasts.show({
    id: toastId(at.place),
    tone: 'danger',
    sticky: true,
    title: lead ? `${lead} ${failure.message}` : failure.message,
    detail: note.detail,
    output: failure.output,
    actions: note.actions,
  })
}
