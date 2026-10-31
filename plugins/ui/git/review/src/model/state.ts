import type { PullRef } from '@sand/github/contract'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'
import { commitsModel } from './commits'
import { filesModel } from './files'
import { reviewPatches } from './patches'
import { pendingModel } from './pending'

export const codeState = (ctx: ReviewContext, ref: PullRef) => {
  const files = filesModel(ctx, ref)
  const commits = commitsModel(ctx, ref)
  const patches = reviewPatches(ctx, ref)
  const pending = pendingModel(ctx, ref)
  const selection = ctx.diff.selection()

  effect(() => {
    const now = files.state.get()
    if (now.kind === 'ready') untrack(() => patches.follow(now.files))
  })
  effect(() => {
    files.commit.get()
    untrack(() => selection.clear())
  })

  return {
    ctx,
    kit: ctx.kit,
    ref,
    files,
    commits,
    patches: patches.store,
    pending,
    selection,
    draft: sig(''),
    editing: sig<string | undefined>(undefined),
    edited: sig(''),
    layout: ctx.diff.layout(),
  }
}

export type CodeTab = ReturnType<typeof codeState>
