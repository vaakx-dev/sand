import { checksChange, type Schedules } from '@sand/schedules/contract'
import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Routines } from '../routines'
import { createTool } from './create'
import { deleteTool } from './delete'
import { listTool } from './list'
import { pauseTool } from './pause'

export const registerTools = (ctx: Context, tools: Tools, schedules: Schedules, routines: Routines) => {
  const fixed = [listTool, pauseTool, deleteTool].map(make => tools.register(make(routines)))
  let create = tools.register(createTool(routines, schedules))
  const stop = ctx.on(checksChange, () => {
    void create()
    create = tools.register(createTool(routines, schedules))
  })
  return joinDisposers(stop, () => create(), ...fixed)
}
