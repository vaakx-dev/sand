import type { GitHub, PullRef } from '@sand/github/contract'
import { keyedSerial } from '@sand/util'
import type { PendingReview } from '../contract'
import type { PullNodes } from '../pull/node'
import { refKey } from '../pull/ref'
import type { AgentRecord } from './agent-record'
import { addComment, type NewComment } from './comment'
import { deleteComment, deleteReview } from './delete'
import { type PendingOnGitHub, readPending } from './read'
import { type Submission, submitReview } from './submit'

export interface ReviewDeps {
  github: GitHub
  nodes: PullNodes
  record: AgentRecord
  changed(ref: PullRef): void
  report(error: unknown): void
}

export type Reviews = ReturnType<typeof createReviews>

export const createReviews = (deps: ReviewDeps) => {
  const queue = keyedSerial()
  const locked = <T>(ref: PullRef, task: () => Promise<T>) => queue(refKey(ref), task)

  const read = async (ref: PullRef) => {
    const pending = await readPending(deps.github, ref)
    deps.nodes.note(ref, pending.pull)
    return pending
  }

  const shown = async (ref: PullRef, pending: PendingOnGitHub): Promise<PendingReview> => {
    const ids = await deps.record.ids(ref)
    await deps.record.keep(ref, pending.comments.map(comment => comment.id))
    return {
      ...(pending.review ? { id: pending.review } : {}),
      comments: pending.comments.map(comment => ({ ...comment, byAgent: ids.has(comment.id) })),
    }
  }

  const changing = async <T>(ref: PullRef, task: () => Promise<T>) => {
    const result = await locked(ref, task)
    deps.changed(ref)
    return result
  }

  return {
    pending: (ref: PullRef) => locked(ref, async () => shown(ref, await read(ref))),

    comment: (ref: PullRef, comment: NewComment, byAgent = false) =>
      changing(ref, async () => {
        const id = await addComment(deps.github, await read(ref), comment)
        if (byAgent) await deps.record.add(ref, id)
        return shown(ref, await read(ref))
      }),

    remove: (ref: PullRef, comment: string) =>
      changing(ref, async () => {
        const before = await read(ref)
        if (!before.comments.some(pending => pending.id === comment)) throw new Error("That comment isn't in your pending review any more.")
        await deleteComment(deps.github, comment)
        return shown(ref, await read(ref))
      }),

    submit: (ref: PullRef, submission: Submission) =>
      changing(ref, async () => {
        await submitReview(deps.github, await read(ref), submission)
        await deps.record.keep(ref, [])
        deps.github.summary(ref, true).catch(deps.report)
      }),

    discard: (ref: PullRef) =>
      changing(ref, async () => {
        const pending = await read(ref)
        if (pending.review) await deleteReview(deps.github, pending.review)
        await deps.record.keep(ref, [])
      }),
  }
}
