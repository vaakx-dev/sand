import { pcs, pcsChange, wire, wireHello } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import {
  pullReviewClient,
  reviewChange,
  reviewComment,
  reviewDiscard,
  reviewFiles,
  reviewPatch,
  reviewPending,
  reviewRemove,
  reviewSubmit,
  reviewViewed,
  reviewWithAgent,
} from '../contract'
import { agentMarks } from './agent-marks'

export default definePlugin({
  name: 'pull-review',
  description:
    "Reaches pull request reviews for the page: changed files and patches, GitHub's viewed marks, the pending review's comments with the ones any PC's agent wrote, submitting or discarding it, and starting an agent review",
  inject: { wire, pcs },
  apply(ctx) {
    const { wire } = ctx
    const marks = agentMarks({ wire, pcs: ctx.pcs, report: error => ctx.report(error) })
    ctx.effect(() => wire.on(reviewChange, marks.note, { from: 'all' }))
    ctx.on(pcsChange, marks.sync)
    ctx.on(wireHello, marks.reload)
    marks.sync()
    ctx.provide(pullReviewClient, {
      files: (input, device) => wire.call(reviewFiles, input, device),
      patch: (input, device) => wire.call(reviewPatch, input, device),
      viewed: (input, device) => wire.call(reviewViewed, input, device),
      pending: async (ref, device) => marks.mark(await wire.call(reviewPending, ref, device)),
      comment: async (input, device) => marks.mark(await wire.call(reviewComment, input, device)),
      remove: async (input, device) => marks.mark(await wire.call(reviewRemove, input, device)),
      submit: (input, device) => wire.call(reviewSubmit, input, device),
      discard: (ref, device) => wire.call(reviewDiscard, ref, device),
      agent: (input, device) => wire.call(reviewWithAgent, input, device),
      onChange: listener => wire.on(reviewChange, listener, { from: 'all' }),
    })
  },
})
