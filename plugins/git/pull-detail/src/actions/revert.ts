import { type PullRef, type PullSummary, pullLabel } from '@sand/github/contract'
import { type PullNode, pullSummaryFields, shapeSummary } from '@sand/github/summary'
import { refusal } from '../errors/refusal'
import { type ActionDeps, settle } from './action'

const revertPull = `
mutation RevertPull($id: ID!) {
  revertPullRequest(input: { pullRequestId: $id }) {
    revertPullRequest { ...PullSummaryFields }
  }
}
${pullSummaryFields}`

interface RevertData {
  revertPullRequest: { revertPullRequest: PullNode | null } | null
}

export const revertPullRequest = async (deps: ActionDeps, ref: PullRef): Promise<PullSummary> => {
  const { detail, ids } = await deps.details.get(ref, true)
  if (detail.state !== 'merged') throw new Error(`Only merged pull requests can be reverted, and ${pullLabel(detail)} is ${detail.state}.`)
  const data = await deps.github.graphql<RevertData>(revertPull, { id: ids.pull }).catch((error: unknown) => {
    throw refusal('revert', detail, error)
  })
  const node = data.revertPullRequest?.revertPullRequest
  if (!node) throw new Error(`GitHub didn't say which pull request reverts ${pullLabel(detail)}; look for it on GitHub.`)
  const summary = shapeSummary({ repo: detail.repo, number: node.number }, node)
  deps.github.noteSummary(node.id, summary)
  await settle(deps, ref).catch(deps.report)
  return summary
}
