import type { SourceInfo } from '@sand/accounts/contract'
import type { Request } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { Pulse } from '@sand/web-client/reactive'
import { sig } from '@vaakx-dev/vrui'
import type { PanelContext } from '../context'

export type View = { kind: 'top' } | { kind: 'favourites' } | { kind: 'source'; id: string }

export const createPage = (ctx: PanelContext, changes: Pulse) => {
  const problem = sig('')
  const view = sig<View>({ kind: 'top' })

  const fail = (error: unknown) => problem.set(errorMessage(error))

  const call = <I, O>(request: Request<I, O>, input: I) => {
    problem.set('')
    return ctx.wire.call(request, input)
  }

  const run = <I, O>(request: Request<I, O>, input: I) => call(request, input).catch(fail)

  const source = (id: string): SourceInfo | undefined => ctx.models.sources().find(found => found.id === id)

  return { ctx, changes, problem, view, fail, call, run, source, go: (next: View) => view.set(next) }
}

export type Page = ReturnType<typeof createPage>
