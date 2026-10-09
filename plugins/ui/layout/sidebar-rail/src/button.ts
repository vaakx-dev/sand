import type { NavAction, NavItem } from '@sand/protocol'
import { button, div, dynamicChild, focusable, icon, initials, intent, navActionIcon, navSlot, navTip, projectColor, span, type NavEntry, type Reorder, type Sig } from '@sand/dom'

const shape = (narrow: Sig<boolean>, selected: () => boolean) => () => [
  focusable,
  'relative flex h-10 shrink-0 items-center gap-3 rounded-lg transition-colors',
  narrow.get() ? 'w-full justify-start px-2' : 'w-10 justify-center',
  selected() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
]

const label = (narrow: Sig<boolean>, strong: () => boolean, text: () => string) =>
  span({ class: () => (narrow.get() ? ['min-w-0 flex-1 truncate text-left text-sm', strong() ? 'font-semibold text-neutral-100' : ''] : 'hidden') }, text)

const corner = { top: 0, right: 0, transform: 'translate(50%, -50%)' }

const badge = (item: NavItem) => {
  if (item.state === 'draft')
    return span({ class: 'absolute flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white ring-2 ring-neutral-950', style: corner }, icon('pencil', 8))
  const tone = item.state === 'running' ? 'bg-accent-400' : item.state === 'background' ? 'bg-sky-400' : item.state === 'waiting' ? 'bg-warning-400' : item.unread ? 'bg-orange-400' : ''
  return tone ? span({ class: ['absolute h-2 w-2 rounded-full ring-2 ring-neutral-950', tone], style: corner }) : span({ class: 'hidden' })
}

export const actionButton = (action: Sig<NavAction>, narrow: Sig<boolean>, run: (action: NavAction) => void, busy: (id: string) => boolean) =>
  button(
    {
      type: 'button',
      class: shape(narrow, () => false),
      title: action.map(value => value.label),
      onClick: () => run(action.get()),
    },
    navActionIcon(action, busy, 17),
    label(narrow, () => false, () => action.get().label),
  )

export const itemButton = (entry: Sig<NavEntry>, narrow: Sig<boolean>, drag: Reorder) => {
  const item = entry.map(value => value.item)
  const selected = () => entry.get().selected
  return button(
    { type: 'button', class: shape(narrow, selected), title: item.map(navTip), onClick: () => entry.get().pick(), ...intent(() => entry.get().list.prefetch?.(entry.get().item.id)), ...drag(() => navSlot(entry.get())) },
    span(
      { class: 'relative flex shrink-0' },
      dynamicChild(
        item.map(value => `${value.project ?? value.title}|${value.title}`),
        () =>
          span(
            { class: 'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white', style: { background: projectColor(item.get().project ?? item.get().title) } },
            initials(item.get().title),
          ),
      ),
      dynamicChild(
        item.map(value => `${value.state}|${value.unread}`),
        () => badge(item.get()),
      ),
    ),
    label(narrow, () => selected() || Boolean(item.get().unread), () => item.get().title),
  )
}

export const separator = (narrow: Sig<boolean>) => div({ class: () => ['my-2 h-px shrink-0 bg-neutral-700', narrow.get() ? 'mx-2' : 'w-6'] })
