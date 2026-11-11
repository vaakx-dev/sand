import { pcs, wire } from '@sand/devices-contract'
import { featureState } from '@sand/features/contract'
import { joinDisposers } from '@sand/util'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesLive } from '../contract'
import { followChanges } from './live'

export default definePlugin({
  name: 'changes-web',
  description: 'Keeps what each thread in its own worktree changed up to date for the page while merging is on',
  inject: { wire, pcs },
  apply(ctx) {
    const follow = () => {
      const { live, stop } = followChanges(ctx, ctx.wire, ctx.pcs)
      return joinDisposers(ctx.provide(changesLive, live), stop)
    }
    ctx.watch(featureState, found => found && effect(() => (found.on('merge') ? untrack(follow) : undefined)))
  },
})
