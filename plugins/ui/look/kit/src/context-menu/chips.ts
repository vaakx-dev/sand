import type { NavAction, NavChoice } from '@sand/nav/contract'
import { span, stopThen } from '@vaakx-dev/vrui'
import { actionTones, controlButton } from '../buttons/button'
import { placeLook, type Surface } from '../surface'

export type ChipSize = 'sm' | 'lg'

export interface ChipHandlers {
  pick(choice: NavChoice, event: MouseEvent): void
  ask(event: MouseEvent): void
}

const menuSurface: Surface = 'raised'

const chipTones: Record<ChipSize, ReturnType<typeof placeLook> | string> = {
  sm: placeLook(false, menuSurface),
  lg: actionTones.secondary,
}

const chip = (label: string, title: string, size: ChipSize, onClick: (event: MouseEvent) => void) =>
  controlButton(
    chipTones[size],
    {
      size,
      role: 'menuitem',
      title,
      'aria-label': title ? `${label}, ${title}` : label,
      class: ['tabular-nums', size === 'sm' && 'min-w-6 px-1'],
      onClick: stopThen(onClick),
    },
    label,
  )

export const choiceCount = (action: NavAction) => (action.choices?.length ?? 0) + (action.ask ? 1 : 0)

export const chipButtons = (action: NavAction, handlers: ChipHandlers, size: ChipSize) => [
  ...(action.choices ?? []).map(choice => chip(choice.label, choice.tip?.() ?? '', size, event => handlers.pick(choice, event))),
  action.ask ? chip('…', action.ask.tip, size, handlers.ask) : null,
]

export const choiceChips = (action: NavAction, handlers: ChipHandlers, size: ChipSize) =>
  span({ class: 'flex items-center gap-px' }, ...chipButtons(action, handlers, size))
