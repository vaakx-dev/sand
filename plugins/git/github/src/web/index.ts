import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import {
  githubAuth,
  githubAuthChange,
  githubClient,
  githubLogin,
  githubLoginCode,
  githubLogout,
  githubRepo,
  pullsChange,
  pullsCreate,
  pullsForBranch,
  pullsMerge,
  pullsReady,
  pullsResolve,
  pullsSummary,
  pullsText,
} from '../contract'

export default definePlugin({
  name: 'github',
  description: "Reaches GitHub for the page through each PC's sign-in: signing in and out, the folder's repository, and reading, creating, merging and readying pull requests",
  inject: { wire },
  apply(ctx) {
    const { wire } = ctx
    ctx.provide(githubClient, {
      auth: device => wire.call(githubAuth, {}, device),
      login: device => wire.call(githubLogin, {}, device),
      logout: device => wire.call(githubLogout, {}, device),
      repo: (input, device) => wire.call(githubRepo, input, device),
      forBranch: (input, device) => wire.call(pullsForBranch, input, device),
      summary: (input, device) => wire.call(pullsSummary, input, device),
      resolve: (input, device) => wire.call(pullsResolve, input, device),
      text: (input, device) => wire.call(pullsText, input, device),
      create: (input, device) => wire.call(pullsCreate, input, device),
      merge: (input, device) => wire.call(pullsMerge, input, device),
      ready: (input, device) => wire.call(pullsReady, input, device),
      onAuthChange: listener => wire.on(githubAuthChange, listener, { from: 'all' }),
      onLoginCode: listener => wire.on(githubLoginCode, listener, { from: 'all' }),
      onPullChange: listener => wire.on(pullsChange, listener, { from: 'all' }),
    })
  },
})
