import { modal } from '../layers/stack'
import type { NavAction } from '@sand/nav/contract'
import type { MenuRequest } from '../contract'
import { div, dynamicChild, event, sig, span, type Sig } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { layer } from '../layer'
import { chipButtons, choiceCount } from './chips'
import { chipHandlers, choose, firstStep, menuItems, stepView, type MenuControl, type MenuStep } from './items'
import { arrowKeys } from './keyboard'

type Expanded = Sig<string | undefined>

const columns = (count: number) => ({ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` })

const head = ({ title, subtitle }: MenuRequest) =>
  div(
    { class: 'px-3 pt-1 pb-3' },
    div({ class: 'truncate text-sm font-semibold text-neutral-100' }, title),
    subtitle ? div({ class: 'truncate text-xs text-neutral-500' }, subtitle) : null,
  )

const tileTone = (action: NavAction, open: boolean) => {
  if (action.active || open) return 'bg-accent-950 text-accent-300'
  return action.danger ? 'bg-danger-950 text-danger-400' : 'bg-neutral-700 text-neutral-300'
}

const tile = (action: NavAction, control: MenuControl, expanded: Expanded) => {
  const open = () => expanded.get() === action.id
  return plainButton(
    {
      role: 'menuitem',
      'aria-pressed': () => action.active || open(),
      class: ['flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-3 text-xs transition-colors', () => tileTone(action, open())],
      onClick: (event: MouseEvent) => {
        if (!action.choices) return choose(control, action)(event)
        if (control.armed(event)) expanded.set(open() ? undefined : action.id)
      },
    },
    icon(action.icon ?? 'right', 18),
    span({ class: 'max-w-full truncate' }, action.label),
  )
}

const tiles = (actions: NavAction[], control: MenuControl, expanded: Expanded) =>
  div({ class: 'grid gap-2 px-1 pb-2', style: columns(actions.length) }, ...actions.map(action => tile(action, control, expanded)))

const expandedChips = (actions: NavAction[], control: MenuControl, expanded: Expanded) =>
  dynamicChild(expanded, id => {
    const action = actions.find(candidate => candidate.id === id)
    if (!action) return null
    return div(
      { class: 'px-1 pb-2' },
      span({ class: 'grid gap-2', style: columns(choiceCount(action)) }, ...chipButtons(action, chipHandlers(control, action), 'lg')),
    )
  })

const choices = (actions: NavAction[], control: MenuControl, expand?: string) => {
  const expanded = sig<string | undefined>(expand)
  const big = actions.filter(action => action.quick || action.tile)
  const rest = actions.filter(action => !action.quick && !action.tile)
  return div(
    big.length ? tiles(big, control, expanded) : null,
    expandedChips(big, control, expanded),
    rest.length ? div({ class: ['flex flex-col', big.length ? 'border-t border-neutral-700 pt-1' : ''] }, ...menuItems(rest, control, 'md')) : null,
  )
}

export const menuSheet = (request: MenuRequest, close: () => void) => {
  const { actions } = request
  const current = sig<MenuStep | undefined>(firstStep(actions, request.ask))
  let pressed = Boolean(current.get())
  const control: MenuControl = {
    close,
    step: next => current.set(next),
    armed: event => pressed || event.detail === 0,
  }
  return div(
    {
      class: [layer.dialog, 'fixed inset-0 flex items-end bg-black/50 animate-fade'],
      'data-menu-layer': '',
      onPointerDown: event(close, { self: true }),
      onMount: node => modal(node, close, request.from),
    },
    div(
      {
        role: 'menu',
        'aria-label': request.title,
        class: 'w-full rounded-t-2xl bg-neutral-800 px-2 pt-2 ring-1 ring-neutral-700 animate-rise',
        style: { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' },
        onPointerDown: () => {
          pressed = true
        },
        onKeyDown: arrowKeys,
      },
      div({ class: 'mx-auto mb-2 h-1 w-8 rounded-full bg-neutral-600' }),
      head(request),
      dynamicChild(current, step => (step ? div(stepView(step, control, () => current.set(undefined), 'md')) : choices(actions, control, request.expand))),
    ),
  )
}
