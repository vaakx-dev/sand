import type { Tool, ToolGroup } from '@sand/tools/contract'
import type { Calendars } from '../contract'
import { agendaTool } from './agenda'
import { createTool } from './create'
import { freeTool } from './free'
import { removeTool } from './remove'
import { respondTool } from './respond'
import { updateTool } from './update'

export const group: ToolGroup = {
  name: 'calendar',
  label: 'Calendar',
  summary: "Read the user's calendars, find free time, and add, move, change or delete events and answer invitations",
  load: 'on-demand',
}

export const calendarTools = (service: Calendars): Tool[] => [agendaTool, freeTool, createTool, updateTool, removeTool, respondTool].map(make => make(service))
