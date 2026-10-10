import { definePlugin } from 'drydock'
import { createBranches } from './branches'
import { createGitStatus } from './status'

export default definePlugin({
  name: 'git-branches',
  description: 'Looks up the git branch and status of thread folders for the page',
  inject: ['wire'],
  apply(ctx) {
    ctx.provide('branches', createBranches(ctx))
    ctx.provide('gitStatus', createGitStatus(ctx))
  },
})
