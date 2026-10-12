import { removedType, type Worktrees } from '../contract'
import type {} from '@sand/commands/contract'
import { joinDisposers } from '@sand/kit'
import { owned, pulse } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { createChoices } from './chip/choices'
import { createChip, mountChip } from './chip/view'
import { worktreeClient } from './client'
import { onWorktreeEvent } from './events'
import { createMarks } from './marks'
import { moveOpener } from './move/open'
import { mountProgress } from './progress/slot'
import { createProgress } from './progress/store'
import { renamer } from './rename'
import { autoSettle } from './settle/auto'
import { removedNote } from './settle/note'
import { createStates } from './states'

export default definePlugin({
  name: 'worktrees-web',
  description: 'Local or worktree choice in the composer, the Move to worktree sheet, setup progress, worktree marks for threads, and cleanup after a merged PR',
  inject: ['threads', 'wire', 'kit'],
  uses: {
    composer: 'no Local or worktree choice in the composer and no setup progress above it',
    commands: 'no /worktree command, so the thread menu has no Move to worktree item',
    transcript: 'removed worktrees show no note with a Restore button in the thread',
    pulls: 'worktrees are not removed by themselves after their PR is merged',
    notify: 'failed worktree actions are not reported',
  },
  apply(ctx) {
    const client = worktreeClient(ctx)
    const marks = createMarks(ctx, client)
    const states = createStates(ctx, client)
    const progress = owned(ctx, () => createProgress(ctx))
    const choices = owned(ctx, () => createChoices(ctx, client))
    const changes = pulse(ctx, ['thread.select', 'threads.change', 'drafts.change', 'worktrees.change'])
    const openMove = moveOpener(ctx, client, states)
    const rename = renamer(ctx, client)
    const chip = owned(ctx, () => createChip(ctx, client, states, choices, changes))

    onWorktreeEvent(ctx, 'worktrees.change', () => {
      states.forget()
      marks.forget()
    })

    const worktrees: Worktrees = { openMove: () => void openMove(), rename: () => void rename(), of: marks.of }
    ctx.provide('worktrees', worktrees)

    ctx.watch('composer', composer => composer && joinDisposers(mountChip(composer, chip), mountProgress(ctx, composer, progress, changes)))
    ctx.watch('commands', commands =>
      commands?.add({
        name: 'worktree',
        title: 'Move to a worktree…',
        description: 'Move this thread into its own git worktree and branch, taking its changes with it',
        source: 'local',
        run: worktrees.openMove,
      }),
    )
    ctx.watch('transcript', transcript => transcript?.entry(removedType, removedNote(ctx, client, changes)))
    autoSettle(ctx, client, marks)
  },
})
