import type { Pcs } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Schedule } from '../contract'
import type { Schedules } from '../schedules'
import { describeRun, firstRun, parseDuration, whenFields } from './when'

export const group = 'schedule'

const scheduleInput = z.object({
  prompt: z.string().describe('What to run, written as a message to the agent'),
  thread: z.string().optional().describe('Thread id or name, on any PC. Defaults to this thread'),
  pc: z.string().optional().describe("The thread's PC, by name or id. Found by itself when left out"),
  ...whenFields,
  every: z.string().optional().describe('Repeat this often, like 30m, 2h or 1d; at least 1m'),
})

const wakeInput = z.object({
  ...whenFields,
  note: z.string().describe('What to check when you wake up'),
})

export const scheduleTool = (pcs: Pcs): Tool<typeof scheduleInput> => ({
  name: 'schedule',
  group,
  description:
    'Run a prompt in a thread on any PC later: once at a time (at), after a delay (in), or repeating (every). The thread defaults to this one. If the thread is busy then, the run waits until its turn ends.',
  input: scheduleInput,
  async run({ prompt, thread, pc, at, in: delay, every }, { session }) {
    const found = await pcs.threadOrOwn(session, thread, pc)
    const interval = every ? parseDuration(every) : undefined
    const request = { session: found.thread.id, prompt, at: firstRun(at, delay, interval), every: interval, from: await pcs.link(session) }
    const schedule = await pcs.call<Schedule>({ type: 'schedules.add', ...request }, found.pc.id)
    return `Scheduled ${schedule.id} in thread "${found.thread.title ?? 'untitled'}" (${found.thread.id}) on ${found.pc.name}: next run ${describeRun(schedule)}.`
  },
})

export const wakeTool = (schedules: Schedules): Tool<typeof wakeInput> => ({
  name: 'wake_me',
  group,
  description:
    'Get a message in this thread later so you can check back on something, then end your turn now instead of waiting. The note comes back to you as the message.',
  input: wakeInput,
  async run({ at, in: delay, note }, { session }) {
    const schedule = await schedules.add({ session: session.id, prompt: note, at: firstRun(at, delay), wake: true })
    return `Wake-up ${schedule.id} set for ${describeRun(schedule)}. End your turn now; your note comes back then.`
  },
})
