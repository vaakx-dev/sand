import { ask } from '@sand/ask/contract'
import { gitRepo, gitRunner } from '@sand/git/contract'
import { type Server, server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { authChanged, github, githubAuthChange, githubLoginCode, pullChanged, pullCreated, pullsChange } from './contract'
import { serveGitHub } from './requests'
import { createGitHub } from './service'

export default definePlugin({
  name: 'github',
  description: "Signs in to GitHub with this PC's gh login, keeps a cache of pull request summaries, and creates, merges and readies pull requests for a thread's folder",
  inject: { gitRunner, gitRepo },
  apply(ctx) {
    let live: Server | undefined
    const host = createGitHub({
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      ask: () => ctx.get(ask),
      authChanged(auth) {
        live?.broadcast(githubAuthChange, auth)
        ctx.emit(authChanged, auth)
      },
      loginCode: code => live?.broadcast(githubLoginCode, code),
      pullChanged(summary) {
        live?.broadcast(pullsChange, summary)
        ctx.emit(pullChanged, summary)
      },
      pullCreated: (summary, session) => ctx.emit(pullCreated, summary, session),
    })
    ctx.effect(() => host.stop)
    ctx.provide(github, host.service)
    ctx.watch(server, found => {
      if (!found) return
      live = found
      const stop = serveGitHub(found, host)
      return () => {
        live = undefined
        stop()
      }
    })
  },
})
