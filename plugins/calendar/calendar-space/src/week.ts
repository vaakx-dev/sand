import type { Calendar, Occurrence } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { clock, derive, div, dynamicChild, show, span, type Child } from '@vaakx-dev/vrui'
import { waiting } from './agenda'
import { addDays, clockLabel, dayMs, days, hourLabel, isAllDay, startOfDay, weekdayLabel } from './days'
import type { CalendarModel, Shown } from './model'

export interface WeekParts {
  open(event: Occurrence): void
  addAt(at: number): void
}

type Tint = (event: Occurrence) => string | undefined

const hour = 48

const minute = 60_000

const shortest = 30 * minute

const blockLook = 'group overflow-hidden rounded-md text-left text-neutral-100'

const tintOf = (calendars: Calendar[]): Tint => {
  const colors = new Map(calendars.flatMap(calendar => (calendar.color ? [[calendar.id, calendar.color] as const] : [])))
  return event => colors.get(event.calendar)
}

const fill = (color: string | undefined) => (color ? { background: `color-mix(in srgb, ${color} 32%, transparent)` } : {})

const blockButton = (kit: Kit, color: string | undefined, props: { class: string; style?: Record<string, string>; title: string; onClick(): void }, ...children: Child[]) =>
  kit.plainButton(
    { ...props, class: [blockLook, !color && 'bg-neutral-800', props.class], style: { ...props.style, ...fill(color) } },
    span({ class: 'pointer-events-none absolute inset-0 group-hover:bg-neutral-700/40' }),
    span({ class: 'relative flex min-w-0 flex-col' }, ...children),
  )

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
  const shownEnd = (event: Occurrence) => Math.max(event.to, event.from + shortest)
  for (const event of events.toSorted((a, b) => a.from - b.from || b.to - a.to)) {
    if (cluster.length && event.from >= Math.max(...ends)) close()
    const free = ends.findIndex(end => end <= event.from)
    const lane = free < 0 ? ends.length : free
    ends[lane] = shownEnd(event)
    const one = { event, lane, lanes: 1 }
    cluster.push(one)
    placed.push(one)
  }
  close()
  return placed
}

const lineHeight = 20

const clamps = ['line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-4', 'line-clamp-5', 'line-clamp-6']

const blockText = (kit: Kit, event: Occurrence, lines: number) => {
  const timed = lines >= 3
  const titleLines = Math.min(clamps.length, timed ? lines - 1 : lines)
  return [span({ class: ['min-w-0 break-words', clamps[titleLines - 1]] }, event.title), timed ? kit.metaLine(clockLabel(event.from)) : null]
}

const block = (kit: Kit, { event, lane, lanes }: Placed, day: number, tint: Tint, open: (event: Occurrence) => void) => {
  const top = Math.max(0, (event.from - day) / minute)
  const bottom = Math.min(24 * 60, (Math.max(event.to, event.from + shortest) - day) / minute)
  const height = ((bottom - top) * hour) / 60 - 2
  return blockButton(
    kit,
    tint(event),
    {
      class: 'absolute flex flex-col px-1.5 py-px',
      style: { top: `${(top * hour) / 60}px`, height: `${height}px`, left: `${(lane / lanes) * 100}%`, width: `calc(${100 / lanes}% - 2px)` },
      title: event.title,
      onClick: () => open(event),
    },
    ...blockText(kit, event, Math.max(1, Math.floor(height / lineHeight))),
  )
}

const isToday = (day: number) => startOfDay(Date.now()) === day

const dayHead = (kit: Kit, day: number) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col items-center gap-1 pt-1 pb-2' },
    kit.metaLine(weekdayLabel(day)),
    span(
      { class: ['flex h-6 w-6 items-center justify-center rounded-full tabular-nums', isToday(day) ? 'bg-accent-500 font-medium text-accent-950' : 'text-neutral-100'] },
      String(new Date(day).getDate()),
    ),
  )

const allDayChip = (kit: Kit, event: Occurrence, tint: Tint, open: (event: Occurrence) => void) =>
  blockButton(kit, tint(event), { class: 'relative flex min-w-0 px-1.5', title: event.title, onClick: () => open(event) }, kit.rowTitle(event.title))

const nowLine = (day: number) => {
  const now = clock(60_000)
  const offset = () => ((now.get() - day) / minute / 60) * hour
  return show(
    () => isToday(day),
    () =>
      div(
        { class: 'pointer-events-none absolute inset-x-0 flex items-center', style: () => ({ top: `${offset()}px` }) },
        span({ class: '-ml-1 h-2 w-2 shrink-0 rounded-full bg-accent-500' }),
        span({ class: 'h-px flex-1 bg-accent-500' }),
      ),
  )
}

const overlapping = (events: Occurrence[], day: number) => events.filter(event => event.from < addDays(day, 1) && event.to > day)

const column = (kit: Kit, day: number, events: Occurrence[], tint: Tint, parts: WeekParts) => {
  const node: HTMLElement = div(
    {
      class: 'relative min-w-0 flex-1',
      style: { height: `${24 * hour}px` },
      onClick: event => {
        if (event.target !== node) return
        const half = Math.floor(((event.clientY - node.getBoundingClientRect().top) / hour) * 2)
        parts.addAt(day + half * 30 * minute)
      },
    },
    ...Array.from({ length: 23 }, (_, index) => div({ class: 'pointer-events-none absolute inset-x-0 border-t border-neutral-800', style: { top: `${(index + 1) * hour}px` } })),
    ...lanesOf(events).map(one => block(kit, one, day, tint, parts.open)),
    nowLine(day),
  )
  return node
}

const hours = (kit: Kit) =>
  div(
    { class: 'relative w-12 shrink-0', style: { height: `${24 * hour}px` } },
    ...Array.from({ length: 23 }, (_, index) =>
      span({ class: 'absolute right-2 flex -translate-y-1/2', style: { top: `${(index + 1) * hour}px` } }, kit.metaLine(hourLabel(new Date(2000, 0, 1, index + 1).getTime()))),
    ),
  )

const grid = (kit: Kit, { from, to, events }: Shown, tint: Tint, parts: WeekParts, scroll: { top: number }) => {
  const week = days(from, Math.round((to - from) / dayMs))
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
    hours(kit),
    ...week.map(day => column(kit, day, overlapping(timed, day), tint, parts)),
  )
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div(
      { class: 'flex shrink-0 flex-col pr-2 pb-1' },
      div({ class: 'flex' }, div({ class: 'w-12 shrink-0' }), ...week.map(day => dayHead(kit, day))),
      allDay.length
        ? div(
            { class: 'flex pb-1' },
            div({ class: 'w-12 shrink-0' }),
            ...week.map(day => div({ class: 'flex min-w-0 flex-1 flex-col gap-px px-px' }, ...overlapping(allDay, day).map(event => allDayChip(kit, event, tint, parts.open)))),
          )
        : null,
    ),
    body,
  )
}

export const weekView = (kit: Kit, model: CalendarModel, parts: WeekParts) => {
  const scroll = { top: 7 * hour - 12 }
  return dynamicChild(
    derive(() => ({ shown: model.shown.get(), calendars: model.calendars.get() })),
    ({ shown, calendars }) => (shown?.mode === 'week' ? grid(kit, shown, tintOf(calendars), parts, scroll) : waiting(kit, model)),
  )
}
