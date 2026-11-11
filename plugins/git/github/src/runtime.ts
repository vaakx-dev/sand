import { gitRunner } from '@sand/git-runner/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { createClient } from './api/client'
import { githubHost } from './api/endpoint'
import { createAuth } from './auth/auth'
import { registerChecks } from './checks'
import { listenUser } from './checks/user'
import { timing } from './checks/wait'
import { github, githubOpenPull, githubPulls } from './contract'
import { openPull, pullsOf } from './pulls'

export default definePlugin({
  name: 'github',
  description: "Calls GitHub's API with this PC's gh sign-in or GH_TOKEN, finds a branch's pull requests, opens new ones and waits for their checks",
  apply(ctx) {
    const auth = createAuth(githubHost)
    const client = createClient({ token: auth.token, rejected: auth.invalidate })
    const listen = listenUser(ctx)
    ctx.provide(github, { rest: client.rest })
    ctx.watch(
      gitRunner,
      git =>
        git &&
        joinDisposers(
          ctx.watch(
            server,
            found =>
              found &&
              joinDisposers(
                found.handle(githubPulls, ({ cwd }) => pullsOf(git, client, cwd)),
                found.handle(githubOpenPull, ({ cwd, title }) => openPull(git, client, cwd, title)),
              ),
          ),
          ctx.watch(tools, found => found && registerChecks(found, { git, client, listen, timing })),
        ),
    )
  },
})
