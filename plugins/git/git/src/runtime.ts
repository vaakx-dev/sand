import { type Server, server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { watcher } from '@sand/watch/contract'
import { definePlugin } from 'drydock'
import { gitRepo, gitRunner } from './contract'
import { createGitRepo } from './repo'
import { serveGit } from './requests'
import { runner } from './run/runner'

export default definePlugin({
  name: 'git',
  description: "Reads git status, tracking and branches for a thread's folder, watches leased folders, fetches origin in the background and pushes changes to the page",
  inject: { watcher },
  apply(ctx) {
    let live: Server | undefined
    const host = createGitRepo({
      watcher: ctx.watcher,
      broadcast: (event, payload) => live?.broadcast(event, payload),
      report: error => ctx.report(error),
    })
    ctx.effect(() => host.close)
    ctx.provide(gitRunner, runner)
    ctx.provide(gitRepo, host.repo)
    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(serveGit(found, host), () => {
        live = undefined
      })
    })
  },
})
