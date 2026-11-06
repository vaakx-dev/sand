import type { InboxView } from '@sand/pull-inbox/contract'
import { addressParams, updateAddress } from '@sand/web-client/contract'

export type StateFilter = 'open' | 'merged' | 'closed' | 'all'

export interface PageQuery {
  view: InboxView
  state: StateFilter
  project: string
  q: string
  pull?: string
}

const keys = { view: 'pulls', state: 'pullState', project: 'pullProject', q: 'pullQuery', pull: 'pull' } as const

const views: InboxView[] = ['needs', 'mine', 'reviewing', 'all']

const states: StateFilter[] = ['open', 'merged', 'closed', 'all']

const pick = <T extends string>(choices: T[], value: string | undefined, fallback: T) => choices.find(choice => choice === value) ?? fallback

export const defaultQuery: PageQuery = { view: 'needs', state: 'open', project: '', q: '' }

export const requestedQuery = (): PageQuery | undefined => {
  const params = addressParams()
  const view = params[keys.view]
  if (!view) return undefined
  return {
    view: pick(views, view, 'needs'),
    state: pick(states, params[keys.state], 'open'),
    project: params[keys.project] ?? '',
    q: params[keys.q] ?? '',
    pull: params[keys.pull],
  }
}

const paramsOf = (query: PageQuery) => ({
  [keys.view]: query.view,
  [keys.state]: query.state === 'open' ? undefined : query.state,
  [keys.project]: query.project || undefined,
  [keys.q]: query.q || undefined,
  [keys.pull]: query.pull,
})

export const recordQuery = (query: PageQuery) => updateAddress(paramsOf(query))

export const forgetQuery = () => updateAddress(Object.fromEntries(Object.values(keys).map(key => [key, undefined])))
