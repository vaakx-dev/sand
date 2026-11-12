import type { MenuAction, MenuChoice } from '@sand/ui-shell/contract'
import { errorMessage } from '@sand/util'
import { div, p, show, sig, span, type Child } from '@vaakx-dev/vrui'
import { dangerAction, secondaryAction } from '../buttons/button'
import { menuSeparator } from '../menus/menu'
import { errorText } from '../notes/notes'
import { menuIcon, menuItem, menuSizes } from '../menus/menu-item'
import { askView } from './ask'
import { choiceChips, type ChipHandlers } from './chips'

export type ItemSize = 'sm' | 'md'

export type MenuStep = { kind: 'confirm' | 'ask'; action: MenuAction }

export interface MenuControl {
  close(): void
  step(step: MenuStep): void
  armed(event: MouseEvent): boolean
}

const finish = (control: MenuControl, run: () => void | Promise<unknown>) => {
  control.close()
  void run()
}

export const firstStep = (actions: MenuAction[], step?: string): MenuStep | undefined => {
  const action = step ? actions.find(candidate => candidate.id === step) : undefined
  if (action?.confirm) return { kind: 'confirm', action }
  return action?.ask ? { kind: 'ask', action } : undefined
}

export const choose = (control: MenuControl, action: MenuAction) => (event: MouseEvent) => {
  if (!control.armed(event)) return
  if (action.confirm) return control.step({ kind: 'confirm', action })
  if (action.ask && !action.choices) return control.step({ kind: 'ask', action })
  finish(control, () => action.run())
}

export const chipHandlers = (control: MenuControl, action: MenuAction): ChipHandlers => ({
  pick(choice, event) {
    if (control.armed(event)) finish(control, () => choice.run())
  },
  ask(event) {
    if (control.armed(event)) control.step({ kind: 'ask', action })
  },
})

const label = (action: MenuAction) => span({ class: 'min-w-0 flex-1 truncate' }, action.label)

const item = (action: MenuAction, control: MenuControl, size: ItemSize) =>
  menuItem(
    { role: 'menuitem', size, tone: action.danger ? 'danger' : undefined, icon: action.icon, onClick: choose(control, action) },
    label(action),
  )

const choiceRow = (action: MenuAction, control: MenuControl, size: ItemSize) =>
  div(
    { class: ['flex items-center gap-3 rounded-md text-neutral-100', menuSizes[size]] },
    action.icon ? menuIcon(action.icon) : null,
    label(action),
    choiceChips(action, chipHandlers(control, action), 'sm'),
  )

export const menuItems = (actions: MenuAction[], control: MenuControl, size: ItemSize): Child[] =>
  actions.flatMap((action, index) => [
    index > 0 && action.group !== actions[index - 1]?.group ? menuSeparator() : null,
    action.choices && !action.confirm ? choiceRow(action, control, size) : item(action, control, size),
  ])

const outcome = async (run: MenuChoice['run']) => {
  try {
    await run()
    return undefined
  } catch (error) {
    return errorMessage(error)
  }
}

const confirmView = (action: MenuAction, control: MenuControl, back: () => void, size: ItemSize) => {
  const busy = sig(false)
  const failure = sig<string | undefined>(undefined)
  const press = (run: MenuChoice['run']) => async () => {
    busy.set(true)
    failure.set(undefined)
    const problem = await outcome(run)
    if (problem === undefined) return control.close()
    failure.set(problem)
    busy.set(false)
  }
  const answers = action.choices ?? [action]
  return div(
    { class: 'flex flex-col gap-3 p-2' },
    p({ class: 'text-sm text-neutral-100' }, action.confirm),
    show(() => failure.get() !== undefined, () => errorText(() => failure.get())),
    div(
      { class: 'flex flex-wrap justify-end gap-2' },
      secondaryAction({ size, onClick: back, onMount: node => node.focus() }, 'Cancel'),
      ...answers.map(answer => dangerAction({ size, disabled: busy, onClick: press(answer.run) }, answer.label)),
    ),
  )
}

export const stepView = (step: MenuStep, control: MenuControl, back: () => void, size: ItemSize) => {
  if (step.kind === 'confirm') return confirmView(step.action, control, back, size)
  return step.action.ask ? askView(step.action.ask, control.close, size) : null
}
