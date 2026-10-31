import { gitStatusClient } from '@sand/git/contract'
import { sidebar } from '@sand/sidebar/contract'
import { definePlugin } from 'drydock'
import { inject, showGitRows } from './show'

export default definePlugin({
  name: 'git-rows',
  description: "Sidebar rows show the branch of each thread's folder and its uncommitted line counts",
  inject,
  apply(ctx) {
    ctx.watch(sidebar, rows => rows && ctx.watch(gitStatusClient, client => client && showGitRows(ctx, rows, client)))
  },
})
