import { botTurns } from '@sand/bot-turns/contract'
import { botRemove, bots } from '@sand/bots/contract'
import { type Moment, notify } from '@sand/devices-notify/contract'
import { schedules } from '@sand/schedules/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { fireRoutine } from './fire'
import { createRoutines, owner } from './routines'
import { serveRoutines } from './serve'
import { registerTools } from './tools'

export default definePlugin({
  name: 'bot-routines',
  description: 'Lets bots keep reminders and routines: each runs on a schedule, and when it is due the bot gets a turn with its instructions in its own conversation',
  inject: { schedules, botTurns },
  apply(ctx) {
    const routines = createRoutines(ctx.schedules)
    const lastSaid = (bot: string) => ctx.get(bots)?.get(bot)?.last?.text ?? ''
    const tell = (moment: Moment) => void ctx.get(notify)?.send(moment).catch(error => ctx.report(error))
    ctx.effect(() => ctx.schedules.handle(owner, fireRoutine({ turns: ctx.botTurns, lastSaid, tell })))
    ctx.on(botRemove, bot => routines.forget(bot))
    ctx.watch(tools, found => {
      if (found) return registerTools(found, routines)
    })
    ctx.watch(server, found => {
      if (found) return serveRoutines(ctx, found, routines)
    })
  },
})
