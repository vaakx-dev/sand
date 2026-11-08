import { gitRunner } from '@sand/git-runner/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createClient } from './api/client'
import { githubHost } from './api/endpoint'
import { createAuth } from './auth/auth'
import { github, githubPulls } from './contract'
import { pullsOf } from './pulls'

export default definePlugin({
  name: 'github',
  description: "Calls GitHub's API with this PC's gh sign-in or GH_TOKEN, and finds a branch's pull requests",
  apply(ctx) {
    const auth = createAuth(githubHost)
    const client = createClient({ token: auth.token, rejected: auth.invalidate })
    ctx.provide(github, { rest: client.rest })
    ctx.watch(gitRunner, git => git && ctx.watch(server, found => found?.handle(githubPulls, ({ cwd }) => pullsOf(git, client, cwd))))
  },
})
