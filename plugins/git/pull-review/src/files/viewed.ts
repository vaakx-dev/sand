import type { GitHub, PullRef } from '@sand/github/contract'
import type { ViewedState } from '../contract'
import { pullVariables, refLabel } from '../pull/ref'

const query = `query PullViewed($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      headRefOid
      files(first: 100, after: $after) {
        nodes { path viewerViewedState }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`

type GitHubViewed = 'VIEWED' | 'UNVIEWED' | 'DISMISSED'

interface ViewedData {
  repository: {
    pullRequest: {
      id: string
      headRefOid: string
      files: { nodes: { path: string; viewerViewedState: GitHubViewed }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } | null
    } | null
  } | null
}

export interface PullViewed {
  id: string
  head: string
  states: Map<string, ViewedState>
}

const maxPages = 30

const stateOf = (viewed: GitHubViewed): ViewedState => {
  if (viewed === 'VIEWED') return 'viewed'
  if (viewed === 'DISMISSED') return 'changed'
  return 'unviewed'
}

const readPage = async (github: GitHub, ref: PullRef, after: string | null) => {
  const data = await github.graphql<ViewedData>(query, { ...pullVariables(ref), after })
  const pull = data.repository?.pullRequest
  if (!pull) throw new Error(`GitHub couldn't find ${refLabel(ref)}.`)
  return pull
}

export const readViewed = async (github: GitHub, ref: PullRef): Promise<PullViewed> => {
  const states = new Map<string, ViewedState>()
  const first = await readPage(github, ref, null)
  let pull = first
  for (let page = 1; ; page++) {
    for (const file of pull.files?.nodes ?? []) states.set(file.path, stateOf(file.viewerViewedState))
    const after = pull.files?.pageInfo.hasNextPage ? pull.files.pageInfo.endCursor : null
    if (!after || page >= maxPages) return { id: first.id, head: first.headRefOid, states }
    pull = await readPage(github, ref, after)
  }
}
