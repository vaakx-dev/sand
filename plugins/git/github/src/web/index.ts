import { pcs, wire } from '@sand/devices-contract'
import { projects } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { githubClient, githubLoginCode, pullsChange, pullsCreate, pullsForBranch, pullsMerge, pullsReady, pullsResolve, pullsSummary, pullsText } from '../contract'
import { authBook } from './auth'
import { localCopies } from './local-copy'
import { repoBook } from './repos'

export default definePlugin({
  name: 'github',
  description:
    "Reaches GitHub for the page through each PC's sign-in: signing in and out, which repository a folder is and where a repository is checked out, and reading, creating, merging and readying pull requests",
  inject: { wire, pcs, projects },
  apply(ctx) {
    const { wire } = ctx
    const auth = authBook(ctx, wire)
    const { repoOf } = repoBook(ctx, wire)
    ctx.provide(githubClient, {
      ...auth,
      repoOf,
      localCopy: localCopies(ctx, { pcs: ctx.pcs, projects: ctx.projects, repoOf }),
      forBranch: (input, device) => wire.call(pullsForBranch, input, device),
      summary: (input, device) => wire.call(pullsSummary, input, device),
      resolve: (input, device) => wire.call(pullsResolve, input, device),
      text: (input, device) => wire.call(pullsText, input, device),
      create: (input, device) => wire.call(pullsCreate, input, device),
      merge: (input, device) => wire.call(pullsMerge, input, device),
      ready: (input, device) => wire.call(pullsReady, input, device),
      onLoginCode: listener => wire.on(githubLoginCode, listener, { from: 'all' }),
      onPullChange: listener => wire.on(pullsChange, listener, { from: 'all' }),
    })
  },
})
