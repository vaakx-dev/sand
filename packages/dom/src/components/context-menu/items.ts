import { div, p, span, type Child } from '@vaakx-dev/vrui'
import { icon } from '../../icons/lucide'
import type { NavAction } from '../../shell/nav/types'
import { controlButton, rowButton, secondaryAction } from '../button'
import { menuSeparator } from '../menu'
import { askView } from './ask'
import { choiceChips, type ChipHandlers } from './chips'

export type ItemSize = 'sm' | 'md'

export type MenuStep = { kind: 'confirm' | 'ask'; action: NavAction }

export interface MenuControl {
  close(): void
  step(step: MenuStep): void
  armed(event: MouseEvent): boolean
}

const finish = (control: MenuControl, run: () => void | Promise<unknown>) => {
  control.close()
  void run()
}

export const firstStep = (actions: NavAction[], ask?: string): MenuStep | undefined => {
  const action = ask ? actions.find(candidate => candidate.id === ask && candidate.ask) : undefined
  return action ? { kind: 'ask', action } : undefined
}

export const choose = (control: MenuControl, action: NavAction) => (event: MouseEvent) => {
  if (!control.armed(event)) return
  if (action.confirm) return control.step({ kind: 'confirm', action })
  if (action.ask && !action.choices) return control.step({ kind: 'ask', action })
  finish(control, () => action.run())
}

export const chipHandlers = (control: MenuControl, action: NavAction): ChipHandlers => ({
  pick(choice, event) {
    if (control.armed(event)) finish(control, () => choice.run())
  },
  ask(event) {
    if (control.armed(event)) control.step({ kind: 'ask', action })
  },
})

const rowSize = (size: ItemSize) => (size === 'sm' ? 'min-h-8 px-2 text-xs' : 'min-h-12 px-3 text-sm')

const label = (action: NavAction, size: ItemSize) => [
  icon(action.icon ?? 'right', size === 'sm' ? 14 : 16),
  span({ class: 'min-w-0 flex-1 truncate' }, action.label),
]

const item = (action: NavAction, control: MenuControl, size: ItemSize) =>
  rowButton(
    {
      role: 'menuitem',
      class: [
        'gap-3 rounded-lg',
        rowSize(size),
        action.danger
          ? 'text-danger-400 hover:bg-danger-950 hover:text-danger-300 focus-visible:bg-danger-950'
          : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus-visible:bg-neutral-700',
      ],
      onClick: choose(control, action),
    },
    ...label(action, size),
  )

const choiceRow = (action: NavAction, control: MenuControl, size: ItemSize) =>
  div(
    { class: ['flex items-center gap-3 rounded-lg text-neutral-300', rowSize(size)] },
    ...label(action, size),
    choiceChips(action, chipHandlers(control, action), 'sm'),
  )

export const menuItems = (actions: NavAction[], control: MenuControl, size: ItemSize): Child[] =>
  actions.flatMap((action, index) => [
    index > 0 && action.group !== actions[index - 1]?.group ? menuSeparator() : null,
    action.choices ? choiceRow(action, control, size) : item(action, control, size),
  ])

const confirmView = (action: NavAction, control: MenuControl, back: () => void, size: ItemSize) =>
  div(
    { class: 'flex flex-col gap-3 p-2' },
    p({ class: 'text-sm text-neutral-300' }, action.confirm),
    div(
      { class: 'flex justify-end gap-2' },
      secondaryAction({ size, onClick: back, onMount: node => node.focus() }, 'Cancel'),
      controlButton('font-medium bg-danger-500 text-white hover:bg-danger-600', { size, onClick: () => finish(control, () => action.run()) }, action.label),
    ),
  )

export const stepView = (step: MenuStep, control: MenuControl, back: () => void, size: ItemSize) => {
  if (step.kind === 'confirm') return confirmView(step.action, control, back, size)
  return step.action.ask ? askView(step.action.ask, control.close, size) : null
}
