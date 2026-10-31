import type { GitHub, PullRef } from '@sand/github/contract'
import type { PullDetail } from '../contract'
import type { Details } from '../detail/cache'
import type { LoadedPull } from '../detail/fetch'
import { refusal } from '../errors/refusal'

export interface ActionDeps {
  github: GitHub
  details: Details
  changed(ref: PullRef): void
  report(error: unknown): void
}

export interface Action<I> {
  doing: string | ((input: I) => string)
  fresh?: boolean
  refuse?(pull: LoadedPull, input: I): string | undefined
  needed?(pull: LoadedPull, input: I): boolean
  run(github: GitHub, pull: LoadedPull, input: I): Promise<unknown>
}

export const settle = async (deps: ActionDeps, ref: PullRef): Promise<PullDetail> => {
  deps.details.drop(ref)
  let shown: PullRef = ref
  try {
    const { detail } = await deps.details.refresh(ref)
    shown = detail
    return detail
  } finally {
    deps.changed({ repo: shown.repo, number: shown.number })
  }
}

export const perform = async <I>(deps: ActionDeps, action: Action<I>, ref: PullRef, input: I): Promise<PullDetail> => {
  const pull = await deps.details.get(ref, action.fresh)
  const reason = action.refuse?.(pull, input)
  if (reason) throw new Error(reason)
  if (action.needed && !action.needed(pull, input)) return pull.detail
  await action.run(deps.github, pull, input).catch((error: unknown) => {
    const doing = typeof action.doing === 'string' ? action.doing : action.doing(input)
    throw refusal(doing, pull.detail, error)
  })
  return settle(deps, ref)
}
