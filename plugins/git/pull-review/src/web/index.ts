import { pcs, wire } from '@sand/devices-contract'
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
    const marked = agentMarks(wire, ctx.pcs)
    ctx.provide(pullReviewClient, {
      files: (input, device) => wire.call(reviewFiles, input, device),
      patch: (input, device) => wire.call(reviewPatch, input, device),
      viewed: (input, device) => wire.call(reviewViewed, input, device),
      pending: async (ref, device) => marked(ref, await wire.call(reviewPending, ref, device)),
      comment: async (input, device) => marked(input, await wire.call(reviewComment, input, device)),
      remove: async (input, device) => marked(input, await wire.call(reviewRemove, input, device)),
      submit: (input, device) => wire.call(reviewSubmit, input, device),
      discard: (ref, device) => wire.call(reviewDiscard, ref, device),
      agent: (input, device) => wire.call(reviewWithAgent, input, device),
      onChange: listener => wire.on(reviewChange, listener, { from: 'all' }),
    })
  },
})
