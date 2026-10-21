import type { NavAction } from '@sand/nav/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, disposeAll, dynamicChild, span, stopThen, type ClassValue, type Sig } from '@vaakx-dev/vrui'

export interface StripParts {
  menu: Sig<NavAction[]>
  menuKey: Sig<string>
  choosing: Sig<string | undefined>
  expand(action: NavAction, event: MouseEvent): void
  ask(action: NavAction, event: MouseEvent): void
}

const quickOf = (parts: StripParts) => parts.menu.get().filter(action => action.quick)

const quickButton = ({ icon, iconButton }: Kit, action: NavAction, parts: StripParts) =>
  iconButton(
    {
      size: 'sm',
      title: action.label,
      'aria-label': action.label,
      onClick: stopThen((event: MouseEvent) => {
        if (action.choices) parts.expand(action, event)
        else void action.run()
      }),
    },
    icon(action.icon ?? 'right', 14),
  )

const chips = (kit: Kit, action: NavAction, parts: StripParts) => {
  const done = () => parts.choosing.set(undefined)
  return span(
    {
      class: 'flex items-center',
      onMount: node => {
        const stops = [kit.dismissible(node, done, { overlay: false }), kit.onPressOutside(node, done)]
        return () => disposeAll(stops)
      },
    },
    kit.choiceChips(
      action,
      {
        pick(choice) {
          done()
          void choice.run()
        },
        ask(event) {
          parts.ask(action, event)
          done()
        },
      },
      'sm',
    ),
  )
}

export const actionStrip = (kit: Kit, parts: StripParts, reveal: ClassValue) => {
  const chosen = () => quickOf(parts).find(action => action.id === parts.choosing.get() && action.choices)
  return span(
    { class: () => (chosen() ? 'flex items-center' : ['hidden items-center gap-1', reveal]) },
    dynamicChild(
      derive(() => `${parts.menuKey.get()}#${chosen()?.id ?? ''}`),
      () => {
        const action = chosen()
        return action ? chips(kit, action, parts) : span({ class: 'flex items-center gap-1' }, ...quickOf(parts).map(quick => quickButton(kit, quick, parts)))
      },
    ),
  )
}
