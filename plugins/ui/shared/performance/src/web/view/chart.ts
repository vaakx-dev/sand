import { div, span } from '@vaakx-dev/vrui'
import type { Bar } from '../../contract'
import { band } from './band'

const percentHeight = (fraction: number) => ({ height: `${Math.max(2, fraction * 100)}%` })

const pair = (bar: Bar | null) =>
  div(
    { class: 'flex h-full flex-1 items-end gap-px' },
    bar ? [div({ class: 'flex-1 rounded-t-sm bg-neutral-600', style: percentHeight(bar.cpu) }), div({ class: 'flex-1 rounded-t-sm bg-sky-500 opacity-50', style: percentHeight(bar.memory) })] : null,
  )

const key = (look: string, label: string) => span({ class: 'flex items-center gap-1.5' }, span({ class: ['h-1 w-3 rounded-full', look] }), label)

export const chart = (bars: (Bar | null)[]) =>
  band(
    'flex flex-col gap-2',
    div({ class: 'flex gap-4 text-xs text-neutral-500' }, key('bg-neutral-600', 'CPU'), key('bg-sky-500 opacity-50', 'Memory used')),
    div({ class: 'flex h-20 items-end gap-1 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 pt-1.5', role: 'img', 'aria-label': 'CPU and memory over time' }, bars.map(pair)),
  )
