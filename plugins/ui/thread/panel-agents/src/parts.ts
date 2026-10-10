import { div, duration, keys, show, span, type Child, type ClassValue, type Sig } from '@sand/dom'
import type { Run } from './runs'

export interface Actions {
  open(id: string): void
  cancel(run: Run): Promise<boolean>
  interrupt(id: string): Promise<boolean>
}

export const since = (started: number, ended: number | undefined, now: number) => duration(Math.max(0, (ended ?? now) - started))

export const skyDot = () => span({ class: 'h-2 w-2 shrink-0 rounded-full bg-sky-400' })

export const headline = (run: Sig<Run>) =>
  div({ class: 'truncate text-sm text-neutral-100', title: run.map(value => value.title) }, run.map(value => value.title))

export const subline = (text: () => string) => div({ class: 'truncate text-xs tabular-nums text-neutral-500' }, text)

export const noteLine = (text: Sig<string | undefined>, tone: string) =>
  show(
    text.map(Boolean),
    () => div({ class: ['truncate text-xs', tone], title: () => text.get() ?? '' }, () => text.get() ?? ''),
  )

export const markSlot = (...children: Child[]) => div({ class: 'flex h-5 shrink-0 items-center' }, ...children)

export const pressable = (press: () => void, enabled: () => boolean, extra: ClassValue, ...children: Child[]) => {
  const run = () => {
    if (enabled()) press()
  }
  return div(
    {
      role: () => (enabled() ? 'button' : undefined),
      tabIndex: () => (enabled() ? 0 : -1),
      class: [
        'w-full rounded-lg outline-none transition-colors',
        () => (enabled() ? 'cursor-pointer hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-accent-500' : ''),
        extra,
      ],
      onClick: run,
      onKeyDown: keys({ Enter: run, ' ': run }, { self: true }),
    },
    ...children,
  )
}
