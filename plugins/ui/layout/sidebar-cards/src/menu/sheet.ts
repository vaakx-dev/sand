import type { NavAction, NavItem } from '@sand/dom'
import { button, dismissible, div, dynamicChild, event, focusable, icon, layer, sig, span, tildeHome, type Sig } from '@sand/dom'
import { askView } from './ask'
import { choiceChips, choiceCount } from './chips'
import { arrowKeys, chipHandlers, choose, confirmView, firstStep, menuItems, returnFocus, type MenuControl, type MenuStep } from './items'
import type { MenuRequest } from './view'

const head = (item: NavItem) =>
  div(
    { class: 'px-3 pt-1 pb-3' },
    div({ class: 'truncate text-sm font-semibold text-neutral-100' }, item.title),
    div({ class: 'truncate text-xs text-neutral-500' }, [item.project, tildeHome(item.path ?? '')].filter(Boolean).join(' · ')),
  )

const tileLook = (action: NavAction, open: boolean) =>
  action.active || open ? 'bg-accent-950 text-accent-300' : action.danger ? 'bg-danger-950 text-danger-400' : 'bg-neutral-700 text-neutral-300'

const tile = (action: NavAction, control: MenuControl, expanded: Sig<string | undefined>) => {
  const open = () => expanded.get() === action.id
  return button(
    {
      type: 'button',
      role: 'menuitem',
      'aria-pressed': () => action.active || open(),
      class: [focusable, 'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-3 text-xs transition-colors', () => tileLook(action, open())],
      onClick: (event: MouseEvent) => {
        if (!action.choices) return choose(control, action)(event)
        if (control.armed(event)) expanded.set(open() ? undefined : action.id)
      },
    },
    icon(action.icon ?? 'right', 18),
    span({ class: 'max-w-full truncate' }, action.label),
  )
}

const tiles = (actions: NavAction[], control: MenuControl, expanded: Sig<string | undefined>) =>
  div(
    { class: 'grid gap-2 px-1 pb-2', style: { gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` } },
    ...actions.map(action => tile(action, control, expanded)),
  )

const chipsFor = (actions: NavAction[], control: MenuControl, expanded: Sig<string | undefined>) =>
  dynamicChild(expanded, id => {
    const action = actions.find(candidate => candidate.id === id)
    if (!action) return span({ hidden: true })
    return div(
      { class: 'px-1 pb-2' },
      choiceChips(action, chipHandlers(control, action), 'lg', {
        class: 'grid gap-2',
        style: { gridTemplateColumns: `repeat(${choiceCount(action)}, minmax(0, 1fr))` },
      }),
    )
  })

const choices = (actions: NavAction[], control: MenuControl, expand?: string) => {
  const expanded = sig<string | undefined>(expand)
  const big = actions.filter(action => action.quick || action.tile)
  const rest = actions.filter(action => !action.quick && !action.tile)
  return div(
    big.length ? tiles(big, control, expanded) : null,
    chipsFor(big, control, expanded),
    rest.length ? div({ class: 'flex flex-col border-t border-neutral-700 pt-1' }, ...menuItems(rest, control, 'md')) : null,
  )
}

export const menuSheet = (request: MenuRequest, actions: NavAction[], close: () => void) => {
  const current = sig<MenuStep | undefined>(firstStep(actions, request.ask))
  let pressed = Boolean(current.get())
  const control: MenuControl = {
    close,
    step: next => current.set(next),
    armed: event => pressed || event.detail === 0,
  }
  const stepView = (step: MenuStep) =>
    step.kind === 'confirm' ? confirmView(step.action, control, () => current.set(undefined), 'md') : step.action.ask ? askView(step.action.ask, close, 'md') : null
  return div(
    {
      class: [layer.dialog, 'fixed inset-0 flex items-end bg-black/50 animate-fade'],
      onPointerDown: event(close, { self: true }),
      onMount: node => {
        const stopEscape = dismissible(node, close)
        const refocus = returnFocus(node, request.from)
        return () => {
          stopEscape()
          refocus()
        }
      },
    },
    div(
      {
        role: 'menu',
        'aria-label': request.row.item.title,
        class: 'w-full bg-neutral-800 px-2 pt-2 ring-1 ring-neutral-700 animate-rise',
        style: { borderRadius: '1rem 1rem 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' },
        onPointerDown: () => {
          pressed = true
        },
        onKeyDown: arrowKeys,
      },
      div({ class: 'mx-auto mb-2 h-1 w-8 rounded-full bg-neutral-600' }),
      head(request.row.item),
      dynamicChild(current, step => (step ? div(stepView(step)) : choices(actions, control, request.expand))),
    ),
  )
}
