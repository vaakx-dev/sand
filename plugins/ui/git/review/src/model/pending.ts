import { type PullRef, samePull } from '@sand/github/contract'
import type { PendingComment, PendingReview, ReviewEvent, ReviewSide } from '@sand/pull-review/contract'
import { effect, sig } from '@vaakx-dev/vrui'
import { type ReviewContext, toastId } from '../inject'

export interface CommentPlace {
  path: string
  line: number
  startLine?: number
  side: ReviewSide
}

const placeOf = ({ path, line, startLine, side }: PendingComment): CommentPlace => ({ path, line, side, ...(startLine ? { startLine } : {}) })

export const pendingModel = (ctx: ReviewContext, ref: PullRef) => {
  const review = sig<PendingReview>({ comments: [] })
  const busy = sig(false)
  let ticket = 0

  const load = () => {
    const mine = ++ticket
    ctx.review
      .pending(ref)
      .then(found => {
        if (mine === ticket) review.set(found)
      })
      .catch(error => {
        if (mine === ticket) ctx.toasts.error(toastId, "Couldn't load your pending review", error)
      })
  }

  const run = async <T>(title: string, work: () => Promise<T>) => {
    if (busy.get()) return undefined
    busy.set(true)
    ticket++
    try {
      return await ctx.toasts.attempt(toastId, title, work)
    } finally {
      busy.set(false)
    }
  }

  const settle = (found: PendingReview | undefined) => {
    if (found) review.set(found)
    return Boolean(found)
  }

  const comment = async (place: CommentPlace, body: string) =>
    settle(await run("Couldn't add the comment to your review", () => ctx.review.comment({ ...ref, ...place, body })))

  const remove = async (id: string) => settle(await run("Couldn't remove the comment", () => ctx.review.remove({ ...ref, comment: id })))

  const edit = async (old: PendingComment, body: string) =>
    settle(
      await run("Couldn't save the comment", async () => {
        await ctx.review.comment({ ...ref, ...placeOf(old), body })
        return ctx.review.remove({ ...ref, comment: old.id })
      }),
    )

  const finish = async (event: ReviewEvent, body: string) => {
    const done = await run("Couldn't submit your review", () => ctx.review.submit({ ...ref, event, ...(body ? { body } : {}) }).then(() => true))
    if (done) review.set({ comments: [] })
    return Boolean(done)
  }

  const discard = async () => {
    const done = await run("Couldn't discard your review", () => ctx.review.discard(ref).then(() => true))
    if (done) review.set({ comments: [] })
    return Boolean(done)
  }

  effect(() =>
    ctx.review.onChange(changed => {
      if (samePull(changed, ref)) load()
    }),
  )
  load()

  return { review, busy, comment, remove, edit, finish, discard }
}

export type PendingModel = ReturnType<typeof pendingModel>
