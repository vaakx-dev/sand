import { oneLine } from '@sand/util'
import { GitHubError } from '../api/errors'
import type { PullSummary } from '../contract'
import { type PlaceDeps, pullRepo } from '../repo/place'
import type { Summaries } from './cache'
import { parsePullRef } from './parse'

export const resolvePull = async (deps: PlaceDeps, summaries: Summaries, cwd: string, text: string): Promise<PullSummary> => {
  const parsed = parsePullRef(text)
  if (!parsed) throw new GitHubError(`"${oneLine(text, 80)}" isn't a pull request link or number.`)
  const repo = parsed.repo ?? (await pullRepo(deps, cwd))
  if (!repo) throw new GitHubError(`This folder's remote isn't on GitHub, so #${parsed.number} doesn't point anywhere; paste the pull request's link instead.`)
  return summaries.get({ repo, number: parsed.number })
}
