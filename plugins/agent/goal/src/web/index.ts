import { pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { entryType } from '../goal'
import { goalBanner } from './banner'
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
    notify: 'copying the goal and failed clears are not reported',
  },
  apply(ctx) {
    const state = goalState(ctx, pulse(ctx, ['thread.select', 'thread.change', 'threads.change']))
    const hasCommands = pulse(ctx, [], ['commands']).read(() => Boolean(ctx.commands))
    const banner = () => goalBanner(ctx, state.view, hasCommands)
    ctx.watch('composer', composer => (composer ? mountGoal(composer, state, banner) : undefined))
    ctx.watch('transcript', transcript => transcript?.entry(entryType, goalRow))
  },
})
