import { duration } from '@sand/util'
import { clock, div, dynamicChild, read, show, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon, type IconSize } from '../icons/lucide'
import { toneText, type Tone } from './tones'

export type { Tone } from './tones'

const badgeFills: Record<Tone, string> = {
  neutral: 'bg-neutral-700',
  accent: 'bg-accent-950',
  success: 'bg-success-950',
  warning: 'bg-warning-950',
  danger: 'bg-danger-950',
}

const badgeLook = 'inline-flex items-center gap-1 rounded-md px-2 text-xs whitespace-nowrap'

export const badge = (tone: Tone, ...children: Child[]) => span({ class: [badgeLook, 'shrink-0', badgeFills[tone], toneText[tone]] }, ...children)

export const shrinkBadge = (tone: Tone, ...children: Child[]) => span({ class: [badgeLook, 'min-w-0 max-w-full', badgeFills[tone], toneText[tone]] }, ...children)

export const dot = (tone: Tone) => span({ class: ['h-2 w-2 shrink-0 rounded-full bg-current', toneText[tone]] })

export const withDot = (glyph: Child, on: () => boolean) =>
  span({ class: 'relative inline-flex shrink-0' }, glyph, show(on, () => span({ class: 'absolute -top-1 -right-1 flex' }, dot('accent'))))

export const spinner = (size: IconSize = 'sm') =>
  span(
    { class: 'inline-flex shrink-0' },
    span({ class: 'inline-flex animate-spin motion-reduce:hidden' }, icon('loader', size)),
    span({ class: 'hidden motion-reduce:inline-flex' }, icon('working', size)),
  )

export const working = (size: IconSize = 'sm', title: MaybeReactive<string> = 'Working') => span({ class: 'inline-flex shrink-0 text-accent-400', title }, icon('working', size))

export const elapsed = (start: MaybeReactive<number | undefined>) => {
  const now = clock()
  return span({ class: 'tabular-nums' }, () => {
    const at = read(start)
    return at ? duration(Math.max(0, now.get() - at)) : ''
  })
}

export const chevron = (open: () => boolean, size: IconSize = 'sm') => span({ class: ['inline-flex shrink-0', () => (open() ? 'rotate-90' : '')] }, icon('right', size))

export const okMark = (size: IconSize = 'sm') => span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', size))

export const doneMark = () =>
  span({ class: 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-950 text-success-400' }, icon('check', 'lg'))

export const starMark = (on: MaybeReactive<boolean>, size: IconSize = 'md') =>
  span(
    { class: ['inline-flex shrink-0', () => (read(on) ? 'text-neutral-100' : 'text-neutral-500')], 'aria-hidden': 'true' },
    dynamicChild(
      () => read(on),
      filled => icon('star', size, filled),
    ),
  )

export const checkMark = (on: () => boolean, extra?: ClassValue) =>
  span(
    {
      class: [
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md',
        () => (on() ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-900 text-transparent ring-1 ring-inset ring-neutral-700'),
        extra,
      ],
    },
    icon('check', 'xs'),
  )

export const progressSteps = (count: number, reached: number) =>
  div(
    { class: 'flex items-center gap-1', role: 'progressbar', 'aria-label': `Step ${reached} of ${count}`, 'aria-valuemin': '1', 'aria-valuemax': String(count), 'aria-valuenow': String(reached) },
    Array.from({ length: count }, (_, index) => span({ class: ['h-1 w-5 rounded-full', index < reached ? 'bg-accent-400' : 'bg-neutral-700'] })),
  )

export interface StatusLineProps {
  mark: Child
  text: Child
  title: MaybeReactive<string>
}

export const statusLine = ({ mark, text, title }: StatusLineProps, ...extra: Child[]) =>
  div({ class: 'flex min-w-0 items-center gap-2 text-xs text-neutral-400', title }, mark, span({ class: 'min-w-0 truncate' }, text), ...extra)
