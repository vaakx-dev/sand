import { owned } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createModel } from './model'
import { refreshOnTurns } from './refresh'
import { gitWidget } from './view/widget'

export default definePlugin({
  name: 'git-actions',
  description: 'Git state in the header: branch, changed files, unpushed commits, the PR pill and a button for the next step',
  inject: ['header', 'threads', 'turns', 'gitStatus'],
  uses: {
    pulls: 'no PR pill, and the button never suggests babysitting or merging',
    worktrees: 'no Move to worktree item',
    picker: 'no Switch branch item',
    models: 'a new thread started from the button uses the default model',
  },
  apply(ctx) {
    const model = owned(ctx, () => createModel(ctx))
    refreshOnTurns(ctx, model)
    ctx.effect(() => ctx.header.slot(() => gitWidget(ctx, model)))
  },
})
