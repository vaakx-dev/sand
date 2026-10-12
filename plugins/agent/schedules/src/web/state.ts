import type { WireEvent } from '@sand/protocol'
import type { Pulse } from '@sand/kit/web'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Schedule } from '../contract'

export const scheduleState = (ctx: Context<'threads' | 'wire' | 'machines'>, changes: Pulse) => {
  const lists = sig<ReadonlyMap<string, Schedule[]>>(new Map())
  const keep = (session: string, items: Schedule[]) => lists.update(map => new Map(map).set(session, items))
  let online = false

  const refresh = () => {
    const thread = ctx.threads.current()
    if (thread) void ctx.wire.call<Schedule[]>({ type: 'schedules.list', session: thread.id }).then(items => keep(thread.id, items), () => {})
  }

  const reconnected = () => {
    const device = ctx.threads.current()?.device
    const now = Boolean(device && ctx.machines.online(device))
    if (now && !online) refresh()
    online = now
  }

  const apply = (event: WireEvent) => {
    if (event.name === 'schedules.change') keep(...event.args)
  }

  ctx.on('thread.select', refresh)
  ctx.on('wire.hello', refresh)
  ctx.on('machines.change', reconnected)
  ctx.on('wire.event', apply)
  ctx.on('machines.event', (_device, event) => apply(event))

  const thread = changes.read(() => ctx.threads.current()?.id)
  const upcoming = derive(() => lists.get().get(thread.get() ?? '') ?? [])
  const cancel = (schedule: Schedule) => ctx.wire.call({ type: 'schedules.cancel', schedule: schedule.id, session: schedule.session })

  return { upcoming, cancel }
}

export type ScheduleState = ReturnType<typeof scheduleState>
