import type { InboxView } from '@sand/pull-inbox/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import { defaultQuery, type PageQuery, type StateFilter } from './query'

export const queryState = () => {
  const view = sig<InboxView>(defaultQuery.view)
  const state = sig<StateFilter>(defaultQuery.state)
  const project = sig(defaultQuery.project)
  const q = sig(defaultQuery.q)
  const pull = sig<string | undefined>(undefined)

  const load = (query: PageQuery) =>
    batch(() => {
      view.set(query.view)
      state.set(query.state)
      project.set(query.project)
      q.set(query.q)
      pull.set(query.pull)
    })

  const current = (): PageQuery => ({ view: view.get(), state: state.get(), project: project.get(), q: q.get(), pull: pull.get() })

  return { view, state, project, q, pull, load, current }
}

export type QueryState = ReturnType<typeof queryState>
