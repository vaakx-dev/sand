import { gitRepo, gitRunner } from '@sand/git/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { serveDiff } from './requests'

export default definePlugin({
  name: 'git-diff',
  description: "Reads git diffs for a thread's folder: changed files with line counts and each file's patch, straight from git",
  inject: { gitRunner, gitRepo },
  apply(ctx) {
    ctx.watch(server, found => (found ? serveDiff(found, { git: ctx.gitRunner, repos: ctx.gitRepo }) : undefined))
  },
})
