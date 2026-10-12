import { div, p, span, type Child } from '@vaakx-dev/vrui'
import type { NavAction } from '../../shell/nav/types'
import { dangerAction, secondaryAction } from '../button'
import { menuSeparator } from '../menu'
import { menuIcon, menuItem, menuSizes } from '../menu-item'
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

const label = (action: NavAction) => span({ class: 'min-w-0 flex-1 truncate' }, action.label)

const item = (action: NavAction, control: MenuControl, size: ItemSize) =>
  menuItem(
    { role: 'menuitem', size, tone: action.danger ? 'danger' : undefined, icon: action.icon ?? 'right', onClick: choose(control, action) },
    label(action),
  )

const choiceRow = (action: NavAction, control: MenuControl, size: ItemSize) =>
  div(
    { class: ['flex items-center gap-3 rounded-lg text-neutral-300', menuSizes[size]] },
    menuIcon(action.icon ?? 'right', size),
    label(action),
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
      dangerAction({ size, onClick: () => finish(control, () => action.run()) }, action.label),
    ),
  )

export const stepView = (step: MenuStep, control: MenuControl, back: () => void, size: ItemSize) => {
  if (step.kind === 'confirm') return confirmView(step.action, control, back, size)
  return step.action.ask ? askView(step.action.ask, control.close, size) : null
}
