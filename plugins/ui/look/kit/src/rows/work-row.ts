import type { Status } from '@sand/ui-shell/contract'
import { clock, div, p, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { largeRowTitle, rowTitle } from '../heads/text'
import { dot, spinner } from '../marks/marks'
import { toneText } from '../marks/tones'
import { placeLook, type Surface } from '../surface'

const minute = 60_000

export const shortAge = (ms: number) => {
  const minutes = Math.floor(ms / minute)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

const attention: Partial<Record<Status, { label: string; tone: 'run' | 'warning' | 'success' }>> = {
  running: { label: 'Working', tone: 'run' },
  merging: { label: 'Merging', tone: 'run' },
  waiting: { label: 'Needs you', tone: 'warning' },
  ready: { label: 'Ready', tone: 'success' },
}

export const workStatus = (status: Status | undefined, at?: number) => {
  const shown = status && attention[status]
  if (shown) {
    const lead = shown.tone === 'run' ? spinner('xs') : dot(shown.tone)
    return span({ class: ['flex shrink-0 items-center gap-1.5 text-xs', toneText[shown.tone]] }, lead, shown.label)
  }
  if (at === undefined) return null
  const now = clock(minute)
  return span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => shortAge(now.get() - at))
}

export interface RowPlaceProps {
  label: Child
  mark?: Child
}

export interface WorkRowBody {
  title: Child
  mark?: Child
  end?: Child
  place?: RowPlaceProps
  trail?: Child
  large?: boolean
}

export type WorkRowProps = Props<HTMLButtonElement> & {
  current?: MaybeReactive<boolean>
  large?: boolean
  surface?: Surface
}

const secondLine = (large: boolean, place?: RowPlaceProps, trail?: Child) =>
  place || trail
    ? div(
        { class: ['flex min-w-0 items-center gap-1.5 text-neutral-500', large ? 'text-sm' : 'text-xs'] },
        place?.mark ?? null,
        span({ class: 'min-w-0 flex-1 truncate' }, place?.label ?? ''),
        trail ? span({ class: 'flex shrink-0 items-center gap-2' }, trail) : null,
      )
    : null

export const workRowBody = ({ title, mark, end, place, trail, large = false }: WorkRowBody) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-px' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      mark ?? null,
      span({ class: 'flex min-w-0 flex-1' }, large ? largeRowTitle(title) : rowTitle(title)),
      end ?? null,
    ),
    secondLine(large, place, trail),
  )

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
