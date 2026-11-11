import type { Status } from '@sand/ui-shell/contract'
import { div, p, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
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
  const left = detail ?? (place ? span({ class: 'inline-flex min-w-0 items-center gap-1.5' }, place.mark ?? null, span({ class: 'min-w-0 truncate' }, place.label)) : null)
  const right = status || trail ? span({ class: 'ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2' }, workStatus(status), trail) : null
  return div({ class: ['flex min-w-0 items-center gap-1.5 text-neutral-500', large ? 'text-sm' : 'text-xs'] }, left, right)
}

export const workRowBody = ({ title, lead, end, large = false, ...rest }: WorkRowBody) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-px' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      lead ?? null,
      span({ class: 'flex min-w-0 flex-1' }, large ? largeRowTitle(title) : rowTitle(title)),
      end ?? null,
    ),
    secondLine(large, rest),
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
