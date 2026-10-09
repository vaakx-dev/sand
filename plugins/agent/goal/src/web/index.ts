import { pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { entryType } from '../goal'
import { goalRow } from './row'
import { goalState, mountGoal } from './slot'

export default definePlugin({
  name: 'goal-view',
  description: 'Shows the thread goal above the composer and goal changes in the transcript',
  inject: ['threads'],
  uses: {
    composer: 'no goal row above the composer',
    transcript: 'goal changes are not shown in the thread',
    commands: 'the goal row has no Clear button',
  },
  apply(ctx) {
    const changes = pulse(ctx, ['thread.select', 'thread.change', 'threads.change'])
    const state = goalState(ctx, changes)
    ctx.watch('composer', composer => (composer ? mountGoal(ctx, composer, state) : undefined))
    ctx.watch('transcript', transcript => transcript?.entry(entryType, goalRow))
  },
})
