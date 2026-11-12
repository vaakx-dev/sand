import type { SourceInfo } from '@sand/accounts/contract'
import { errorMessage } from '@sand/util'
import type { Pulse } from '@sand/reactive'
import { sig } from '@vaakx-dev/vrui'
import type { PanelContext } from '../context'
import type { Slots } from './slots'

export type View = { kind: 'top' } | { kind: 'favourites' } | { kind: 'source'; id: string }

export const createPage = (ctx: PanelContext, changes: Pulse, slots: Slots) => {
  const problem = sig('')
  const view = sig<View>({ kind: 'top' })

  const fail = (error: unknown) => problem.set(errorMessage(error))

  const call = <T>(work: () => Promise<T>) => {
    problem.set('')
    return work()
  }

  const run = <T>(work: () => Promise<T>) => call(work).catch(fail)

  const source = (id: string): SourceInfo | undefined => ctx.models.sources().find(found => found.id === id)

  return { ctx, catalog: ctx.modelPicker.catalog, changes, slots, problem, view, fail, call, run, source, go: (next: View) => view.set(next) }
}

export type Page = ReturnType<typeof createPage>
