import { github, pullChanged, type PullRef } from '@sand/github/contract'
import { type Server, server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createActions } from './actions/actions'
import { pullDetailChange } from './contract'
import { createDetails } from './detail/cache'
import { servePullDetail } from './requests'

export default definePlugin({
  name: 'pull-detail',
  description: "Loads one pull request in full (description, checks, reviewers, commits and its conversation) and runs GitHub actions on it: replying, resolving, editing, requesting reviewers, closing, updating the branch, reverting and deleting the branch",
  inject: { github },
  apply(ctx) {
    let live: Server | undefined
    const changed = ({ repo, number }: PullRef) => live?.broadcast(pullDetailChange, { repo, number })
    const details = createDetails(ctx.github)
    const actions = createActions({ github: ctx.github, details, changed, report: error => ctx.report(error) })

    ctx.effect(() => details.clear)
    ctx.on(pullChanged, summary => {
      if (details.outdate(summary)) changed(summary)
    })
    ctx.watch(server, found => {
      if (!found) return
      live = found
      const stop = servePullDetail(found, details, actions)
      return () => {
        live = undefined
        stop()
      }
    })
  },
})
