import type { SourceInfo } from '@sand/accounts/contract'
import type { Settings } from '@sand/settings/contract'
import { errorMessage } from '@sand/util'
import type { Pulse } from '@sand/reactive'
import { sig } from '@vaakx-dev/vrui'
import type { PanelContext } from '../context'

export const LIST = 'models'

export const FAVOURITES = 'models-favourites'

export const sourcePageId = (id: string) => `models-source:${id}`

export const createPage = (ctx: PanelContext, changes: Pulse, settings: Settings) => {
  const problem = sig('')

  const fail = (error: unknown) => problem.set(errorMessage(error))

  const call = <T>(work: () => Promise<T>) => {
    problem.set('')
    return work()
  }

  const run = <T>(work: () => Promise<T>) => call(work).catch(fail)

  const source = (id: string): SourceInfo | undefined => ctx.models.sources().find(found => found.id === id)

  return { ctx, catalog: ctx.modelPicker.catalog, changes, problem, fail, call, run, source, go: (id: string) => settings.open(id) }
}

export type Page = ReturnType<typeof createPage>
