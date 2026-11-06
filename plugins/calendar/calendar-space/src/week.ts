import type { Occurrence } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import { waiting } from './agenda'
import { addDays, clockLabel, days, hourLabel, isAllDay, startOfDay, weekdayLabel } from './days'
import type { CalendarModel, Shown } from './model'

export interface WeekParts {
  open(event: Occurrence): void
  addAt(at: number): void
}

const hour = 48

const minute = 60_000

interface Placed {
  event: Occurrence
  lane: number
  lanes: number
}

const lanesOf = (events: Occurrence[]): Placed[] => {
  const placed: Placed[] = []
  let cluster: Placed[] = []
  let ends: number[] = []
  const close = () => {
    for (const one of cluster) one.lanes = ends.length
    cluster = []
    ends = []
  }
  for (const event of events) {
    if (cluster.length && event.from >= Math.max(...ends)) close()
    const free = ends.findIndex(end => end <= event.from)
    const lane = free < 0 ? ends.length : free
    ends[lane] = event.to
    const one = { event, lane, lanes: 1 }
    cluster.push(one)
    placed.push(one)
  }
  close()
  return placed
}

const block = (kit: Kit, { event, lane, lanes }: Placed, day: number, open: (event: Occurrence) => void) => {
  const top = Math.max(0, (event.from - day) / minute)
  const bottom = Math.min(24 * 60, (event.to - day) / minute)
  const height = Math.max(20, ((bottom - top) * hour) / 60 - 2)
  return kit.plainButton(
    {
      class: 'absolute flex flex-col overflow-hidden rounded-md bg-accent-500/25 px-1.5 py-px text-left text-xs text-neutral-100 hover:bg-accent-500/40',
      style: { top: `${(top * hour) / 60}px`, height: `${height}px`, left: `${(lane / lanes) * 100}%`, width: `calc(${100 / lanes}% - 2px)` },
      title: event.title,
      onClick: () => open(event),
    },
    span({ class: 'truncate font-medium' }, event.title),
    height > 36 ? span({ class: 'truncate text-neutral-400' }, clockLabel(event.from)) : null,
  )
}

const dayHead = (day: number) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col items-center py-1 text-xs' },
    span({ class: 'text-neutral-400' }, weekdayLabel(day)),
    span(
      { class: ['flex h-8 w-8 items-center justify-center rounded-full text-sm', startOfDay(Date.now()) === day ? 'bg-accent-500 font-medium text-accent-950' : 'text-neutral-100'] },
      String(new Date(day).getDate()),
    ),
  )

const allDayChip = (kit: Kit, event: Occurrence, open: (event: Occurrence) => void) =>
  kit.plainButton({ class: 'truncate rounded-md bg-accent-500/25 px-1.5 py-px text-left text-xs text-neutral-100 hover:bg-accent-500/40', onClick: () => open(event) }, event.title)

const overlapping = (events: Occurrence[], day: number) => events.filter(event => event.from < addDays(day, 1) && event.to > day)

const column = (kit: Kit, day: number, events: Occurrence[], parts: WeekParts) => {
  const node: HTMLElement = div(
    {
      class: 'relative min-w-0 flex-1 border-l border-neutral-800',
      style: { height: `${24 * hour}px` },
      onClick: event => {
        if (event.target !== node) return
        const half = Math.floor(((event.clientY - node.getBoundingClientRect().top) / hour) * 2)
        parts.addAt(day + half * 30 * minute)
      },
    },
    ...Array.from({ length: 23 }, (_, index) => div({ class: 'pointer-events-none absolute inset-x-0 border-t border-neutral-800', style: { top: `${(index + 1) * hour}px` } })),
    ...lanesOf(events).map(one => block(kit, one, day, parts.open)),
  )
  return node
}

const hours = () =>
  div(
    { class: 'relative w-12 shrink-0', style: { height: `${24 * hour}px` } },
    ...Array.from({ length: 23 }, (_, index) =>
      span(
        { class: 'absolute right-2 -translate-y-1/2 text-xs text-neutral-500', style: { top: `${(index + 1) * hour}px` } },
        hourLabel(new Date(2000, 0, 1, index + 1).getTime()),
      ),
    ),
  )

const grid = (kit: Kit, { from, events }: Shown, parts: WeekParts, scroll: { top: number }) => {
  const week = days(from, 7)
  const allDay = events.filter(event => isAllDay(event.start))
  const timed = events.filter(event => !isAllDay(event.start))
  const body: HTMLElement = div(
    {
      class: 'flex min-h-0 flex-1 overflow-auto overscroll-contain pr-2',
      onScroll: () => {
        scroll.top = body.scrollTop
      },
      onMount: node => {
        node.scrollTop = scroll.top
      },
    },
    hours(),
    ...week.map(day => column(kit, day, overlapping(timed, day), parts)),
  )
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div({ class: 'flex shrink-0 border-b border-neutral-800 pr-2' }, div({ class: 'w-12 shrink-0' }), ...week.map(dayHead)),
    allDay.length
      ? div(
          { class: 'flex shrink-0 border-b border-neutral-800 py-1 pr-2' },
          div({ class: 'w-12 shrink-0' }),
          ...week.map(day => div({ class: 'flex min-w-0 flex-1 flex-col gap-px px-px' }, ...overlapping(allDay, day).map(event => allDayChip(kit, event, parts.open)))),
        )
      : null,
    body,
  )
}

export const weekView = (kit: Kit, model: CalendarModel, parts: WeekParts) => {
  const scroll = { top: 7 * hour - 12 }
  return dynamicChild(
    () => model.shown.get(),
    shown => (shown?.mode === 'week' ? grid(kit, shown, parts, scroll) : waiting(kit, model)),
  )
}
