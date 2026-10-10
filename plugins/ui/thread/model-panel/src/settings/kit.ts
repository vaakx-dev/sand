import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import { errorMessage, sig, type Pulse } from '@sand/dom'
import type { PanelContext } from '../actions'

type Request = Parameters<NonNullable<PanelContext['wire']>['call']>[0]

export type View = { kind: 'top' } | { kind: 'favourites' } | { kind: 'source'; id: string }

export const createKit = (ctx: PanelContext, changes: Pulse) => {
  const problem = sig('')
  const view = sig<View>({ kind: 'top' })

  const fail = (error: unknown) => {
    const text = errorMessage(error)
    if (ctx.notify) ctx.notify.push(text, { level: 'error' })
    else problem.set(text)
  }

  const call = <T = void>(request: Request) => {
    if (!ctx.wire) return Promise.reject(new Error('Not connected to sand'))
    problem.set('')
    return ctx.wire.call<T>(request)
  }

  const run = (request: Request) => call(request).catch(fail)

  const source = (id: string): SourceInfo | undefined => ctx.models.sources().find(found => found.id === id)

  const sourceLabel = (model: ModelInfo) => source(model.source ?? '')?.label ?? model.source ?? ''

  return { ctx, changes, problem, view, fail, call, run, source, sourceLabel, go: (next: View) => view.set(next) }
}

export type Kit = ReturnType<typeof createKit>
