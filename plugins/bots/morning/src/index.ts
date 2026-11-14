import { bots, morningEntry } from '@sand/bots/contract'
import { schedules, systemZone } from '@sand/schedules/contract'
import { definePlugin } from 'drydock'
import { morningOf } from './morning'

const owner = 'bot-morning'

const EVERY_MORNING = '0 8 * * *'

export default definePlugin({
  name: 'bot-morning',
  description: "Every morning at 8:00, posts a short summary of each bot's jobs in its chat: what needs the user, what ran and what is paused",
  inject: { bots, schedules },
  apply(ctx) {
    const post = async (due: number) => {
      for (const bot of ctx.bots.list()) if (bot.jobs.length && !bot.paused) ctx.bots.conversation(bot.id).append(morningEntry, morningOf(bot.jobs, due))
    }
    ctx.effect(() => ctx.schedules.handle(owner, (_schedule, fire) => post(fire.due)))
    if (!ctx.schedules.list(owner).length) ctx.schedules.create({ owner, subject: 'bots', when: { kind: 'cron', cron: EVERY_MORNING, zone: systemZone() }, missed: 'run' })
  },
})
