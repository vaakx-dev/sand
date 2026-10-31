import type { Pcs, Wire } from '@sand/devices-contract'
import type { PullRef } from '@sand/github/contract'
import { type PendingReview, reviewAgentComments } from '../contract'

const devicesOf = (pcs: Pcs) => new Set([pcs.here().id, ...pcs.list().flatMap(pc => (pc.online ? [pc.id] : []))])

export const agentMarks = (wire: Wire, pcs: Pcs) => {
  const idsOn = (ref: PullRef, device: string) => wire.call(reviewAgentComments, ref, device).catch((): string[] => [])

  const agentIds = async ({ repo, number }: PullRef) => {
    const lists = await Promise.all([...devicesOf(pcs)].map(device => idsOn({ repo, number }, device)))
    return new Set(lists.flat())
  }

  return async (pull: PullRef, review: PendingReview): Promise<PendingReview> => {
    if (!review.comments.length) return review
    const ids = await agentIds(pull)
    return { ...review, comments: review.comments.map(comment => ({ ...comment, byAgent: comment.byAgent || ids.has(comment.id) })) }
  }
}
