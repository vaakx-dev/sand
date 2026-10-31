import type { Client } from '../../api/client'
import { GitHubError } from '../../api/errors'
import type { PullRef, PullSummary } from '../../contract'
import { ownerAndName, refLabel } from '../ref'
import { type SummaryData, summaryQuery } from './query'
import { shapeSummary } from './shape'

export interface FetchedPull {
  id: string
  summary: PullSummary
}

const missing = (ref: PullRef) => new GitHubError(`Pull request ${refLabel(ref)} doesn't exist, or this PC's GitHub sign-in can't see it.`, 404)

export const fetchPull = async (client: Client, ref: PullRef): Promise<FetchedPull> => {
  const data = await client.graphql<SummaryData>(summaryQuery, { ...ownerAndName(ref.repo), number: ref.number }).catch((error: unknown) => {
    if (error instanceof GitHubError && error.kind === 'NOT_FOUND') throw missing(ref)
    throw error
  })
  const node = data.repository?.pullRequest
  if (!node) throw missing(ref)
  return { id: node.id, summary: shapeSummary(ref, node) }
}
