import { type PullRef, pullLabel } from '@sand/github/contract'
import type { BranchUpdate, PullDetail } from '../contract'
import { refusal } from '../errors/refusal'
import { type ActionDeps, settle } from './action'
import { isOpen, stateNote } from './state'

const updateBranch = `
mutation UpdateBranch($id: ID!, $oid: GitObjectID!) {
  updatePullRequestBranch(input: { pullRequestId: $id, expectedHeadOid: $oid, updateMethod: MERGE }) { clientMutationId }
}
`

const refuse = (detail: PullDetail) => {
  if (!isOpen(detail)) return `${stateNote(detail)}, so its branch can't be updated.`
  if (detail.headDeleted) return `The branch ${detail.head} of ${pullLabel(detail)} was deleted, so it can't be updated.`
  return undefined
}

export const updatePullBranch = async (deps: ActionDeps, ref: PullRef): Promise<BranchUpdate> => {
  const { detail, ids } = await deps.details.get(ref, true)
  const reason = refuse(detail)
  if (reason) throw new Error(reason)
  if (detail.merge === 'conflict') return { detail, conflict: true }
  if (detail.behindBy === 0) return { detail, conflict: false }
  try {
    await deps.github.graphql(updateBranch, { id: ids.pull, oid: ids.headOid })
  } catch (error) {
    const now = await settle(deps, ref)
    if (now.merge === 'conflict') return { detail: now, conflict: true }
    throw refusal('update the branch of', detail, error)
  }
  return { detail: await settle(deps, ref), conflict: false }
}
