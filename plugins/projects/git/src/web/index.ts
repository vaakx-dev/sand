import { definePlugin } from 'drydock'
import { createBranches } from './branches'

export default definePlugin({
  name: 'git-branches',
  description: 'Looks up the git branch of thread folders for the page',
  inject: ['wire'],
  apply(ctx) {
    ctx.provide('branches', createBranches(ctx))
  },
})
