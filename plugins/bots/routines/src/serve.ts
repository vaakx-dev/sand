import { bots } from '@sand/bots/contract'
import type { Caller } from '@sand/host-hub/contract'
import type { Schedule } from '@sand/schedules/contract'
import { scheduleChange, scheduleRemove } from '@sand/schedules/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { type NewRoutine, routineCreate, routineDelete, routineList, routinePause, routineRetry, routinesChangeWire } from './contract'
import { owner, type Routines } from './routines'
import { whenOf } from './time'

const callerBot = ({ actor }: Caller) => (actor?.owner === 'bot' ? actor.id : undefined)

export const serveRoutines = (ctx: Context, server: Server, routines: Routines) => {
  const announce = (schedule: Schedule) => {
    if (schedule.owner === owner) server.broadcast(routinesChangeWire, [schedule.subject, routines.list(schedule.subject)])
  }

  const botOf = (bot: string | undefined, caller: Caller) => {
    const id = bot ?? callerBot(caller)
    if (!id) throw new Error('Name the bot')
    if (!ctx.get(bots)?.get(id)) throw new Error(`No bot ${id}`)
    return id
  }

  const create = ({ bot, name, instructions, if_missed, ...timing }: NewRoutine, caller: Caller) =>
    routines.create(botOf(bot, caller), { name, instructions, when: whenOf(timing), ...(if_missed && { missed: if_missed }) })

  return joinDisposers(
    server.handle(routineList, ({ bot }, caller) => routines.list(bot ?? callerBot(caller))),
    server.handle(routineCreate, create),
    server.handle(routinePause, ({ routine, paused }) => routines.pause(routine, paused)),
    server.handle(routineRetry, ({ routine }) => routines.retry(routine)),
    server.handle(routineDelete, ({ routine }) => routines.remove(routine)),
    ctx.on(scheduleChange, announce),
    ctx.on(scheduleRemove, announce),
  )
}
