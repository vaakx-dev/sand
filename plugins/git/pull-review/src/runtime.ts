import { sessions } from '@sand/chats/contract'
import { diffHunks } from '@sand/git-diff/contract'
import { github, type PullRef } from '@sand/github/contract'
import { loop } from '@sand/loop/contract'
import { paths } from '@sand/paths/contract'
import { pullLinksService } from '@sand/pull-links/contract'
import { type Server, server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { reviewTools } from './agent/tool'
import { reviewChange } from './contract'
import { createAgentRecord } from './pending/agent-record'
import { createReviews } from './pending/reviews'
import { createPullNodes } from './pull/node'
import { serveReview } from './requests'

export default definePlugin({
  name: 'pull-review',
  description:
    "Reviews a pull request: its changed files with GitHub's viewed marks, line comments gathered into the viewer's pending GitHub review, submitting or discarding it, and a review the agent drafts as pending comments",
  inject: { github, paths },
  apply(ctx) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const changed = ({ repo, number }: PullRef) => live?.broadcast(reviewChange, { repo, number })
    const pullLinks = () => ctx.get(pullLinksService)
    const nodes = createPullNodes(ctx.github)
    const record = createAgentRecord({ file: join(ctx.paths.home, 'pull-review.json'), hold: () => ctx.busy(), report })
    const reviews = createReviews({ github: ctx.github, nodes, record, changed, report })

    ctx.watch(tools, found => found && reviewTools(found, { reviews, pullLinks }))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      const stop = serveReview(found, {
        github: ctx.github,
        nodes,
        reviews,
        record,
        patch: { github: ctx.github, hunks: () => ctx.get(diffHunks) },
        agent: { github: ctx.github, pullLinks, sessions: () => ctx.get(sessions), loop: () => ctx.get(loop), report },
        changed,
      })
      return () => {
        live = undefined
        stop()
      }
    })
  },
})
