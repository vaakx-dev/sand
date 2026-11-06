import type { Schedule } from '@sand/schedules/contract'
import { scheduleChange, scheduleRemove } from '@sand/schedules/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { routineDelete, routineList, routinePause, routinesChangeWire } from './contract'
import { owner, type Routines } from './routines'

export const serveRoutines = (ctx: Context, server: Server, routines: Routines) => {
  const announce = (schedule: Schedule) => {
    if (schedule.owner === owner) server.broadcast(routinesChangeWire, [schedule.subject, routines.list(schedule.subject)])
  }
  return joinDisposers(
    server.handle(routineList, ({ bot }) => routines.list(bot)),
    server.handle(routinePause, ({ routine, paused }) => routines.pause(routine, paused)),
    server.handle(routineDelete, ({ routine }) => routines.remove(routine)),
    ctx.on(scheduleChange, announce),
    ctx.on(scheduleRemove, announce),
  )
}
