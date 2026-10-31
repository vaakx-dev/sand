import type { InputOf } from '@sand/host-hub/contract'
import type { pullsInbox } from '../contract'
import type { Source } from './page'
import { searchText } from './text'

export type InboxQuery = InputOf<typeof pullsInbox>
type StateFilter = NonNullable<InboxQuery['state']>

const stateTerms: Record<StateFilter, string> = {
  open: 'is:open',
  merged: 'is:merged',
  closed: 'is:closed is:unmerged',
  all: '',
}

const repoName = /^[\w.-]+\/[\w.-]+$/

const repoTerm = (repo: string) => {
  const name = repo.trim()
  if (!repoName.test(name)) throw new Error(`"${repo}" isn't a GitHub repository name like owner/name.`)
  return `repo:${name}`
}

const filterTerms = (query: InboxQuery) => {
  const state = query.view === 'needs' ? 'open' : (query.state ?? 'open')
  const repos = [...new Set(query.repos ?? [])].sort().map(repoTerm)
  return [stateTerms[state], ...repos, searchText(query.q)]
}

export const sourcesFor = (query: InboxQuery): Source[] => {
  const filters = filterTerms(query)
  const source = (who: string, requested = false): Source => ({
    search: ['is:pr', who, ...filters, 'sort:updated-desc'].filter(Boolean).join(' '),
    requested,
  })
  if (query.view === 'needs') return [source('review-requested:@me', true), source('author:@me')]
  if (query.view === 'reviewing') return [source('review-requested:@me', true), source('reviewed-by:@me -author:@me')]
  if (query.view === 'mine') return [source('author:@me')]
  return [source('involves:@me')]
}
