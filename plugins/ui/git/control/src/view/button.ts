import { repoOf } from '@sand/git/contract'
import { derive, dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'
import { actionMenu } from './menu'

const menuLabel = 'Git actions'

const nextView = (parts: ControlParts) => {
  const { kit, model, runs, next } = parts
  const run = () => runs.at(model.place.get())
  const busy = () => Boolean(next.get()?.busy)
  const label = () => next.get()?.label ?? ''
  const title = () => (busy() ? (run()?.line ?? label()) : (next.get()?.title ?? label()))
  const glyph = derive(() => (busy() ? 'busy' : next.get()?.icon))
  return kit.quietButton(
    {
      title,
      'aria-label': label,
      'aria-busy': () => String(busy()),
      disabled: busy,
      onClick: () => {
        if (!busy()) next.get()?.run()
      },
    },
    dynamicChild(glyph, name => (name === 'busy' ? kit.spinner(14) : name ? kit.icon(name, 14) : null)),
    span({ class: 'hidden md:inline' }, label),
    show(busy, () => span({ class: 'hidden md:inline' }, kit.elapsed(() => run()?.started))),
  )
}

export const nextButton = (parts: ControlParts) =>
  show(
    () => Boolean(parts.next.get()),
    () => nextView(parts),
  )

export const menuButton = (parts: ControlParts) =>
  show(
    () => Boolean(repoOf(parts.model.status.get())),
    () =>
      parts.kit.dropdown({
        placement: 'below-right',
        class: 'shrink-0',
        items: close => actionMenu(parts, close),
        trigger: (press, open) => parts.kit.iconButton({ ...press, active: open, title: menuLabel, 'aria-label': menuLabel }, parts.kit.icon('more', 16)),
      }),
  )
