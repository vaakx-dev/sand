import type { Composer } from '@sand/composer-card/contract'
import { pulse } from '@sand/kit/web'
import { derive, effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin, type Context } from 'drydock'
import { schedulesBanner } from './banner'
import { scheduleState, type ScheduleState } from './state'

const mountBanner = (ctx: Context<'kit'>, composer: Composer, state: ScheduleState) => {
  const shown = derive(() => state.upcoming.get().length > 0)
  return effect(() => {
    if (!shown.get()) return
    const remove = untrack(() => composer.slot('above', () => schedulesBanner(ctx, state), -5))
    return () => void remove()
  })
}

export default definePlugin({
  name: 'schedules-view',
  description: "Shows a thread's upcoming scheduled runs and wake-ups above the composer, each with a cancel button",
  inject: ['threads', 'wire', 'machines', 'kit'],
  uses: {
    composer: 'a thread does not show its upcoming runs',
    notify: 'failed cancels are not reported',
  },
  apply(ctx) {
    const state = scheduleState(ctx, pulse(ctx, ['thread.select']))
    ctx.watch('composer', composer => (composer ? mountBanner(ctx, composer, state) : undefined))
  },
})
