import { duration } from '@sand/kit'
import { clock, div, read, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'orange' | 'sky'

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-neutral-800 text-neutral-400',
  accent: 'bg-accent-950 text-accent-300',
  success: 'bg-success-950 text-success-400',
  warning: 'bg-warning-950 text-warning-400',
  danger: 'bg-danger-950 text-danger-400',
  orange: 'bg-neutral-800 text-orange-400',
  sky: 'bg-neutral-800 text-sky-400',
}

const dotTones: Record<Tone, string> = {
  neutral: 'bg-neutral-500',
  accent: 'bg-accent-400',
  success: 'bg-success-400',
  warning: 'bg-warning-400',
  danger: 'bg-danger-400',
  orange: 'bg-orange-400',
  sky: 'bg-sky-400',
}

export const badge = (tone: Tone, ...children: Child[]) =>
  span({ class: ['inline-flex shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap', badgeTones[tone]] }, ...children)

export const dot = (tone: Tone) => span({ class: ['h-2 w-2 shrink-0 rounded-full', dotTones[tone]] })

export const spinner = (size: 14 | 16 = 14) =>
  span({ class: 'spinner shrink-0' }, span({ class: 'spinner-turn animate-spin' }, icon('loader', size)), span({ class: 'spinner-still' }, icon('working', size)))

export const working = (size = 14, title: MaybeReactive<string> = 'Working') => span({ class: 'inline-flex shrink-0 text-accent-400', title }, icon('working', size))

export const elapsed = (start: MaybeReactive<number | undefined>) => {
  const now = clock()
  return span({ class: 'tabular-nums' }, () => {
    const at = read(start)
    return at ? duration(Math.max(0, now.get() - at)) : ''
  })
}

export const chevron = (open: () => boolean, size = 13) =>
  span({ class: ['inline-flex shrink-0 transition', () => (open() ? 'rotate-90' : '')] }, icon('right', size))

export const hint = (...children: Child[]) => div({ class: 'px-4 py-3 text-xs text-neutral-500' }, ...children)

export const okMark = (size: 14 | 16 = 14) => span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', size))

export const doneMark = () =>
  span({ class: 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-950 text-success-400' }, icon('check', 20))

export const checkMark = (on: () => boolean, extra?: ClassValue) =>
  span(
    {
      class: [
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors',
        () => (on() ? 'bg-accent-500 text-neutral-950' : 'text-transparent ring-1 ring-neutral-600'),
        extra,
      ],
    },
    icon('check', 12),
  )

export interface StatusLineProps {
  mark: Child
  text: Child
  title: MaybeReactive<string>
}

export const statusLine = ({ mark, text, title }: StatusLineProps, ...extra: Child[]) =>
  div({ class: 'flex min-w-0 items-center gap-2 text-xs text-neutral-500', title }, mark, span({ class: 'min-w-0 truncate' }, text), ...extra)
