import type { NavAction, NavItem } from '@sand/dom'
import { div, dot, dynamicChild, initials, intent, navActionIcon, navSlot, navTip, plainButton, projectColor, span, stateMark, type NavEntry, type Reorder, type Sig } from '@sand/dom'

const shape = (narrow: Sig<boolean>, selected: () => boolean) => () => [
  'relative flex shrink-0 items-center gap-3 rounded-lg transition-colors',
  narrow.get() ? 'h-10 w-full justify-start px-2' : 'h-8 w-8 justify-center',
  selected() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
]

const label = (narrow: Sig<boolean>, strong: () => boolean, text: () => string) =>
  span({ class: () => (narrow.get() ? ['min-w-0 flex-1 truncate text-left text-sm', strong() ? 'font-semibold text-neutral-100' : ''] : 'hidden') }, text)

const corner = { transform: 'translate(50%, -50%)' }

const markOf = (item: NavItem) => {
  if (item.state === 'draft') return stateMark('draft')
  if (item.state === 'running') return dot('accent')
  if (item.state === 'background') return stateMark('agent')
  if (item.state === 'waiting') return dot('warning')
  if (item.unread) return stateMark('unread')
  return null
}

const badge = (item: NavItem) => {
  const mark = markOf(item)
  if (!mark) return null
  return span({ class: 'absolute top-0 right-0 flex rounded-full bg-neutral-950 ring-2 ring-neutral-950', style: corner }, mark)
}

const avatar = (item: NavItem) =>
  span(
    { class: 'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white', style: { background: projectColor(item.project ?? item.title) } },
    initials(item.title),
  )

export const actionButton = (action: Sig<NavAction>, narrow: Sig<boolean>, run: (action: NavAction) => void, busy: (id: string) => boolean) =>
  plainButton(
    {
      class: shape(narrow, () => false),
      title: action.map(value => value.label),
      onClick: () => run(action.get()),
    },
    navActionIcon(action, busy),
    label(narrow, () => false, () => action.get().label),
  )

export const itemButton = (entry: Sig<NavEntry>, narrow: Sig<boolean>, drag: Reorder) => {
  const item = entry.map(value => value.item)
  const selected = () => entry.get().selected
  return plainButton(
    { class: shape(narrow, selected), title: item.map(navTip), onClick: () => entry.get().pick(), ...intent(() => entry.get().list.prefetch?.(entry.get().item.id)), ...drag(() => navSlot(entry.get())) },
    span(
      { class: 'relative flex shrink-0' },
      dynamicChild(
        item.map(value => `${value.project ?? value.title}|${value.title}`),
        () => avatar(item.get()),
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
