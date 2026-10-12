import type {} from '@sand/followups/contract'
import type {} from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import { z } from 'zod'
import type { NewSchedule, Schedule } from './contract'
import type { Store } from './store'
import { createTimer } from './timer'

const newSchedule = z.object({
  session: z.string(),
  prompt: z.string().trim().min(1, 'The prompt is empty'),
  at: z.number().finite(),
  every: z.number().int().min(60_000, 'Repeat at most once a minute').optional(),
  wake: z.boolean().optional(),
  from: z.object({ device: z.string(), name: z.string(), session: z.string() }).optional(),
})

const byTime = (a: Schedule, b: Schedule) => a.at - b.at

const nextRun = (schedule: Schedule, every: number, now: number) => schedule.at + Math.ceil((now - schedule.at + 1) / every) * every

const promptOf = (schedule: Schedule) => (schedule.wake ? `Wake-up: ${schedule.prompt}` : `Scheduled: ${schedule.prompt}`)

export const createSchedules = (ctx: Context<'sessions' | 'followUps'>, store: Store) => {
  const save = (session: string, items: Schedule[]) => {
    const saved = store.set(session, items)
    ctx.server?.broadcast('schedules.change', [session, items])
    return saved
  }

  const thread = (id: string): Session => {
    const session = ctx.sessions.open(id)
    if (!session) throw new Error(`No thread ${id} on this PC`)
    if (session.kind === 'agent') throw new Error('Schedules run in main threads, not in subagent threads')
    return session
  }

  const owns = (id: string) => ctx.runtime?.owns(id) ?? true

  const owned = () => store.all().filter(item => owns(item.session))

  const fire = async (id: string, now: number) => {
    const items = await store.refresh(id)
    const due = items.filter(item => item.at <= now)
    if (!due.length || !owns(id)) return
    await save(id, items.flatMap(item => (item.at > now ? [item] : item.every ? [{ ...item, at: nextRun(item, item.every, now) }] : [])).sort(byTime))
    const session = ctx.sessions.open(id)
    if (session) for (const item of due) ctx.followUps.add(session, promptOf(item), undefined, item.from)
  }

  const fireDue = async () => {
    const now = Date.now()
    for (const id of new Set(owned().filter(item => item.at <= now).map(item => item.session))) {
      await fire(id, now).catch(error => ctx.report(error))
    }
  }

  const timer = createTimer(() => Math.min(...owned().map(item => item.at)), fireDue)

  const add = async (request: NewSchedule) => {
    const { session, ...fields } = newSchedule.parse(request)
    thread(session)
    const schedule: Schedule = { id: crypto.randomUUID().slice(0, 8), session, ...fields }
    await save(session, [...store.get(session), schedule].sort(byTime))
    timer.arm()
    return schedule
  }

  const list = ({ session }: { session?: string }) => (session ? store.get(session) : store.all().sort(byTime))

  const cancel = async ({ schedule, session }: { schedule: string; session?: string }) => {
    const found = store.all().find(item => item.id === schedule && (!session || item.session === session))
    if (!found) throw new Error(`No schedule ${schedule} on this PC`)
    await save(found.session, store.get(found.session).filter(item => item !== found))
    timer.arm()
    return found
  }

  const reload = async (ids: string[]) => {
    for (const id of ids) ctx.server?.broadcast('schedules.change', [id, await store.refresh(id)])
    timer.arm()
  }

  const drop = (id: string) => {
    if (store.get(id).length) void save(id, []).catch(error => ctx.report(error))
  }

  return { add, list, cancel, reload, drop, start: timer.arm, stop: timer.stop }
}

export type Schedules = ReturnType<typeof createSchedules>
