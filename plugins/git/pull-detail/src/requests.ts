import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { PullActions } from './actions/actions'
import {
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
} from './contract'
import type { Details } from './detail/cache'

export const servePullDetail = (server: Server, details: Details, actions: PullActions) =>
  joinDisposers(
    server.handle(pullsDetail, async ({ repo, number, fresh }) => (await details.get({ repo, number }, fresh)).detail),
    server.handle(pullsReply, ({ repo, number, thread, body }) => actions.reply({ repo, number }, { body, ...(thread ? { thread } : {}) })),
    server.handle(pullsResolveThread, ({ repo, number, thread, resolved }) => actions.resolve({ repo, number }, { thread, resolved })),
    server.handle(pullsEdit, ({ repo, number, title, body }) =>
      actions.edit({ repo, number }, { ...(title === undefined ? {} : { title }), ...(body === undefined ? {} : { body }) }),
    ),
    server.handle(pullsRequestReview, ({ repo, number, add }) => actions.requestReview({ repo, number }, { add })),
    server.handle(pullsCandidates, ({ repo, number, q }) => actions.candidates({ repo, number }, q)),
    server.handle(pullsClose, ({ repo, number, closed }) => actions.close({ repo, number }, { closed })),
    server.handle(pullsUpdateBranch, ({ repo, number, rebase }) => actions.update({ repo, number }, rebase === undefined ? {} : { rebase })),
    server.handle(pullsRevert, ({ repo, number }) => actions.revert({ repo, number })),
    server.handle(pullsDeleteBranch, ({ repo, number }) => actions.deleteBranch({ repo, number }, {})),
  )
