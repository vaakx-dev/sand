import type { Client } from '../api/client'
import { GitHubError } from '../api/errors'
import type { PullSummary } from '../contract'
import { type BranchPlace, branchPlace, type PlaceDeps } from '../repo/place'
import type { Summaries } from './cache'

export interface CreateRequest {
  cwd: string
  title: string
  body: string
  base?: string
  draft?: boolean
  session?: string
}

const sameRepo = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const headFor = (place: BranchPlace) => (sameRepo(place.head.repo, place.base) ? place.head.branch : `${place.head.repo.split('/')[0]}:${place.head.branch}`)

const createError = (error: unknown, place: BranchPlace) => {
  if (!(error instanceof GitHubError)) return error
  if (error.status === 422 && /head\b.*invalid/i.test(error.message))
    return new GitHubError(`GitHub has no branch ${place.head.branch} on ${place.head.repo}; push the branch first.`, { status: 422 })
  return new GitHubError(`Couldn't create the pull request. ${error.message}`, error)
}

export const createPull = async (deps: PlaceDeps & { client: Client }, summaries: Summaries, request: CreateRequest): Promise<PullSummary> => {
  const found = await branchPlace(deps, request.cwd)
  if (!found.ok) throw new GitHubError(found.reason)
  const { place } = found
  const base = request.base ?? (await deps.infos(place.base)).defaultBranch
  if (sameRepo(place.head.repo, place.base) && place.head.branch === base) throw new GitHubError(`${base} is the base branch; switch to a new branch for the pull request first.`)
  const created = await deps.client
    .rest<{ number: number }>('POST', `/repos/${place.base}/pulls`, { title: request.title, body: request.body, head: headFor(place), base, draft: request.draft ?? false })
    .catch((error: unknown) => {
      throw createError(error, place)
    })
  return summaries.refresh({ repo: place.base, number: created.number })
}
