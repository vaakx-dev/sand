import type { NavAction } from '@sand/dom'
import { controlButton, div, el, icon, rowButton, secondaryAction, span, type Child } from '@sand/dom'
import { choiceChips, type ChipHandlers } from './chips'

export type ItemSize = 'sm' | 'md'

export type MenuStep = { kind: 'confirm' | 'ask'; action: NavAction }

export interface MenuControl {
  close(): void
  step(step: MenuStep): void
  armed(event: MouseEvent): boolean
}

const sizes: Record<ItemSize, string> = {
  sm: 'min-h-8 px-2 text-xs',
  md: 'min-h-12 px-3 text-sm',
}

const tone = (action: NavAction) =>
  action.danger ? 'text-danger-400 hover:bg-danger-950 hover:text-danger-300 focus-visible:bg-danger-950' : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus-visible:bg-neutral-700'

const finish = (control: MenuControl, run: () => void | Promise<unknown>) => {
  control.close()
  void run()
}

export const choose = (control: MenuControl, action: NavAction) => (event: MouseEvent) => {
  if (!control.armed(event)) return
  if (action.confirm) return control.step({ kind: 'confirm', action })
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

const item = (action: NavAction, control: MenuControl, size: ItemSize) =>
  rowButton(
    { role: 'menuitem', class: ['gap-3 rounded-lg', sizes[size], tone(action)], onClick: choose(control, action) },
    icon(action.icon ?? 'right', size === 'sm' ? 14 : 16),
    span({ class: 'min-w-0 flex-1 truncate' }, action.label),
  )

const choiceRow = (action: NavAction, control: MenuControl, size: ItemSize) =>
  div(
    { class: ['flex items-center gap-3 rounded-lg text-neutral-300', sizes[size]] },
    icon(action.icon ?? 'right', size === 'sm' ? 14 : 16),
    span({ class: 'min-w-0 flex-1 truncate' }, action.label),
    choiceChips(action, chipHandlers(control, action), 'sm'),
  )

const separator = () => div({ role: 'separator', class: 'mx-2 my-1 h-px bg-neutral-700' })

export const menuItems = (actions: NavAction[], control: MenuControl, size: ItemSize): Child[] =>
  actions.flatMap((action, index) => [
    index && action.group !== actions[index - 1]?.group ? separator() : null,
    action.choices ? choiceRow(action, control, size) : item(action, control, size),
  ])

export const confirmView = (action: NavAction, control: MenuControl, back: () => void, size: ItemSize) =>
  div(
    { class: 'flex flex-col gap-3 p-2' },
    el('p', { class: 'text-sm text-neutral-300' }, action.confirm),
    div(
      { class: 'flex justify-end gap-2' },
      secondaryAction({ size, onClick: back, onMount: node => node.focus() }, 'Cancel'),
      controlButton('font-medium bg-danger-500 text-white hover:bg-danger-600', { size, onClick: () => finish(control, () => action.run()) }, action.label),
    ),
  )

const step = (node: HTMLElement, move: (index: number, count: number) => number) => {
  const items = [...node.querySelectorAll<HTMLElement>('[role="menuitem"]')]
  if (!items.length) return
  const index = items.indexOf(document.activeElement as HTMLElement)
  items[(move(index, items.length) + items.length) % items.length]?.focus()
}

const moves: Record<string, (index: number, count: number) => number> = {
  ArrowDown: index => index + 1,
  ArrowUp: index => (index < 0 ? -1 : index - 1),
  Home: () => 0,
  End: (_, count) => count - 1,
}

export const arrowKeys = (event: KeyboardEvent) => {
  const move = moves[event.key]
  if (!move || event.target instanceof HTMLInputElement) return
  event.preventDefault()
  step(event.currentTarget as HTMLElement, move)
}

export const focusFirst = (node: HTMLElement) => node.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

export const returnFocus = (node: HTMLElement, from: HTMLElement) => () => {
  const active = document.activeElement
  const lost = !active || active === document.body || node.contains(active)
  if (from.isConnected && lost) from.focus()
}

export const firstStep = (actions: NavAction[], ask?: string): MenuStep | undefined => {
  const action = ask ? actions.find(candidate => candidate.id === ask && candidate.ask) : undefined
  return action ? { kind: 'ask', action } : undefined
}
