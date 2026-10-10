import { owned } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createModel } from './model'
import { refreshOnTurns } from './refresh'
import { gitWidget } from './view/widget'

export default definePlugin({
  name: 'git-actions',
  description: 'Git status under the composer: the branch or PR and changed files, with a menu to view edits, open the PR, move to a worktree or rename the worktree',
  inject: ['composer', 'threads', 'gitStatus'],
  uses: {
    pulls: 'no PR status or Open PR item',
    worktrees: 'no Move to a worktree or Regenerate name items',
    panels: 'no View edits item',
  },
  apply(ctx) {
    const model = owned(ctx, () => createModel(ctx))
    refreshOnTurns(ctx, model)
    ctx.effect(() => ctx.composer.slot('tray-end', () => gitWidget(ctx, model)))
  },
})
