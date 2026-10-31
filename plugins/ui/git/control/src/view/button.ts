import { repoOf } from '@sand/git/contract'
import { derive, dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'
import { actionMenu } from './menu'

const menuLabel = 'Git actions'

const splitView = (parts: ControlParts) => {
  const { kit, model, runs, next } = parts
  const run = () => runs.at(model.place.get())
  const glyph = next.map(action => (action?.busy ? undefined : action?.icon))
  const title = () => {
    const action = next.get()
    if (action?.busy) return run()?.line ?? action.label
    return action?.reason ?? action?.title ?? action?.label ?? ''
  }
  return kit.splitButton(
    {
      title,
      disabled: () => next.get()?.disabled ?? true,
      busy: () => next.get()?.busy ?? false,
      menu: close => actionMenu(parts, close),
      menuTitle: menuLabel,
      onClick: () => {
        const action = next.get()
        if (action && !action.disabled) action.run()
      },
    },
    dynamicChild(glyph, name => (name ? kit.icon(name, 14) : null)),
    span({ class: 'hidden md:inline' }, () => next.get()?.label ?? ''),
    span({ class: 'md:hidden' }, () => next.get()?.short ?? next.get()?.label ?? ''),
    show(
      () => Boolean(next.get()?.busy),
      () => span({ class: 'font-normal' }, kit.elapsed(() => run()?.started)),
    ),
  )
}

const menuView = (parts: ControlParts) => {
  const { kit } = parts
  return kit.dropdown({
    placement: 'below-right',
    class: 'shrink-0',
    items: close => actionMenu(parts, close),
    trigger: (press, open) => kit.iconButton({ ...press, active: open, title: menuLabel, 'aria-label': menuLabel }, kit.icon('more', 16)),
  })
}

type ButtonKind = 'split' | 'menu' | 'none'

const kindOf = (parts: ControlParts): ButtonKind => {
  if (parts.next.get()) return 'split'
  return repoOf(parts.model.status.get()) ? 'menu' : 'none'
}

export const actionButton = (parts: ControlParts) =>
  dynamicChild(
    derive(() => kindOf(parts)),
    kind => (kind === 'split' ? splitView(parts) : kind === 'menu' ? menuView(parts) : null),
  )
