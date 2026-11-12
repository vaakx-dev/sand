import type { Row, Status } from '@sand/ui-shell/contract'
import { clock, derive, div, dynamicChild, p, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { largeRowTitle, metaLine, rowTitle } from '../heads/text'
import { dot, spinner } from '../marks/marks'
import { toneText } from '../marks/tones'
import { placeLook, type Surface } from '../surface'

const minute = 60_000

const shortAge = (ms: number) => {
  const minutes = Math.floor(ms / minute)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

export const age = (at: number) => {
  const now = clock(minute)
  return span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => shortAge(Math.max(0, now.get() - at)))
}

const attention: Partial<Record<Status, { label: string; tone: 'run' | 'warning' | 'success' }>> = {
  running: { label: 'Running', tone: 'run' },
  merging: { label: 'Merging', tone: 'run' },
  waiting: { label: 'Needs you', tone: 'warning' },
  ready: { label: 'Ready', tone: 'success' },
}

export const workStatus = (status: Status | undefined) => {
  const shown = status && attention[status]
  if (!shown) return null
  const lead = shown.tone === 'run' ? spinner('xs') : dot(shown.tone)
  return span({ class: ['flex shrink-0 items-center gap-1.5 text-xs', toneText[shown.tone]] }, lead, shown.label)
}

export interface RowPlaceProps {
  label: Child
  mark?: Child
}

export interface WorkRowBody {
  title: Child
  lead?: Child
  end?: Child
  at?: number
  detail?: Child
  place?: RowPlaceProps
  status?: Status
  trail?: Child
  large?: boolean
}

export type WorkRowProps = Props<HTMLButtonElement> & {
  current?: MaybeReactive<boolean>
  large?: boolean
  surface?: Surface
}

const secondLine = (large: boolean, { detail, place, status, trail }: Pick<WorkRowBody, 'detail' | 'place' | 'status' | 'trail'>) => {
  if (!detail && !place && !status && !trail) return null
  const left = detail ? span({ class: 'min-w-0 truncate' }, detail) : (place ? span({ class: 'inline-flex min-w-0 items-center gap-1.5' }, place.mark ?? null, span({ class: 'min-w-0 truncate' }, place.label)) : null)
  const right = status || trail ? span({ class: 'ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2' }, workStatus(status), trail) : null
  return div({ class: ['flex min-w-0 items-center gap-1.5 text-neutral-500', large ? 'text-sm' : 'text-xs'] }, left, right)
}

const endOf = (end: Child | undefined, at: number | undefined) => end ?? (at === undefined ? null : age(at))

export const workRowBody = ({ title, lead, end, at, large = false, ...rest }: WorkRowBody) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-px' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      lead ?? null,
      span({ class: 'flex min-w-0 flex-1' }, large ? largeRowTitle(title) : rowTitle(title)),
      endOf(end, at),
    ),
    secondLine(large, rest),
  )

export interface RowBodyLook {
  large?: boolean
}

const sameLook = (shown: Row, next: Row) =>
  shown.label === next.label &&
  shown.end === next.end &&
  shown.at === next.at &&
  shown.status === next.status &&
  shown.lead === next.lead &&
  shown.detail === next.detail &&
  shown.trail === next.trail &&
  shown.place?.label === next.place?.label &&
  shown.place?.mark === next.place?.mark

const looksOf = (row: () => Row) => {
  let shown: Row | undefined
  return derive(() => {
    const next = row()
    if (!shown || !sameLook(shown, next)) shown = next
    return shown
  })
}

const bodyOf = (row: Row, large: boolean) =>
  workRowBody({
    title: row.label,
    large,
    lead: row.lead?.(),
    end: row.end ? span({ class: 'flex shrink-0 tabular-nums' }, metaLine(row.end)) : undefined,
    at: row.at,
    detail: row.detail?.(),
    place: row.place && { label: row.place.label, mark: row.place.mark?.() },
    status: row.status,
    trail: row.trail?.(),
  })

export const rowBody = (row: () => Row, { large = false }: RowBodyLook = {}) => dynamicChild(looksOf(row), shown => bodyOf(shown, large))

export const workRow = ({ current = false, large = false, surface = 'page', class: extra, ...props }: WorkRowProps, body: Child) =>
  rowButton(
    {
      'aria-current': () => (read(current) ? 'page' : 'false'),
      ...props,
      class: ['group items-start rounded-md px-2 py-2 transition-colors', large ? 'min-h-10' : 'min-h-8', placeLook(current, surface), extra],
    },
    body,
  )

export const dayDivider = (...children: Child[]) =>
  p({ class: 'px-2 pt-5 pb-1.5 text-xs font-medium text-neutral-500' }, ...children)
