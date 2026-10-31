import type { PullRef, PullSummary } from '../../contract'
import { listChecks } from './check-list'
import { countChecks } from './checks'
import type { PullNode } from './query'
import { pullStack } from './stack'
import { mergeMethod, mergeState, pullState, reviewState } from './states'

const unresolved = (node: PullNode) => (node.reviewThreads.nodes ?? []).filter(thread => thread && !thread.isResolved).length

export const shapeSummary = (ref: PullRef, node: PullNode): PullSummary => {
  const autoMerge = mergeMethod(node)
  const stack = pullStack(node)
  const contexts = node.commits.nodes?.[0]?.commit.statusCheckRollup?.contexts
  return {
    repo: node.baseRepository?.nameWithOwner ?? ref.repo,
    number: node.number,
    title: node.title,
    url: node.url,
    state: pullState(node),
    head: node.headRefName,
    base: node.baseRefName,
    author: node.author?.login ?? 'ghost',
    updated: Date.parse(node.updatedAt),
    add: node.additions,
    del: node.deletions,
    files: node.changedFiles,
    checks: countChecks(contexts),
    checkList: listChecks(contexts),
    review: reviewState(node),
    merge: mergeState(node),
    unresolved: unresolved(node),
    ...(autoMerge ? { autoMerge } : {}),
    ...(stack ? { stack } : {}),
  }
}
