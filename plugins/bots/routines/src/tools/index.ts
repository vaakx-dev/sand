import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import type { Routines } from '../routines'
import { createTool } from './create'
import { deleteTool } from './delete'
import { listTool } from './list'
import { pauseTool } from './pause'

export const registerTools = (tools: Tools, routines: Routines) =>
  joinDisposers(...[listTool, pauseTool, deleteTool, createTool].map(make => tools.register(make(routines))))
