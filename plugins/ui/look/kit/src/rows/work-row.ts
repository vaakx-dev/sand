import type { Row, Status } from '@sand/ui-shell/contract'
import { clock, derive, div, dynamicChild, p, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { largeRowTitle, metaLine, rowTitle } from '../heads/text'
import { dot, spinner } from '../marks/marks'
import { runLooks } from '../marks/status'
import { toneText, type Tone } from '../marks/tones'
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

const statusLooks: Partial<Record<Status, { label: string; tone: Tone }>> = {
  running: { label: 'Running', tone: 'run' },
  merging: { label: 'Merging', tone: 'run' },
  waiting: { label: 'Needs you', tone: 'warning' },
  ready: { label: 'Ready', tone: 'success' },
  done: runLooks.done,
  failed: runLooks.failed,
  stopped: runLooks.stopped,
}

export const workStatus = (status: Status | undefined) => {
  const shown = status && statusLooks[status]
  if (!shown) return null
  const lead = shown.tone === 'run' ? spinner('xs') : dot(shown.tone)
  return span({ class: ['flex shrink-0 items-center gap-1.5 text-xs', toneText[shown.tone]] }, lead, shown.label)
}

export interface RowPlaceProps {
  label: Child
  mark?: Child
}

export type RowForm = 'stacked' | 'line'

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
  form?: RowForm
}

export type WorkRowProps = Props<HTMLButtonElement> & {
  current?: MaybeReactive<boolean>
  large?: boolean
  surface?: Surface
}

const secondLine = (large: boolean, { detail, place, status, trail }: Pick<WorkRowBody, 'detail' | 'place' | 'status' | 'trail'>) => {
  if (!detail && !place && !status && !trail) return null
  const left = detail ? span({ class: 'min-w-0 truncate' }, detail) : (place ? span({ class: 'inline-flex max-w-1/2 shrink-0 items-center gap-1.5' }, place.mark ?? null, span({ class: 'min-w-0 truncate' }, place.label)) : null)
  const trailing = trail ? span({ class: 'flex min-w-0 items-center gap-2' }, trail) : null
  const right = status || trail ? span({ class: 'ml-auto flex min-w-0 items-center justify-end gap-2' }, trailing, workStatus(status)) : null
  return div({ class: ['flex min-w-0 items-center gap-1.5 text-neutral-500', large ? 'text-sm' : 'text-xs'] }, left, right)
}

const endOf = (end: Child | undefined, at: number | undefined) => end ?? (at === undefined ? null : age(at))

const titleOf = (title: Child, large: boolean) => span({ class: 'flex min-w-0 flex-1' }, large ? largeRowTitle(title) : rowTitle(title))

const stackedBody = ({ title, lead, end, at, large = false, ...rest }: WorkRowBody) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-px' },
    div({ class: 'flex min-w-0 items-center gap-2' }, lead ?? null, titleOf(title, large), endOf(end, at)),
    secondLine(large, rest),
  )

const lineBody = ({ title, lead, end, at, place, status, large = false }: WorkRowBody) =>
  div(
    { class: 'flex min-w-0 flex-1 items-center gap-2' },
    lead ?? null,
    place?.mark ?? null,
    titleOf(title, large),
    endOf(end, at),
    workStatus(status),
  )

export const workRowBody = (body: WorkRowBody) => (body.form === 'line' ? lineBody(body) : stackedBody(body))

export interface RowBodyLook {
  large?: boolean
  form?: RowForm
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

const bodyOf = (row: Row, { large, form }: RowBodyLook) =>
  workRowBody({
    title: row.label,
    large,
    form,
    lead: row.lead?.(),
    end: row.end ? span({ class: 'flex shrink-0 tabular-nums' }, metaLine(row.end)) : undefined,
    at: row.at,
    detail: row.detail?.(),
    place: row.place && { label: row.place.label, mark: row.place.mark?.() },
    status: row.status,
    trail: row.trail?.(),
  })

export const rowBody = (row: () => Row, look: RowBodyLook = {}) => dynamicChild(looksOf(row), shown => bodyOf(shown, look))

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
