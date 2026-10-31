import type { Client } from '../../api/client'
import { GitHubError, isMissing } from '../../api/errors'
import type { PullRef, PullSummary } from '../../contract'
import { pullLabel, pullVariables } from '../ref'
import { type SummaryData, summaryQuery } from './query'
import { shapeSummary } from './shape'

export interface FetchedPull {
  id: string
  summary: PullSummary
}

const missing = (ref: PullRef) => new GitHubError(`Pull request ${pullLabel(ref)} doesn't exist, or this PC's GitHub sign-in can't see it.`, { status: 404 })

export const fetchPull = async (client: Client, ref: PullRef): Promise<FetchedPull> => {
  const data = await client.graphql<SummaryData>(summaryQuery, pullVariables(ref)).catch((error: unknown) => {
    throw isMissing(error) ? missing(ref) : error
  })
  const node = data.repository?.pullRequest
  if (!node) throw missing(ref)
  return { id: node.id, summary: shapeSummary(ref, node) }
}
