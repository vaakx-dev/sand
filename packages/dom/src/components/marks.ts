import { duration } from '@sand/kit'
import { div, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { clock } from '../reactive/owned'
import { read } from '../reactive/read'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'orange'

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-neutral-800 text-neutral-400',
  accent: 'bg-accent-950 text-accent-300',
  success: 'bg-success-950 text-success-400',
  warning: 'bg-warning-950 text-warning-400',
  danger: 'bg-danger-950 text-danger-400',
  orange: 'bg-neutral-800 text-orange-400',
}

const dotTones: Record<Tone, string> = {
  neutral: 'bg-neutral-500',
  accent: 'bg-accent-400',
  success: 'bg-success-400',
  warning: 'bg-warning-400',
  danger: 'bg-danger-400',
  orange: 'bg-orange-400',
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
