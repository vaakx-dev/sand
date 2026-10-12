import { eachSettled, oneLine } from '@sand/kit'
import type { Pc, Pcs } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Schedule } from '../contract'
import { group } from './schedule'
import { describeRun } from './when'

const listInput = z.object({
  thread: z.string().optional().describe('Thread id or name, on any PC. Defaults to this thread'),
  pc: z.string().optional().describe("Without thread: list every schedule on this PC, by name or id. With thread: the thread's PC"),
  all_pcs: z.boolean().optional().describe('List every schedule on every PC'),
})

const cancelInput = z.object({
  id: z.string().describe('Schedule id from schedule, wake_me or schedules'),
  pc: z.string().optional().describe("The schedule's PC, by name or id. Found by itself when left out"),
})

interface Row {
  pc: Pc
  schedule: Schedule
  title?: string | null
}

const listOn = (pcs: Pcs, session?: string) => async (pc: Pc) => {
  const [schedules, threads] = await Promise.all([pcs.call<Schedule[]>({ type: 'schedules.list', session }, pc.id), pcs.threads(pc)])
  const titles = new Map(threads.map(thread => [thread.id, thread.title]))
  return schedules.map((schedule): Row => ({ pc, schedule, title: titles.get(schedule.session) }))
}

const listAll = async (pcs: Pcs, places: Pc[], session?: string) => {
  const { values, errors } = await eachSettled(places, listOn(pcs, session))
  return { rows: values.flat().sort((a, b) => a.schedule.at - b.schedule.at), problems: errors }
}

const line = ({ pc, schedule, title }: Row) => {
  const what = schedule.wake ? `wake-up: ${schedule.prompt}` : schedule.prompt
  return `${schedule.id}  ${describeRun(schedule)}  thread "${title ?? 'untitled'}" (${schedule.session}) on ${pc.name}  ${oneLine(what, 120)}`
}

const report = ({ rows, problems }: Awaited<ReturnType<typeof listAll>>, none: string) => [...(rows.length ? rows.map(line) : [none]), ...problems].join('\n')

export const listTool = (pcs: Pcs): Tool<typeof listInput> => ({
  name: 'schedules',
  group,
  description: "List scheduled runs and wake-ups, soonest first: this thread's by default, or another thread's, a PC's or every PC's.",
  input: listInput,
  async run({ thread, pc, all_pcs }, { session }) {
    if (all_pcs) return report(await listAll(pcs, await pcs.list()), 'No schedules on any PC.')
    if (pc && !thread) {
      const place = await pcs.find(pc)
      return report(await listAll(pcs, [place]), `No schedules on ${place.name}.`)
    }
    const found = await pcs.threadOrOwn(session, thread, pc)
    const none = `No schedules in thread "${found.thread.title ?? 'untitled'}" (${found.thread.id}) on ${found.pc.name}.`
    return report(await listAll(pcs, [found.pc], found.thread.id), none)
  },
})

export const cancelTool = (pcs: Pcs): Tool<typeof cancelInput> => ({
  name: 'schedule_cancel',
  group,
  description: 'Cancel a scheduled run or wake-up on any PC by its id.',
  input: cancelInput,
  async run({ id, pc }) {
    const { rows, problems } = await listAll(pcs, pc ? [await pcs.find(pc)] : await pcs.list())
    const found = rows.find(row => row.schedule.id === id)
    if (!found) throw new Error([`No schedule ${id}${pc ? ` on ${pc}` : ' on any PC'}`, ...problems].join('\n'))
    await pcs.call({ type: 'schedules.cancel', schedule: id, session: found.schedule.session }, found.pc.id)
    return `Cancelled ${id} on ${found.pc.name}.`
  },
})
