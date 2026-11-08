import { definePlugin } from 'drydock'
import { createClient } from './api/client'
import { githubHost } from './api/endpoint'
import { createAuth } from './auth/auth'
import { github } from './contract'

export default definePlugin({
  name: 'github',
  description: "Calls GitHub's API with this PC's gh sign-in or GH_TOKEN",
  apply(ctx) {
    const auth = createAuth(githubHost)
    const client = createClient({ token: auth.token, rejected: auth.invalidate })
    ctx.provide(github, { rest: client.rest })
  },
})
