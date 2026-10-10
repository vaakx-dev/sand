import { ghJson } from '../gh'
import { failures } from './logs'
import { unresolvedThreads } from './threads'
import type { Pr, PrView } from './types'

const fields = [
  'number',
  'title',
  'url',
  'state',
  'isDraft',
  'headRefName',
  'baseRefName',
  'headRefOid',
  'mergeStateStatus',
  'reviewDecision',
  'statusCheckRollup',
  'commits',
  'comments',
  'reviews',
].join(',')

export const repoOf = (url: string) => new URL(url).pathname.split('/').slice(1, 3).join('/')

export const viewPr = (pr: string | undefined, cwd: string, signal: AbortSignal) =>
  ghJson<PrView>(['pr', 'view', ...(pr ? [pr] : []), '--json', fields], cwd, signal)

export const fetchPr = async (pr: string | undefined, cwd: string, signal: AbortSignal): Promise<Pr> => {
  const view = await viewPr(pr, cwd, signal)
  const repo = repoOf(view.url)
  const [threads, failed] = await Promise.all([
    unresolvedThreads(repo, view.number, cwd, signal),
    failures(view.statusCheckRollup, repo, cwd, signal),
  ])
  return { ...view, threads, failures: failed }
}
