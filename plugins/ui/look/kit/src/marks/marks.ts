import { duration } from '@sand/util'
import { clock, div, dynamicChild, read, show, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'
import { icon, type IconSize } from '../icons/lucide'
import { toneText, type Tone } from './tones'

export type { Tone } from './tones'

const badgeLook = 'inline-flex items-center gap-1 text-xs whitespace-nowrap'

export const badge = (tone: Tone, ...children: Child[]) => span({ class: [badgeLook, 'shrink-0', toneText[tone]] }, ...children)

export const shrinkBadge = (tone: Tone, ...children: Child[]) => span({ class: [badgeLook, 'min-w-0 max-w-full', toneText[tone]] }, ...children)

export const dot = (tone: Tone) => span({ class: ['h-1.5 w-1.5 shrink-0 rounded-full bg-current', toneText[tone]] })

export const withDot = (glyph: Child, on: () => boolean) =>
  span({ class: 'relative inline-flex shrink-0' }, glyph, show(on, () => span({ class: 'absolute -top-1 -right-1 flex' }, dot('accent'))))

export const spinner = (size: IconSize = 'sm') =>
  span(
    { class: 'inline-flex shrink-0' },
    span({ class: 'inline-flex animate-spin motion-reduce:hidden' }, icon('loader', size)),
    span({ class: 'hidden motion-reduce:inline-flex' }, icon('working', size)),
  )

export const elapsed = (start: MaybeReactive<number | undefined>) => {
  const now = clock()
  return span({ class: 'tabular-nums' }, () => {
    const at = read(start)
    return at ? duration(Math.max(0, now.get() - at)) : ''
  })
}

export const chevron = (open: () => boolean, size: IconSize = 'sm') => span({ class: ['inline-flex shrink-0', () => (open() ? 'rotate-90' : '')] }, icon('right', size))

export const opensMark = () => span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 'sm'))

export const okMark = (size: IconSize = 'sm') => span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', size))

const roundTones: Record<Tone, string> = {
  neutral: 'bg-neutral-800 text-neutral-400',
  accent: 'bg-accent-950 text-accent-400',
  success: 'bg-success-950 text-success-400',
  warning: 'bg-warning-950 text-warning-400',
  danger: 'bg-danger-950 text-danger-400',
  merged: 'bg-violet-950 text-violet-400',
  run: 'bg-info-950 text-info-400',
}

const roundSizes = { md: 'h-8 w-8', lg: 'h-10 w-10' }

export const roundMark = (tone: Tone, glyph: Child, size: keyof typeof roundSizes = 'md') =>
  span({ class: ['inline-flex shrink-0 items-center justify-center rounded-full', roundSizes[size], roundTones[tone]] }, glyph)

export const doneMark = () => roundMark('success', icon('check', 'lg'), 'lg')

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
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm',
        () => (on() ? 'bg-accent-500 text-accent-950' : 'bg-neutral-900 text-transparent ring-1 ring-inset ring-neutral-700'),
        extra,
      ],
    },
    icon('check', 'xs'),
  )

export const progressSteps = (count: number, reached: number) =>
  div(
    { class: 'flex items-center gap-1', role: 'progressbar', 'aria-label': `Step ${reached} of ${count}`, 'aria-valuemin': '1', 'aria-valuemax': String(count), 'aria-valuenow': String(reached) },
    Array.from({ length: count }, (_, index) => span({ class: ['h-1 w-5 rounded-full', index < reached ? 'bg-neutral-100' : 'bg-neutral-700'] })),
  )

export interface StatusLineProps {
  mark: Child
  text: Child
  title: MaybeReactive<string>
}

export const statusLine = ({ mark, text, title }: StatusLineProps, ...extra: Child[]) =>
  div({ class: ['flex min-w-0 items-center gap-2', metaLook], title }, mark, span({ class: 'min-w-0 truncate' }, text), ...extra)
