import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { systemZone } from '@sand/schedules/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { newRoutine, type Routine, routineCreate, routineDelete, routineList, routinePause, routineRetry } from './contract'
import { timeIn, timing, zoneOf } from './time'

const group: McpGroup = { name: 'routines', label: 'Routines', summary: "set a bot's reminders and routines, and list, pause, try again or delete them" }

const always: McpTool['always'] = ['bot']

const self = z.string().optional().describe('The bot (default: you, when you are a bot)')
const id = z.string().describe('The routine id from routine_list')

const createInput = newRoutine()
const listInput = z.object({ bot: self })
const pauseInput = z.object({ id, paused: z.boolean().describe('true to pause, false to resume') })
const retryInput = z.object({ id })
const deleteInput = z.object({ id })

const shown = ({ id, bot, name, instructions, job, when, paused, next, last }: Routine) => ({
  id,
  bot,
  name,
  ...(job && { job }),
  when: timing(when),
  ...(next !== undefined && { next: timeIn(next, zoneOf(when)) }),
  ...(paused && { paused }),
  ...(last && { last: last.error ? `${last.outcome}: ${last.error}` : last.outcome }),
  instructions,
})

export const routineTools: McpTool[] = [
  {
    name: 'routine_create',
    description:
      "Set a bot a reminder or a routine: when it comes due, the bot acts on its instructions in its own chat, even while the user is away. Use at or in_minutes for one time, or repeat for a recurring schedule. A bot leaves out bot to set its own.",
    input: createInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => shown(await call(routineCreate, input)),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'routine_list',
    description: "List a bot's reminders and routines with when they run next, and the time now. A bot leaves out bot to list its own.",
    input: listInput,
    access: 'read',
    group: group.name,
    always,
    run: async (input, { call }) => ({ now: `${timeIn(Date.now(), systemZone())} (${systemZone()})`, routines: (await call(routineList, input)).map(shown) }),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'routine_pause',
    description: 'Pause a reminder or routine so it stops running, or resume it with paused false.',
    input: pauseInput,
    access: 'operate',
    group: group.name,
    always,
    run: async ({ id, paused }, { call }) => shown(await call(routinePause, { routine: id, paused })),
  } satisfies McpTool<typeof pauseInput>,
  {
    name: 'routine_retry',
    description: 'Run a reminder that failed after its retries once more, now. If that fails it is tried again later, like any failed run.',
    input: retryInput,
    access: 'operate',
    group: group.name,
    always,
    run: async ({ id }, { call }) => shown(await call(routineRetry, { routine: id })),
  } satisfies McpTool<typeof retryInput>,
  {
    name: 'routine_delete',
    description: 'Delete a reminder or routine for good.',
    input: deleteInput,
    access: 'operate',
    group: group.name,
    always,
    run: ({ id }, { call }) => call(routineDelete, { routine: id }),
  } satisfies McpTool<typeof deleteInput>,
]

export const offerRoutineTools = (found: McpTools) => joinDisposers(found.group(group), ...routineTools.map(tool => found.register(tool)))
