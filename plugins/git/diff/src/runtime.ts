import { gitRepo } from '@sand/git/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { type GitDiffs, gitDiffs } from './contract'
import { listDiff } from './list/list'
import { readPatch } from './patch/patch'
import { serveDiff } from './requests'

export default definePlugin({
  name: 'git-diff',
  description: "Reads git diffs for a thread's folder: changed files with line counts and each file's patch, straight from git",
  inject: { gitRunner, gitRepo },
  apply(ctx) {
    const tools = { git: ctx.gitRunner, repos: ctx.gitRepo }
    const diffs: GitDiffs = { list: (cwd, scope) => listDiff(tools, cwd, scope), patch: input => readPatch(tools, input) }
    ctx.provide(gitDiffs, diffs)
    ctx.watch(server, found => (found ? serveDiff(found, diffs) : undefined))
  },
})
