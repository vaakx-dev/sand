import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import {
  pullDetailChange,
  pullDetailClient,
  pullsCandidates,
  pullsClose,
  pullsDeleteBranch,
  pullsDetail,
  pullsEdit,
  pullsReply,
  pullsRequestReview,
  pullsResolveThread,
  pullsRevert,
  pullsUpdateBranch,
} from '../contract'

export default definePlugin({
  name: 'pull-detail',
  description: "Reaches one pull request in full for the page through this PC's GitHub sign-in, and runs its GitHub actions",
  inject: { wire },
  apply(ctx) {
    const { wire } = ctx
    ctx.provide(pullDetailClient, {
      detail: input => wire.call(pullsDetail, input),
      reply: input => wire.call(pullsReply, input),
      resolveThread: input => wire.call(pullsResolveThread, input),
      edit: input => wire.call(pullsEdit, input),
      requestReview: input => wire.call(pullsRequestReview, input),
      candidates: input => wire.call(pullsCandidates, input),
      close: input => wire.call(pullsClose, input),
      updateBranch: input => wire.call(pullsUpdateBranch, input),
      revert: input => wire.call(pullsRevert, input),
      deleteBranch: input => wire.call(pullsDeleteBranch, input),
      onChange: listener => wire.on(pullDetailChange, pull => listener(pull)),
    })
  },
})
