import { button, span, stopThen, type ClassValue, type StyleMap } from '@vaakx-dev/vrui'
import type { NavAction, NavChoice } from '../../shell/nav/types'
import { focusable } from '../button'

export type ChipSize = 'sm' | 'lg'

export interface ChipHandlers {
  pick(choice: NavChoice, event: MouseEvent): void
  ask(event: MouseEvent): void
}

const looks: Record<ChipSize, string> = {
  sm: 'h-6 min-w-6 rounded-md px-1 text-xs text-neutral-400 hover:bg-neutral-600 hover:text-neutral-100 focus-visible:bg-neutral-600',
  lg: 'h-10 rounded-lg bg-neutral-700 text-sm text-neutral-200 hover:bg-neutral-600',
}

const chip = (label: string, title: string, size: ChipSize, onClick: (event: MouseEvent) => void) =>
  button(
    {
      type: 'button',
      role: 'menuitem',
      title,
      'aria-label': title ? `${label}, ${title}` : label,
      class: [focusable, 'inline-flex items-center justify-center font-medium tabular-nums transition-colors', looks[size]],
      onClick: stopThen(onClick),
    },
    label,
  )

export const choiceCount = (action: NavAction) => (action.choices?.length ?? 0) + (action.ask ? 1 : 0)

export const choiceChips = (action: NavAction, handlers: ChipHandlers, size: ChipSize, box: { class?: ClassValue; style?: StyleMap } = {}) =>
  span(
    { class: box.class ?? 'flex items-center gap-px', style: box.style },
    ...(action.choices ?? []).map(choice => chip(choice.label, choice.tip?.() ?? '', size, event => handlers.pick(choice, event))),
    action.ask ? chip('…', action.ask.tip, size, handlers.ask) : null,
  )
