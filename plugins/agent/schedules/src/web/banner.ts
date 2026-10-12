import { coarseDuration, errorMessage, exactTime } from '@sand/kit'
import { clock, div, list, span, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Schedule } from '../contract'
import type { ScheduleState } from './state'

const roughly = (ms: number) => coarseDuration(ms).replace(/ 0[hm]$/, '')

const next = (at: number, now: number) => (at - now < 60_000 ? 'within a minute' : `in ${roughly(at - now)}`)

const repeat = ({ every }: Schedule) => (every ? `every ${roughly(every)}` : '')

const scheduleRow = (ctx: Context<'kit'>, state: ScheduleState, now: Derive<number>) => (schedule: Sig<Schedule>) => {
  const { closeButton } = ctx.kit
  const cancel = () => void state.cancel(schedule.get()).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))
  return div(
    { class: 'flex min-w-0 items-center gap-2' },
    span({ class: 'shrink-0 font-medium text-neutral-200' }, () => (schedule.get().wake ? 'Wake-up' : 'Scheduled')),
    span({ class: 'min-w-0 flex-1 truncate', title: () => schedule.get().prompt }, () => schedule.get().prompt),
    span({ class: 'shrink-0 text-xs text-neutral-500', title: () => exactTime(schedule.get().at) }, () => next(schedule.get().at, now.get())),
    span({ class: 'hidden shrink-0 text-xs text-neutral-500 sm:inline' }, () => repeat(schedule.get())),
    closeButton({ size: 'sm', title: 'Cancel', onClick: cancel }),
  )
}

export const schedulesBanner = (ctx: Context<'kit'>, state: ScheduleState) => {
  const { icon, statusBanner } = ctx.kit
  return statusBanner(
    { 'aria-label': 'Scheduled runs' },
    span({ class: 'inline-flex shrink-0 self-start py-1 text-accent-400' }, icon('clock', 14)),
    list(state.upcoming, schedule => schedule.id, scheduleRow(ctx, state, clock(15_000)), div({ class: 'flex min-w-0 flex-1 flex-col gap-1' })),
  )
}
