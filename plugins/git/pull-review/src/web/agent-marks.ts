import type { Pcs, Wire } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { type PendingReview, type ReviewChange, reviewAgentComments } from '../contract'

export interface AgentMarksDeps {
  wire: Wire
  pcs: Pcs
  report(error: unknown): void
}

const onlineDevices = (pcs: Pcs) => new Set([pcs.here().id, ...pcs.list().flatMap(pc => (pc.online ? [pc.id] : []))])

export const agentMarks = ({ wire, pcs, report }: AgentMarksDeps) => {
  const ids = new Set<string>()
  const loads = new Map<string, Promise<void>>()

  const load = (device: string) => {
    const loading: Promise<void> = wire.call(reviewAgentComments, {}, device).then(
      found => {
        for (const id of found) ids.add(id)
      },
      error => {
        if (loads.get(device) === loading) loads.delete(device)
        report(new Error(`Couldn't learn which pending review comments the agent on ${pcs.name(device)} wrote: ${errorMessage(error)}`))
      },
    )
    loads.set(device, loading)
  }

  const sync = () => {
    const online = onlineDevices(pcs)
    for (const device of loads.keys()) if (!online.has(device)) loads.delete(device)
    for (const device of online) if (!loads.has(device)) load(device)
  }

  return {
    sync,
    reload() {
      loads.clear()
      sync()
    },
    note(change: ReviewChange) {
      for (const id of change.agentComments ?? []) ids.add(id)
    },
    async mark(review: PendingReview): Promise<PendingReview> {
      if (!review.comments.length) return review
      await Promise.all(loads.values())
      return { ...review, comments: review.comments.map(comment => ({ ...comment, byAgent: comment.byAgent || ids.has(comment.id) })) }
    },
  }
}
