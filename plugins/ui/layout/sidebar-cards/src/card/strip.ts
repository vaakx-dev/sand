import type { NavAction } from '@sand/dom'
import { choiceChips, derive, dismissible, disposeAll, dynamicChild, icon, iconButton, onPressOutside, span, stopThen, type Sig } from '@sand/dom'

export interface StripParts {
  menu: Sig<NavAction[]>
  menuKey: Sig<string>
  choosing: Sig<string | undefined>
  expand(action: NavAction, event: MouseEvent, inline: boolean): void
  ask(action: NavAction, event: MouseEvent): void
}

const quickOf = (parts: StripParts) => parts.menu.get().filter(action => action.quick)

const quickButton = (action: NavAction, parts: StripParts, inline: boolean) =>
  iconButton(
    {
      size: 'sm',
      title: action.label,
      'aria-label': action.label,
      onClick: stopThen((event: MouseEvent) => {
        if (action.choices) parts.expand(action, event, inline)
        else void action.run()
      }),
    },
    icon(action.icon ?? 'right', 13),
  )

const chips = (action: NavAction, parts: StripParts) => {
  const done = () => parts.choosing.set(undefined)
  return span(
    {
      class: 'flex items-center',
      onMount: node => {
        const stops = [dismissible(node, done, { overlay: false }), onPressOutside(node, done)]
        return () => disposeAll(stops)
      },
    },
    choiceChips(action, {
      pick(choice) {
        done()
        void choice.run()
      },
      ask(event) {
        parts.ask(action, event)
        done()
      },
    }, 'sm'),
  )
}

export const actionStrip = (parts: StripParts, reveal: string, inline: boolean) => {
  const chosen = () => (inline ? quickOf(parts).find(action => action.id === parts.choosing.get() && action.choices) : undefined)
  return span(
    { class: () => (chosen() ? 'flex items-center' : ['hidden items-center gap-1', reveal]) },
    dynamicChild(
      derive(() => `${parts.menuKey.get()}#${chosen()?.id ?? ''}`),
      () => {
        const action = chosen()
        return action ? chips(action, parts) : span({ class: 'flex items-center gap-1' }, ...quickOf(parts).map(quick => quickButton(quick, parts, inline)))
      },
    ),
  )
}
