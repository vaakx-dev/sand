import { ask } from '@sand/ask/contract'
import { gitRepo, gitRunner } from '@sand/git/contract'
import { type Server, server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { gitProgress } from './contract'
import { serveActions } from './requests'
import { createPerformer } from './run/perform'

export default definePlugin({
  name: 'git-actions',
  description: "Commits, pushes, pulls, switches branches and starts repositories in a thread's folder, reporting progress to the page",
  inject: { gitRunner, gitRepo },
  apply(ctx) {
    let live: Server | undefined
    const perform = createPerformer({
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      send: progress => live?.broadcast(gitProgress, progress),
      report: error => ctx.report(error),
    })
    ctx.watch(server, found => {
      if (!found) return
      live = found
      const stop = serveActions(found, { perform, ask: () => ctx.get(ask) })
      return () => {
        live = undefined
        stop()
      }
    })
  },
})
